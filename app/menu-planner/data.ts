// app/menu-planner/data.ts
import { createClient } from '@/utils/supabase/client'; // Asumimos esta ruta
import { MenuSchedule,MenuRecipe, MenuRecipeCategory, MenuRecipeSimple } from '@/types/menu-planner'; // Importamos el tipo centralizado

const supabase = createClient();

/**
 * Obtiene la planificación de comidas para un rango de fechas.
 *
 * @param startDate La fecha de inicio (ej: '2025-12-15')
 * @param endDate La fecha de fin (ej: '2025-12-21')
 * @returns Un array de objetos MenuSchedule, incluyendo sus platos (items).
 */
export async function getWeeklySchedule(
  startDate: string,
  endDate: string,
): Promise<MenuSchedule[] | { error: string }> {
  try {
    
    const { data, error } = await supabase
      .from('menu_schedule')
      .select(
        `
        *,
        menu_schedule_items (
          *,
          menu_recipes ( 
            id,
            name,
            menu_recipe_category_link (
                category_id,
                menu_recipe_categories (id, name, color, icon)
            )
          )
        )
      `
      )
      .gte('schedule_date', startDate)
      .lte('schedule_date', endDate)
      .order('schedule_date', { ascending: true })
      .order('meal_type', { foreignTable: 'menu_schedule_items', ascending: true })
      .order('turn_type', { foreignTable: 'menu_schedule_items', ascending: true });

    if (error) {
      console.error('Database Error fetching weekly schedule:', error);
      return { error: 'Error al cargar la planificación semanal.' };
    }

    // 🚨 CORRECCIÓN TS2352: Doble casting para asegurar el tipado.
    return data as unknown as MenuSchedule[];
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Error desconocido al obtener la planificación.';
    console.error('Unexpected error in getWeeklySchedule:', err);
    return { error: errorMessage };
  }
}

/**
 * Función de ejemplo para obtener todas las recetas.
 * Se usará en los selectores de los formularios.
 */
export async function getAllRecipes(): Promise<MenuRecipeSimple[] | { error: string }> {
  try {
    const { data, error } = await supabase
      .from('menu_recipes')
      .select(
        `
        id, 
        created_at,
        updated_at,
        user_id,
        name,
        menu_recipe_category_link (
            category_id,
            menu_recipe_categories (
                id,
                name,
                icon,
                color
            )
        )
      `
      )
      .order('name', { ascending: true });

    if (error) {
      console.error('Database Error fetching recipes with categories:', error);
      return { error: 'Error al cargar las recetas y sus categorías.' };
    }
    
    // Casting seguro. El resultado tendrá el formato de Recipe con las categorías anidadas.
    return data as MenuRecipeSimple[];
    
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Error desconocido al obtener las recetas.';
    return { error: errorMessage };
  }
}

/**
 * Función para obtener la lista completa de categorías de recetas (para los filtros).
 */
export async function getAllRecipeCategories(): Promise<MenuRecipeCategory[] | { error: string }> {
  try {
    const { data, error } = await supabase
      .from('menu_recipe_categories')
      .select('id, name, icon, color')
      .order('name', { ascending: true });

    if (error) {
      console.error('Database Error fetching recipe categories:', error);
      return { error: 'Error al cargar las categorías de recetas.' };
    }

    return data as MenuRecipeCategory[];
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Error desconocido al obtener las categorías.';
    return { error: errorMessage };
  }
}