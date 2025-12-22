// app/recipes/actions.ts (ACTUALIZACIÓN CRÍTICA para INSERT/UPDATE)
'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { MenuRecipeIngredient } from '@/types/recipes'; 
import { redirect } from 'next/navigation';

interface RecipeActionResponse {
    success: boolean;
    error?: string;
    recipeId?: string;
}

/**
 * Guarda o actualiza una receta y gestiona sus ingredientes asociados.
 */
export async function saveRecipe(formData: FormData): Promise<RecipeActionResponse> {
    const supabase = await createClient();
    const user = await supabase.auth.getUser();
    
    if (user.error || !user.data.user) {
        return { success: false, error: 'Usuario no autenticado.' };
    }
    const user_id = user.data.user.id;

    // --- 1. Determinar el Modo y Obtener Datos ---
    const recipeId = formData.get('id') as string | null; // El ID solo existe en modo Edición
    const isUpdating = !!recipeId;
    
    const name = formData.get('name') as string;
    const ingredientsJson = formData.get('ingredients_json') as string;
    
    if (!name || name.trim() === '') {
        return { success: false, error: 'El nombre de la receta es obligatorio.' };
    }

    let ingredients: MenuRecipeIngredient[] = [];
    try {
        // Filtramos y parseamos los ingredientes del formulario
        ingredients = JSON.parse(ingredientsJson) as MenuRecipeIngredient[];
    } catch (e) {
        console.warn('Advertencia: No se encontraron ingredientes válidos.');
    }
    
    // --- 2. Preparar el Objeto de la Receta ---
    const recipeData = { 
        name: name.trim(), 
        description: formData.get('description'),
        prep_time_min: formData.get('prep_time_min') ? parseInt(formData.get('prep_time_min') as string) : null,
        cook_time_min: formData.get('cook_time_min') ? parseInt(formData.get('cook_time_min') as string) : null,
        servings: formData.get('servings') ? parseInt(formData.get('servings') as string) : 1,
        image_url: formData.get('image_url'),
        source_url: formData.get('source_url'),
        category_id: formData.get('category_id') as string || null,
        labels: (formData.get('labels') as string)?.split(',').map(l => l.trim()).filter(l => l) || null,
        user_id: user_id, // Necesario para INSERT y útil para UPDATE (seguridad)
    };
    
    try {
        let currentRecipeId: string;

        // --- A. INSERTAR O ACTUALIZAR RECETA PRINCIPAL ---
        if (isUpdating) {
            // 1. UPDATE: Usamos .update() si tenemos un ID
            const { error: updateError } = await supabase
                .from('menu_recipes')
                .update(recipeData) // Actualiza el registro con los nuevos datos
                .eq('id', recipeId!);
            
            if (updateError) throw updateError;
            currentRecipeId = recipeId!;

        } else {
            // 2. INSERT: Si no hay ID, creamos uno nuevo
            const { data: newRecipe, error: insertError } = await supabase
                .from('menu_recipes')
                .insert(recipeData)
                .select('id')
                .single();

            if (insertError) throw insertError;
            currentRecipeId = newRecipe.id;
        }

        // --- B. GESTIONAR INGREDIENTES (CRÍTICO) ---
        // En edición, necesitamos eliminar los viejos y añadir los nuevos
        if (isUpdating) {
            // 1. Eliminamos todos los ingredientes viejos asociados a la receta ID
            const { error: deleteError } = await supabase
                .from('menu_recipe_ingredients')
                .delete()
                .eq('recipe_id', currentRecipeId);
            
            if (deleteError) throw deleteError;
        }
        
        // 2. Insertamos todos los ingredientes válidos (ya sean nuevos o actualizados)
        if (ingredients.length > 0) {
            const ingredientsToInsert = ingredients.map(ing => ({
                recipe_id: currentRecipeId,
                name: ing.name,
                quantity: ing.quantity,
                unit: ing.unit,
                notes: ing.notes,
            }));

            const { error: ingredientsError } = await supabase
                .from('menu_recipe_ingredients')
                .insert(ingredientsToInsert);

            if (ingredientsError) throw ingredientsError;
        }

        revalidatePath('/recipes');
        revalidatePath(`/recipes/edit/${currentRecipeId}`);
        
        return { 
            success: true, 
            recipeId: currentRecipeId
        };

    } catch (err) {
        // En un proyecto real, se debería implementar un rollback aquí si la DB lo permite
        console.error(`Error ${isUpdating ? 'actualizando' : 'creando'} receta:`, err);
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido al guardar la receta.';
        return { success: false, error: errorMessage };
    }
}
export async function deleteRecipe(formData: FormData): Promise<void> {
    const supabase = await createClient();
    
    const recipeId = formData.get('id') as string;
    // 🚨 NUEVO: Obtenemos el slug de la categoría del formulario
    const categorySlug = formData.get('categorySlug') as string; 

    if (!recipeId) return;

    try {
        // 1. Eliminar primero los registros en la tabla hija (ingredientes)
        // Nota: Si tienes configurado ON DELETE CASCADE en la BD, esta consulta es opcional.
        const { error: ingredientsError } = await supabase
            .from('menu_recipe_ingredients')
            .delete()
            .eq('recipe_id', recipeId);
        
        if (ingredientsError) {
            console.error("Error deleting related ingredients:", ingredientsError.message);
        }

        // 2. Eliminar el registro principal
        const { error: recipeError } = await supabase
            .from('menu_recipes')
            .delete()
            .eq('id', recipeId);

        if (recipeError) throw recipeError;
        
        // --- Redirección y Revalidación ---
        
        // 🚨 3. Revalidamos la ruta de la lista filtrada
        // Esto asegura que la lista de recetas (ej: /recipes/salads) se actualice.
        const redirectPath = categorySlug ? `/recipes/${categorySlug}` : '/recipes';

        revalidatePath(redirectPath); 
        
        // 🚨 4. Redirigimos a la lista filtrada
        redirect(redirectPath); 

    } catch (err) {
        console.error("Error deleting recipe:", err);
        // Si el borrado falla por completo, redirigimos al Hub principal
        redirect('/recipes'); 
    }
}

// Tipado explícito para la acción
interface UpsertCategoryData {
    id?: string;
    name: string;
    color: string;
    icon_name: string; // 👈 Añadido para resolver el error 2353
}

export async function upsertCategoryAction(data: { id?: string, name: string, color: string, icon?: string }) {
    const supabase = await createClient();
    
    // Obtenemos el usuario para el user_id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "No autorizado" };

    const payload = {
        name: data.name,
        color: data.color,
        slug: data.name.toLowerCase().replace(/\s+/g, '-'),
        user_id: user.id,
        icon: data.icon || 'Utensils'
    };

    const { error } = data.id 
        ? await supabase.from('menu_recipe_categories').update(payload).eq('id', data.id)
        : await supabase.from('menu_recipe_categories').insert(payload);

    if (error) return { success: false, error: error.message };

    revalidatePath('/recipes');
    return { success: true };
}

export async function deleteCategoryAction(id: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from('menu_recipe_categories')
        .delete()
        .eq('id', id);

    if (error) return { success: false, error: error.message };

    revalidatePath('/recipes');
    return { success: true };
}