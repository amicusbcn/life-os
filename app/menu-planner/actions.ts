// app/menu-planner/actions.ts
'use server';

import { createClient } from '@/utils/supabase/client'; // Asumimos esta ruta
import { TurnType, MealType, Suggestion } from '@/types/menu-planner';

const supabase = createClient();

interface UpsertScheduleItemProps {
  scheduleDate: string; // YYYY-MM-DD
  turnType: TurnType;
  mealType: MealType;
  orderInMeal: number; // 1, 2, 3...

  // Contenido del plato
  recipeId?: string; // Opcional: UUID de la receta
  freeText?: string; // Opcional: Texto libre
  isOut?: boolean; // Opcional: Está fuera (true)
}

interface ActionResponse {
  success: boolean;
  error?: string;
  scheduleItemId?: string;
}

/**
 * Crea o actualiza un plato específico en la planificación semanal.
 */
export async function upsertScheduleItem(
  formData: FormData,
): Promise<ActionResponse> {
  const scheduleDate = formData.get('scheduleDate') as string;
  const turnType = formData.get('turnType') as TurnType;
  const mealType = formData.get('mealType') as MealType;
  const orderInMeal = parseInt(formData.get('orderInMeal') as string, 10);
  
  const recipeId = (formData.get('recipeId') as string) || null;
  const freeText = (formData.get('freeText') as string) || null;
  const isOut = formData.get('isOut') === 'true'; // Convertir a booleano

  if (!scheduleDate || !turnType || !mealType || isNaN(orderInMeal)) {
    return { success: false, error: 'Faltan datos obligatorios para planificar el plato.' };
  }
  
  try {
    // 1. Verificar/Crear el 'menu_schedule' (el día)
    let { data: scheduleData, error: scheduleError } = await supabase
      .from('menu_schedule')
      .select('id')
      .eq('schedule_date', scheduleDate)
      .single();

    if (scheduleError && scheduleError.code !== 'PGRST116') { // PGRST116 = No Rows Found
      console.error('Error checking schedule existence:', scheduleError);
      return { success: false, error: 'Error al verificar la planificación diaria.' };
    }
    
    let scheduleId = scheduleData?.id;

    if (!scheduleId) {
      // Si no existe, lo creamos
      const { data: newScheduleData, error: newScheduleError } = await supabase
        .from('menu_schedule')
        .insert({ schedule_date: scheduleDate })
        .select('id')
        .single();
        
      if (newScheduleError) {
        console.error('Error creating new schedule:', newScheduleError);
        return { success: false, error: 'Error al crear la entrada diaria de planificación.' };
      }
      scheduleId = newScheduleData.id;
    }

    // 2. Insertar/Actualizar el 'menu_schedule_item' (el plato)
    const itemData = {
      schedule_id: scheduleId,
      turn_type: turnType,
      meal_type: mealType,
      order_in_meal: orderInMeal,
      recipe_id: recipeId,
      free_text: freeText,
      is_out: isOut,
    };
    
    // Usamos 'upsert' basado en la restricción única (schedule_id, meal_type, turn_type, order_in_meal)
    const { data: itemUpsertData, error: itemUpsertError } = await supabase
      .from('menu_schedule_items')
      .upsert(itemData, { 
        onConflict: 'schedule_id, meal_type, turn_type, order_in_meal',
        ignoreDuplicates: false 
      })
      .select('id')
      .single();

    if (itemUpsertError) {
      console.error('Error upserting schedule item:', itemUpsertError);
      return { success: false, error: 'Error al guardar el plato planificado.' };
    }
    
    return { 
      success: true, 
      scheduleItemId: itemUpsertData.id 
    };

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Error desconocido al procesar la acción.';
    console.error('Unexpected error in upsertScheduleItem:', err);
    return { success: false, error: errorMessage };
  }
}




/**
 * Busca sugerencias de comidas por un término de búsqueda.
 * Combina resultados de recetas y textos libres históricos.
 * @param query Término de búsqueda (ej: 'torti').
 * @returns Array de Suggestion.
 */
export async function searchSuggestions(query: string): Promise<Suggestion[]> {
  const supabase = createClient();
  const normalizedQuery = `%${query.toLowerCase()}%`;
  
  // 1. Búsqueda de Recetas (Recipes)
  const { data: recipesData } = await supabase
    .from('menu_recipes')
    .select('id, name')
    .ilike('name', normalizedQuery) 
    .limit(5);

  const recipeSuggestions: Suggestion[] = (recipesData || []).map(r => ({
    id: r.id,
    value: r.name,
    type: 'recipe',
  }));

  // 2. Búsqueda de Textos Libres Históricos (Free Text)
  // Usamos un RPC para obtener los textos libres únicos coincidentes.
  const { data: freeTextData } = await supabase.rpc('get_unique_free_texts', {
    search_query: query,
  });
  
  const freeTextSuggestions: Suggestion[] = (freeTextData || [])
    .filter((text: unknown) => text && typeof text === 'string') // 🚨 TIPADO: 'text' es 'unknown' o 'string'
    .map((text: string) => ({                                   // 🚨 TIPADO: 'text' es 'string'
      id: text, 
      value: text,
      type: 'free_text',
    }));

  // 3. Combinar y Devolver (Eliminar duplicados)
  const combinedSuggestions: Suggestion[] = [...recipeSuggestions];
  
  const recipeNames = new Set(recipeSuggestions.map(s => s.value.toLowerCase()));
  
  for (const ft of freeTextSuggestions) {
    if (!recipeNames.has(ft.value.toLowerCase())) {
      combinedSuggestions.push(ft);
    }
  }

  // Ordenar alfabéticamente
  return combinedSuggestions.sort((a, b) => a.value.localeCompare(b.value));
}