// app/recipes/create/page.tsx
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { fetchAllCategories } from '../data'; // Importamos la función de fetch de categorías
import { UnifiedAppHeader } from '@/app/core/components/UnifiedAppHeader'; 
import RecipeCreateForm from '../components/RecipeCreateForm';

export default async function CreateRecipePage() {
    const supabase = await createClient();
        // --- 1. Autenticación y Perfil ---
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login'); 

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    const userRole = profile?.role || 'user';
    // Obtener las categorías en el servidor para el selector
    const categories = await fetchAllCategories();
    
    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <UnifiedAppHeader
                title="Nueva Receta"
                backHref="/recipes" // Volver al Hub/Lista de Recetas
                maxWClass="max-w-4xl" // Hacemos el contenedor un poco más estrecho para el formulario
                userEmail={user.email || ''} 
                userRole={userRole}
            />

            <main className="max-w-4xl mx-auto p-6">
                <h1 className="text-3xl font-bold text-slate-800 mb-6">Crear Nueva Receta</h1>
                
                <RecipeCreateForm categories={categories} />
                
            </main>
        </div>
    );
}