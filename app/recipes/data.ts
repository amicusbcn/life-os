// app/recipes/data.ts
import { createClient } from '@/utils/supabase/server';
import { 
    MenuRecipeCategory, 
    MenuRecipeWithDetails, 
    MenuRecipeCategoryWithCount, 
    MenuRecipeIngredient, 
    MenuRecipeFullData 
} from '@/types/recipes';

/**
 * 📡 RECIPES DATA LAYER
 * Funciones de acceso a datos (Queries) para el módulo de Recetas.
 * Todas las funciones son asíncronas y deben usarse en Server Components o Server Actions.
 */

/**
 * Obtiene todas las categorías con el conteo de recetas.
 * Incluye lógica para crear categorías virtuales: "Todas" (all) y "Sin Categoría" (none).
 * @returns Array de categorías extendidas con el campo `recipeCount`.
 */
export async function getCategoriesWithCount(): Promise<MenuRecipeCategoryWithCount[]> {
    const supabase = await createClient();

    // 1. Obtener conteo total real
    const { count: totalRealCount, error: countError } = await supabase
        .from('menu_recipes')
        .select('*', { count: 'exact', head: true });

    // 2. Obtener conteo por categoría (RPC)
    const { data: categoriesFromRPC, error: rpcError } = await supabase.rpc('get_categories_with_recipe_count'); 

    if (rpcError || countError) {
        console.error('Error [getCategoriesWithCount]:', rpcError || countError);
        return []; 
    }
    
    const categoriesFromDB = (categoriesFromRPC as MenuRecipeCategoryWithCount[]) || [];
    const now = new Date().toISOString();

    // 3. Categoría Virtual: "Todas"
    // CORRECCIÓN: Añadimos user_id y created_at ficticios para satisfacer la interfaz estricta
    const allCategory: MenuRecipeCategoryWithCount = {
        id: 'all', 
        name: 'Todas las Recetas',
        color: '#6366f1', 
        icon: 'utensils',
        slug: 'all', 
        recipeCount: totalRealCount || 0,
        user_id: 'system',
        created_at: now
    };

    // 4. Calcular "Sin Categoría" (Huérfanas)
    const categorizedSum = categoriesFromDB.reduce((sum, cat) => sum + Number(cat.recipeCount), 0);
    const orphanCount = (totalRealCount || 0) - categorizedSum;

    const finalResult = [allCategory, ...categoriesFromDB];

    if (orphanCount > 0) {
        finalResult.push({
            id: 'none',
            name: 'Sin Categoría',
            color: '#f59e0b',
            icon: 'alert-circle',
            slug: 'none',
            recipeCount: orphanCount,
            user_id: 'system',
            created_at: now
        });
    }

    return finalResult;
}

/**
 * Obtiene la lista simple de categorías (para menús desplegables y formularios).
 */
export async function getAllCategories(): Promise<MenuRecipeCategory[]> {
    const supabase = await createClient();
    try {
        const { data, error } = await supabase
            .from('menu_recipe_categories')
            .select('*')
            .order('name', { ascending: true });
        
        if (error) throw error;
        return data as MenuRecipeCategory[];
    } catch (e) {
        console.error("Error [getAllCategories]:", e);
        return [];
    }
}

/**
 * Obtiene los ingredientes de una receta específica.
 */
export async function getRecipeIngredients(recipeId: string): Promise<MenuRecipeIngredient[] | null> {
    if (!recipeId) return null;
    const supabase = await createClient();
    
    try {
        const { data, error } = await supabase
            .from('menu_recipe_ingredients')
            .select('*')
            .eq('recipe_id', recipeId)
            .order('id', { ascending: true });

        if (error) throw error;
        return data as MenuRecipeIngredient[];
    } catch (e) {
        console.error("Error [getRecipeIngredients]:", e);
        return null;
    }
}

/**
 * Obtiene recetas filtradas por ID de categoría.
 * Devuelve campos específicos optimizados para listados (sin ingredientes ni instrucciones largas).
 */
export async function getRecipesByCategoryId(categoryId: string | null): Promise<MenuRecipeWithDetails[]> {
    const supabase = await createClient();
    
    let query = supabase
        .from('menu_recipes')
        .select(`
            id, name, description, prep_time_min, cook_time_min, 
            servings, image_url, source_url, labels,
            category_id ( id, name, color, icon, slug )
        `)
        .order('name', { ascending: true });
        
    if (categoryId && categoryId !== 'all') {
        if (categoryId === 'none') {
            query = query.is('category_id', null);
        } else {
            query = query.eq('category_id', categoryId);
        }
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error [getRecipesByCategoryId]:', error);
        return [];
    }

    return data as unknown as MenuRecipeWithDetails[]; 
}

/**
 * Obtiene una receta completa por ID para la vista de detalle.
 */
export async function getRecipeById(recipeId: string): Promise<MenuRecipeFullData | null> {
    if (!recipeId || recipeId === 'undefined') return null;

    const supabase = await createClient();

    // 1. Receta base y categoría
    const { data: recipeData, error: recipeError } = await supabase
        .from('menu_recipes')
        .select(`*, category_id ( id, name, color, icon, slug )`)
        .eq('id', recipeId)
        .single();

    if (recipeError || !recipeData) {
        if (recipeError) console.error("Error [getRecipeById]:", recipeError.message);
        return null;
    }

    // 2. Ingredientes
    const ingredients = await getRecipeIngredients(recipeId);

    // 3. Construcción del objeto completo
    return {
        ...recipeData,
        labels: recipeData.labels || [], 
        ingredients: ingredients || [],
    } as MenuRecipeFullData;
}