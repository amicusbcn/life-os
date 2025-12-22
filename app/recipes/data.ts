// app/recipes/data.ts
import { createClient } from '@/utils/supabase/server';
import { MenuRecipeCategory, MenuRecipeWithDetails, MenuRecipeCategoryWithCount, MenuRecipeIngredient,MenuRecipeFullData } from '@/types/recipes'; // Importar el nuevo tipo


/**
 * Obtiene todas las categorías y el número de recetas asociadas a cada una,
 * incluyendo el total global y las recetas sin categoría.
 */
export async function fetchAllCategoriesWithCount(): Promise<MenuRecipeCategoryWithCount[]> {
    const supabase = await createClient();

    // 1. Obtenemos el conteo total REAL de la tabla de recetas (incluyendo las que tienen category_id = null)
    const { count: totalRealCount, error: countError } = await supabase
        .from('menu_recipes')
        .select('*', { count: 'exact', head: true });

    // 2. Llamada al RPC para obtener conteos por categoría existente
    const { data: categoriesFromRPC, error: rpcError } = await supabase.rpc('get_categories_with_recipe_count'); 

    if (rpcError || countError) {
        console.error('Error fetching categories with count:', rpcError || countError);
        return []; 
    }
    
    const categoriesFromDB = (categoriesFromRPC as MenuRecipeCategoryWithCount[]) || [];

    // 3. Crear categoría virtual "Todas las Recetas"
    const allCategory = {
        id: 'all', 
        name: 'Todas las Recetas',
        color: '#6366f1', 
        icon: 'utensils',
        slug: 'all', 
        recipeCount: totalRealCount || 0,
    } as MenuRecipeCategoryWithCount; // 👈 Aserción para evitar error 2739

    // 4. Calcular si hay recetas "huérfanas" (sin categoría)
    const categorizedSum = categoriesFromDB.reduce((sum, cat) => sum + Number(cat.recipeCount), 0);
    const orphanCount = (totalRealCount || 0) - categorizedSum;

    const finalResult = [allCategory, ...categoriesFromDB];

    // 5. Si hay recetas sin categoría, añadimos la tarjeta virtual "Sin Categoría"
    if (orphanCount > 0) {
        finalResult.push({
            id: 'none',
            name: 'Sin Categoría',
            color: '#f59e0b',
            icon: 'alert-circle',
            slug: 'none',
            recipeCount: orphanCount,
        } as MenuRecipeCategoryWithCount); // 👈 Aserción para evitar error 2345
    }

    return finalResult;
}

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
            category_id ( id, name, color, icon, slug )
        `) // ✅ Consulta limpia sin comentarios
        .order('name', { ascending: true });
        
    if (categoryId && categoryId !== 'all') {
        query = query.eq('category_id', categoryId);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching filtered recipes:', error);
        return [];
    }

    // ✅ Uso de unknown para conversión segura si el tipado de Supabase es complejo
    return data as unknown as MenuRecipeWithDetails[]; 
}

// NOTA: La función getRecipeById ya no es necesaria con el patrón Promise.all,
// ya que la consulta principal del item se hace directamente en page.tsx

/**
 * Obtiene todas las recetas principales con su información de categoría,
 * utilizando la nueva relación Uno a Muchos (category_id directamente en menu_recipes).
 */
/**
 * Obtiene todas las recetas con detalles.
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
            category_id ( id, name, color, icon, slug )
        `) // ✅ Eliminados comentarios que causaban ParserError
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching recipes:', error);
        return [];
    }

    // ✅ Doble casteo para evitar el error de solapamiento de tipos
    return data as unknown as MenuRecipeWithDetails[]; 
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
        .select(`*,
            category_id (
            id,
            name,
            color,
            icon,
            slug
            )`)
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

