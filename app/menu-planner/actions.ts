// app/menu-planner/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server'; 
import { TurnType, MealType } from '@/types/menu-planner'; 

// --- 1. Tipos Compartidos ---
export interface Suggestion {
  id: string;             
  value: string;          
  type: 'recipe' | 'free_text'; 
}

interface ActionResponse {
    success: boolean;
    error?: string;
    scheduleItemId?: string;
}

// --- 2. Server Action de Guardado (Insert/Update/Delete con cálculo de Order) ---

/**
 * Crea o actualiza un plato específico en la planificación semanal.
 */
export async function upsertScheduleItem(
    formData: FormData,
): Promise<ActionResponse> {
    const supabase = await createClient(); 
    
    // 1. Extracción y conversión de FormData
    const scheduleDate = formData.get('scheduleDate') as string;
    const turnType = formData.get('turnType') as TurnType;
    const mealType = formData.get('mealType') as MealType;
    
    const itemId = formData.get('itemId') as string; 
    
    // orderInMeal solo se usa para el UPDATE. Para INSERT, lo calcularemos.
    const orderInMealRaw = formData.get('orderInMeal') as string;
    let orderInMeal = parseInt(orderInMealRaw, 10); // Será 'new' o el valor real si es UPDATE
    
    // Contenido del plato
    const recipeId = (formData.get('recipeId') as string) || null;
    const unresolvedText = (formData.get('unresolvedText') as string) || null; 
    const isOut = formData.get('isOut') === 'true'; 
    
    if (!scheduleDate || !turnType || !mealType) {
        return { success: false, error: 'Faltan datos obligatorios para planificar el plato.' };
    }

    try {
        // --- A. GESTIÓN DEL DÍA (MENU_SCHEDULE) ---
        let { data: scheduleData } = await supabase
            .from('menu_schedule')
            .select('id')
            .eq('schedule_date', scheduleDate)
            .single();
        
        let scheduleId = scheduleData?.id;

        if (!scheduleId) {
            const { data: newScheduleData, error: newScheduleError } = await supabase
                .from('menu_schedule')
                .insert({ schedule_date: scheduleDate })
                .select('id')
                .single();
                
            if (newScheduleError) throw newScheduleError;
            scheduleId = newScheduleData.id;
        }

        // --- B. GESTIÓN DEL PLATO (ITEM) ---
        
        let finalRecipeId = recipeId;
        
        // 1. PROCESAR TEXTO ESCRITO SIN RESOLVER (Creación de Placeholder)
        if (!isOut && !finalRecipeId && unresolvedText && unresolvedText.trim() !== '') {
            const normalizedText = unresolvedText.trim();
            
            // Buscar si ya existe una receta con este nombre
            let { data: existingRecipe } = await supabase
                .from('menu_recipes')
                .select('id')
                .eq('name', normalizedText)
                .maybeSingle();

            if (existingRecipe) {
                finalRecipeId = existingRecipe.id;
            } else {
                // CREAR RECETA DE PLACEHOLDER
                const { data: newRecipe, error: insertError } = await supabase
                    .from('menu_recipes')
                    .insert({ 
                        name: normalizedText, 
                    })
                    .select('id')
                    .single();

                if (insertError) throw insertError;
                finalRecipeId = newRecipe!.id;
            }
        }


        // 2. Determinar si el contenido está vacío (limpiar/borrar)
        const hasContent = isOut || (finalRecipeId !== null);
        
        
        if (!hasContent && itemId && itemId !== 'new') {
            // 🗑️ ELIMINACIÓN
            const { error: deleteError } = await supabase
                .from('menu_schedule_items')
                .delete()
                .eq('id', itemId);

            if (deleteError) throw deleteError;
            
        } else if (hasContent) {
            
            // 🚨 3. CALCULAR order_in_meal SI ES UN NUEVO INSERT
            if (itemId === 'new') { 
                const { count, error: countError } = await supabase
                    .from('menu_schedule_items')
                    .select('*', { count: 'exact' })
                    .eq('schedule_id', scheduleId) 
                    .eq('meal_type', mealType)
                    .eq('turn_type', turnType);

                if (countError) throw countError;
                orderInMeal = (count || 0) + 1;
            }
            
            // ✏️ INSERT/UPDATE
            const itemData = {
                schedule_id: scheduleId,
                turn_type: turnType,
                meal_type: mealType,
                order_in_meal: orderInMeal, // 🚨 Usamos el valor calculado o el valor original
                recipe_id: finalRecipeId, 
                free_text: null, 
                is_out: isOut,
            };

            let itemUpsertData;
            let itemUpsertError: any;


            if (itemId && itemId !== 'new') {
                // UPDATE
                ({ data: itemUpsertData, error: itemUpsertError } = await supabase
                    .from('menu_schedule_items')
                    .update(itemData)
                    .eq('id', itemId)
                    .select('id')
                    .single());

            } else {
                // INSERT
                ({ data: itemUpsertData, error: itemUpsertError } = await supabase
                    .from('menu_schedule_items')
                    .insert(itemData)
                    .select('id')
                    .single());
            }
            
            if (itemUpsertError) throw itemUpsertError;
            
            if (!itemUpsertData) {
                return { success: false, error: 'Error: No se pudo verificar el plato guardado.' };
            }
            revalidatePath('/menu-planner');
            return { 
                success: true, 
                scheduleItemId: itemUpsertData.id 
            };
        }
        
        revalidatePath('/menu-planner');
        return { success: true };

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido al procesar la acción.';
        console.error('Unexpected error in upsertScheduleItem:', err);
        return { success: false, error: errorMessage };
    }
}


// --- 3. Server Action de Búsqueda (Search) ---
export async function searchSuggestions(query: string): Promise<Suggestion[]> {
    const supabase = await createClient();
    const normalizedQuery = `%${query.toLowerCase()}%`;
    
    // Búsqueda de Recetas (Recipes)
    const { data: recipesData } = await supabase
      .from('menu_recipes')
      .select('id, name')
      .ilike('name', normalizedQuery) 
      .limit(5);

    const recipeSuggestions: Suggestion[] = (recipesData || []).map((r: any) => ({
      id: r.id,
      value: r.name,
      type: 'recipe',
    }));

    return recipeSuggestions.sort((a, b) => a.value.localeCompare(b.value));
}