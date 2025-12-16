// app/recipes/data.ts
import { createClient } from '@/utils/supabase/server';
import { MenuRecipeWithDetails, MenuRecipeCategory, MenuRecipeIngredient,MenuRecipeFullData } from '@/types/recipes'; // Importar el nuevo tipo

// Esta función obtiene la lista completa de categorías (ya existía)
export async function fetchAllCategories(): Promise<MenuRecipeCategory[]> {
    const supabase = await createClient();
    try {
        const { data, error } = await supabase
            .from('menu_recipe_categories')
            .select('*')
            .order('name', { ascending: true });
        
        if (error) throw error;
        return data as MenuRecipeCategory[];
    } catch (e) {
        console.error("Error fetching categories:", e);
        return [];
    }
}

// NUEVA FUNCIÓN: Obtiene solo los ingredientes de una receta
export async function fetchRecipeIngredients(recipeId: string): Promise<MenuRecipeIngredient[] | null> {
    if (!recipeId) return null;
    const supabase = await createClient();
    
    try {
        const { data, error } = await supabase
            .from('menu_recipe_ingredients')
            .select(`*`)
            .eq('recipe_id', recipeId)
            .order('id', { ascending: true });

        if (error) throw error;
        return data as MenuRecipeIngredient[];
    } catch (e) {
        console.error("Error fetching ingredients:", e);
        return null;
    }
}
/**
 * Obtiene las recetas filtradas por el ID de la categoría.
 * Si categoryId es null, devuelve todas las recetas.
 */
export async function fetchRecipeListByCategoryId(categoryId: string | null): Promise<MenuRecipeWithDetails[]> {
    const supabase = await createClient();
    
    let query = supabase
        .from('menu_recipes')
        .select(`
            id, 
            name, 
            description,
            prep_time_min,
            cook_time_min,
            servings,
            image_url,
            source_url,
            labels,                   
            category_id ( id, name, color, icon )
        `)
        .order('name', { ascending: true });
        
    // 🚨 Aplicar el filtro si se proporciona un categoryId válido
    if (categoryId && categoryId !== 'all') {
        query = query.eq('category_id', categoryId);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching filtered recipes:', error);
        return [];
    }
    const cleanedData = (data as any[]).map(recipe => ({
        ...recipe,
        // Si category_id es un array, tomamos el primer elemento (el objeto categoría). 
        // Si no existe o es nulo, lo dejamos como null.
        category_id: Array.isArray(recipe.category_id) && recipe.category_id.length > 0 
            ? recipe.category_id[0] 
            : null,
    }));
    
    return cleanedData as MenuRecipeWithDetails[]; 
}
// NOTA: La función getRecipeById ya no es necesaria con el patrón Promise.all,
// ya que la consulta principal del item se hace directamente en page.tsx

/**
 * Obtiene todas las recetas principales con su información de categoría,
 * utilizando la nueva relación Uno a Muchos (category_id directamente en menu_recipes).
 */
export async function fetchAllRecipesWithDetails(): Promise<MenuRecipeWithDetails[]> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
        .from('menu_recipes')
        .select(`
            id, 
            name, 
            description,
            prep_time_min,
            cook_time_min,
            servings,
            image_url,
            source_url,
            labels,                   
            category_id ( id, name, color, icon )
        `)
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching recipes:', error);
        return [];
    }
    const cleanedData = (data as any[]).map(recipe => ({
        ...recipe,
        // Si category_id es un array, tomamos el primer elemento (el objeto categoría). 
        // Si no existe o es nulo, lo dejamos como null.
        category_id: Array.isArray(recipe.category_id) && recipe.category_id.length > 0 
            ? recipe.category_id[0] 
            : null,
    }));
    
    return cleanedData as MenuRecipeWithDetails[]; 
}

// Esta es la estructura que debe devolver tu fetch
export async function getRecipeById(recipeId: string): Promise<MenuRecipeFullData | null> {
    
    if (!recipeId || recipeId === 'undefined') {
        console.warn('getRecipeById llamado sin un ID válido.');
        return null;
    }

    const supabase = await createClient();

    // 1. Fetch de la receta principal
    const { data: recipeData, error: recipeError } = await supabase
        .from('menu_recipes')
        .select(`*`)
        .eq('id', recipeId)
        .single();

    // 🚨 AÑADIR LOGS EXPLICITOS DE ERRORES DE SUPABASE
    if (recipeError) {
        console.error("SUPABASE ERROR (Recipe):", recipeError.message);
        return null;
    }
    if (!recipeData) {
         // Esto puede ocurrir si el ID no existe
         return null;
    }

    // 2. Fetch de los ingredientes asociados
    const { data: ingredientsData, error: ingredientsError } = await supabase
        .from('menu_recipe_ingredients')
        .select(`*`)
        .eq('recipe_id', recipeId)
        .order('id', { ascending: true });

    if (ingredientsError) {
        console.error("SUPABASE ERROR (Ingredients):", ingredientsError.message);
        return null;
    }

    // 3. Combinar y devolver los datos en el tipo MenuRecipeFullData
    const fullRecipe: MenuRecipeFullData = {
        ...recipeData,
        // Convertimos el array de strings 'labels' de Supabase (si usas JSONB o text[])
        // a un string para el formulario, si es necesario, o lo mantenemos si ya es string[].
        labels: recipeData.labels || [], 
        ingredients: ingredientsData as MenuRecipeIngredient[],
    };

    return fullRecipe;
}

