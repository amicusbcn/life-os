// types/menu-planner.ts
// Enums para los tipos de base de datos
export type MealType = 'lunch' | 'dinner';
export type TurnType = 'adults' | 'children';
export type StockStatus = 'full' | 'open' | 'low' | 'empty';

// --- RECETAS ---
export interface MenuRecipe {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;

  name: string;
  description?: string;
  prep_time_min?: number;
  cook_time_min?: number;
  servings?: number;

  image_url?: string;
  source_url?: string;
  menu_recipe_category_link?: { category_id: string, menu_recipe_categories: MenuRecipeCategory }[];

  // futura conexión a ingredientes
}


// --- PLANIFICACIÓN SEMANAL ---
export interface MenuSchedule {
  id: string;
  created_at: string;
  user_id: string;
  
  schedule_date: string; // Formato YYYY-MM-DD
  notes?: string;
  
  // Campo que contendrá los items relacionados para la vista principal
  menu_schedule_items?: MenuScheduleItem[]; 
}

export interface MenuScheduleItem {
  id: string;
  schedule_id: string; // FKey a MenuSchedule

  meal_type: MealType; 
  turn_type: TurnType; 
  
  order_in_meal: number; // 1, 2, 3... (1º plato, 2º, Postre)
  
  recipe_id?: string | null; // FKey a MenuRecipe
  free_text?: string | null; // Texto libre, puede ser un link 'futuro'
  
  is_out: boolean; // Si es true, la familia/turno come fuera
  
  // Objeto de la receta, si recipe_id está presente
  menu_recipes?: MenuRecipe; 
}


// --- INVENTARIO DE COCINA ---
export interface MenuFoodStock {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  
  name: string;
  quantity: number;
  unit: string;
  
  expiration_date?: string; // Formato YYYY-MM-DD
  stock_status: StockStatus;
  
  notes?: string;
}

export interface MenuRecipeCategory {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  slug?:string;
}

export interface MenuRecipeSimple {
  id: string;
  name: string;
  // Usamos el tipo Link que acabamos de definir
  category_id?: MenuRecipeCategory | null; 
}


export interface CloneableElementProps {
    // Para cualquier onClick estándar (evento sintético de React)
    onClick?: (e: React.MouseEvent) => void; 
    // Para onSelect de DropdownMenuItem (evento nativo del DOM)
    onSelect?: (e: Event) => void; 
    asChild?: boolean;
}

// Interfaz para el componente de ajustes del menú (ej: MenuRecipeCategoriesSettings)
export interface MenuSettingsProps {
    // El children debe aceptar las props de clonación, además de las props de un div HTML.
    children: React.ReactElement<CloneableElementProps & React.HTMLAttributes<HTMLDivElement>>;
}

export interface Suggestion {
  id: string;             
  value: string;          
  type: 'recipe' | 'free_text'; 
}
export interface MenuPlanItemAutocompleteProps {
  initialValue: string | null; // Valor actual del plato (nombre de receta o texto libre)
  onSelect: (value: { id: string | null; name: string | null; type: 'recipe' | 'free_text' | 'new' }) => void;
  isLoading: boolean;
}

export type SelectedMeal = { 
  id: string | null; 
  name: string | null; 
  type: 'recipe' | 'free_text' | 'new' 
};

export interface EditScheduleItemFormProps {
  scheduleDate: string;
  mealType: MealType;
  turnType: TurnType;
  initialItems: MenuScheduleItem[];
  allRecipes: MenuRecipeSimple[];
  allCategories: MenuRecipeCategory[];
  
  // 🚨 Propiedad FALTANTE que el modal intenta pasar
  onFinished: (refreshNeeded: boolean) => void; 
}

export interface MenuPlannerItemCellProps {
  day: string; 
  mealType: MealType;
  turnType: TurnType;
  items: MenuScheduleItem[];
}

export interface MenuPlanEditModalProps {
  day: string;
  mealType: MealType;
  turnType: TurnType;
  initialItems: MenuScheduleItem[];
  triggerType: 'edit' | 'add';
  allRecipes: any[]; // Asumimos que estos datos vendrán del servidor (page.tsx)
  allCategories: any[]; // Asumimos que estos datos vendrán del servidor (page.tsx)
}