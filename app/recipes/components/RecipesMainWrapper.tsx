// app/recipes/components/RecipesMainWrapper.tsx
'use client';

import { useState } from 'react';
import { MenuRecipeWithDetails, MenuRecipeCategory } from '@/types/recipes';
import RecipeList from './RecipeList';
import CategoryHub from './CategoryHub';

interface RecipesMainWrapperProps {
    initialRecipes: MenuRecipeWithDetails[];
    categories: MenuRecipeCategory[];
}

export default function RecipesMainWrapper({ initialRecipes, categories }: RecipesMainWrapperProps) {
    // Si es 'all', mostramos la lista completa. Si es 'null', mostramos el hub.
    const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

    const handleCategorySelect = (categoryId: string) => {
        if (categoryId === 'all') {
            setActiveCategoryId('all');
        } else {
            setActiveCategoryId(categoryId);
        }
    };
    
    const handleBackToHub = () => {
        setActiveCategoryId(null);
    };

    if (activeCategoryId === null) {
        // Muestra el Hub de Categorías si no se ha seleccionado ninguna
        return (
            <CategoryHub 
                categories={categories} 
                onSelectCategory={handleCategorySelect} 
            />
        );
    }

    // Muestra la Lista de Recetas (RecipeList) si se seleccionó 'all' o un ID
    return (
        <RecipeList 
            initialRecipes={initialRecipes} 
            categories={categories}
            // 🚨 Pasamos la categoría activa para que RecipeList la use como filtro inicial
            initialActiveCategoryId={activeCategoryId === 'all' ? null : activeCategoryId}
            onBackToHub={handleBackToHub}
        />
    );
}