// app/recipes/edit/[id]/page.tsx (VERSION FINAL CON MANEJO DE ERRORES CLARO)
import { createClient } from '@/utils/supabase/server'
import { redirect, notFound } from 'next/navigation'
import RecipeCreateForm from '@/app/recipes/components/RecipeCreateForm';
import { UnifiedAppHeader } from '@/app/core/components/UnifiedAppHeader';

import { fetchAllCategories, fetchRecipeIngredients } from '@/app/recipes/data'; 
import { MenuRecipeFullData, MenuRecipe } from '@/types/recipes'; 
import {RecipesMenu} from '@/app/recipes/components/RecipesMenu';

interface EditRecipePageProps { 
    params: Promise<{ id: string }> 
}

export default async function EditRecipePage({ params }: EditRecipePageProps) {
    const { id } = await params
    if (!id || id === 'undefined') notFound();
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login'); 
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    const userRole = profile?.role || 'user'; // Asumiendo que 'user' es el rol por defecto
    try {
        const [
            { data: recipe, error: recipeError },
            categories,
        ] = await Promise.all([
            // 🚨 CORRECCIÓN TS2352: Usamos 'as unknown as Promise<...>' para el PostgrestBuilder
            (supabase.from('menu_recipes').select('*').eq('id', id).single() as unknown) as Promise<{ data: MenuRecipe | null; error: any }>,
            // Categorías
            fetchAllCategories(), 
        ])

        if (recipeError) {
            console.error("SUPABASE ERROR - Recipe Fetch:", recipeError.message);
        }

        if (!recipe) {
            notFound();
        }

        const ingredients = await fetchRecipeIngredients(id);
        const labelsAsString = Array.isArray(recipe.labels) ? recipe.labels.join(', ') : '';
        
        const initialData: MenuRecipeFullData = {
            ...recipe,
            labels: labelsAsString as any, 
            ingredients: ingredients || [],
        };
        
        return (
            <div className="min-h-screen bg-slate-50 font-sans">
                 <UnifiedAppHeader
                    title={`Editar Receta: ${recipe.name}`} 
                    backHref={`/recipes/all/${recipe.id}`}
                    maxWClass='max-w-4xl' 
                    userEmail={user.email || ''} 
                    userRole={userRole} 
                    moduleMenu={
                        <RecipesMenu categories={categories} />
                    }
                    
                />
                <main className="max-w-4xl mx-auto p-6">
                    <RecipeCreateForm 
                        categories={categories || []} 
                        initialData={initialData}
                    />
                </main>
            </div>
        );

    } catch (e) {
        // Atrapa cualquier error de red o de código inesperado y lo registra.
        console.error("FATAL ERROR during Edit Recipe Page load:", e);
        // Si hay un error fatal, redirigimos al hub para evitar un 500
        redirect('/recipes'); 
    }
}