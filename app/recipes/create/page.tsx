// app/recipes/create/page.tsx
import { createClient } from '@/utils/supabase/server';
import { fetchAllCategories } from '../data'; // Importamos la función de fetch de categorías
import { UnifiedAppHeader } from '@/app/core/components/UnifiedAppHeader'; 
import RecipeCreateForm from '../components/RecipeCreateForm';

export default async function CreateRecipePage() {
    
    // Obtener las categorías en el servidor para el selector
    const categories = await fetchAllCategories();
    
    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <UnifiedAppHeader
                title="Nueva Receta"
                backHref="/recipes" // Volver al Hub/Lista de Recetas
                maxWClass="max-w-4xl" // Hacemos el contenedor un poco más estrecho para el formulario
            />

            <main className="max-w-4xl mx-auto p-6">
                <h1 className="text-3xl font-bold text-slate-800 mb-6">Crear Nueva Receta</h1>
                
                <RecipeCreateForm categories={categories} />
                
            </main>
        </div>
    );
}