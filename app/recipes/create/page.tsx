import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
// ✅ IMPORTACIÓN CORREGIDA
import { getAllCategories } from '../data';
import { UnifiedAppHeader } from '@/app/core/components/UnifiedAppHeader';
import RecipeCreateForm from '../components/RecipeCreateForm';
import { RecipesMenu } from '../components/RecipesMenu';

export default async function CreateRecipePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // ✅ Uso de la función correcta
    const categories = await getAllCategories();
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-10">
            <UnifiedAppHeader
                title="Nueva Receta"
                backHref="/recipes"
                userEmail={user.email || ''} 
                userRole={profile?.role || 'user'}
                moduleMenu={<RecipesMenu categories={categories} />}
            />
            <main className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
                <RecipeCreateForm categories={categories} />
            </main>
        </div>
    );
}