// app/recipes/components/RecipesMainWrapper.tsx
'use client';

// Eliminamos useState y los handlers, ya no son necesarios
import { MenuRecipeWithDetails, MenuRecipeCategoryWithCount } from '@/types/recipes';
import RecipeList from './RecipeList';
// Eliminamos CategoryHub si solo se usa RecipeList

interface RecipesMainWrapperProps {
    initialRecipes: MenuRecipeWithDetails[];
    categories: MenuRecipeCategoryWithCount[];
    // Corregimos la desestructuración de props que causaba el error anterior
    initialActiveCategoryId: string; 
    slug: string;
}

// 🚨 COMPONENTE SIMPLIFICADO: Solo desestructura y pasa las props al RecipeList
export default function RecipesMainWrapper({ 
    initialRecipes, 
    categories, 
    initialActiveCategoryId, // 🚨 Añadido initialActiveCategoryId
    slug // 🚨 Añadido slug
}: RecipesMainWrapperProps) {
    
    // NOTA: Si este componente solo se usa en [slug]/page.tsx, NO DEBERÍA haber lógica de estado (useState) 
    // para decidir si mostrar el Hub. El routing de Next.js se encarga de eso.

    // 🚨 Eliminamos toda la lógica de estado y condicional

    // Muestra directamente la Lista de Recetas (RecipeList)
    return (
        <RecipeList 
            initialRecipes={initialRecipes} 
            categories={categories}
            // Usamos la prop activa pasada por el Server Component
            initialActiveCategoryId={initialActiveCategoryId} 
            slug={slug} 
        />
    );
}