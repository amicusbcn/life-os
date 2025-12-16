// /types/recipes.ts (Versión con MenuRecipeSimple para compatibilidad)

// ====================================================================
// TIPOS PARA LA TABLA menu_recipe_categories
// ====================================================================
export interface MenuRecipeCategory {
    id: string;
    created_at: string;
    user_id: string | null;
    name: string;
    slug: string;
    icon: string | null;
    color: string | null;
}


// ====================================================================
// TIPOS PARA LA TABLA menu_recipe_ingredients
// ====================================================================
export interface MenuRecipeIngredient {
    id: string;
    recipe_id: string;
    name: string;
    quantity: number; 
    unit: string;
    notes: string | null;
}


// ====================================================================
// TIPOS PARA LA TABLA menu_recipes (Entidad Principal)
// ====================================================================
export interface MenuRecipe {
    id: string;
    created_at: string;
    updated_at: string;
    user_id: string | null;
    name: string;
    description: string | null;
    prep_time_min: number | null;
    cook_time_min: number | null;
    servings: number | null;
    image_url: string | null;
    source_url: string | null;
    category_id: string | null;
    labels: string[] | null;
}

/**
 * Tipo que representa una Receta con los JOINS expandidos para la UI.
 */
export interface MenuRecipeWithDetails {
    id: string;
    name: string;
    description: string | null;
    prep_time_min: number | null;
    cook_time_min: number | null;
    servings: number | null;
    image_url: string | null;
    source_url: string | null;
    labels: string[] | null; 
    
    slug:string[]|null;
    // El JOIN de Supabase para la categoría (Relación 1:N)
    category_id: {
        id: string;
        name: string;
        color: string | null;
        icon: string | null;
    } | null;

    ingredients?: MenuRecipeIngredient[]; 
}

export interface MenuRecipeFullData extends MenuRecipe {
    ingredients: MenuRecipeIngredient[];
}
// ====================================================================
// TIPO PARA COMPATIBILIDAD CON EL MÓDULO DE MENÚS (MenuPlanner)
// ====================================================================

/**
 * Alias para compatibilidad con el módulo de menús. 
 * Contiene la información expandida (JOINED) de la receta.
 */
export type MenuRecipeSimple = MenuRecipeWithDetails;

