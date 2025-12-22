// app/recipes/create/page.tsx
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { fetchAllCategoriesWithCount, fetchAllCategories} from '../data'; // Importamos la función de fetch de categorías
import { UnifiedAppHeader } from '@/app/core/components/UnifiedAppHeader'; 
import RecipeCreateForm from '../components/RecipeCreateForm';
import {RecipesMenu} from '../components/RecipesMenu';


export default async function CreateRecipePage() {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login'); 
    
    // 1. OBTENCIÓN DE DATOS REALES DESDE DATA.TS
    // Esta función ya devuelve [Todas las recetas, ...categorías] con sus conteos correctos
    const categoriesWithCount = await fetchAllCategoriesWithCount(); 
    const categoriesRaw = await fetchAllCategories();

    // Obtenemos el perfil para el header
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    const userRole = profile?.role || 'user';

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-10">
            <UnifiedAppHeader
                title="Mi Libro de Recetas"
                backHref="/"
                userEmail={user.email || ''} 
                userRole={userRole}
                moduleMenu={
                    <RecipesMenu categories={categoriesRaw} />
                }
            />

            <main className="max-w-4xl mx-auto p-6">
                
                <RecipeCreateForm categories={categoriesRaw} />
                
            </main>
        </div>
    );
}