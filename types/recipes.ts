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

export interface MenuRecipeCategoryWithCount extends MenuRecipeCategory {
    recipeCount: number; 
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
        sulg: string | null;
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

export interface Recipe {
  id: string;
  user_id: string;
  created_at?: string;
  name: string;
  ingredients: string;   // HTML/Rich text
  instructions: string;  // HTML/Rich text
  prep_time: number;     // minutos
  servings: number;
  category_id?: string | null;
  photo_path?: string | null;
  source_url?: string | null;
  rating?: number;
  is_favorite?: boolean;
}

export interface RecipeCategory {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  color?: string;
  user_id?: string;
  recipeCount?: number; // Campo calculado a veces en SQL
}

// Tipo útil para el formulario
export type RecipeFormData = Omit<Recipe, 'id' | 'user_id' | 'created_at'>;