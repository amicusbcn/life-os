import { createClient } from '@/utils/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { UnifiedAppHeader } from '@/app/core/components/UnifiedAppHeader';
// ✅ IMPORTACIÓN CORREGIDA
import { getAllCategories, getRecipeById } from '@/app/recipes/data'; 
import { MenuRecipeFullData } from '@/types/recipes';
import { RecipesMenu } from '@/app/recipes/components/RecipesMenu';
import RecipeCreateForm from '@/app/recipes/components/RecipeCreateForm';

interface EditPageProps {
    params: { slug: string; id: string }
}

export default async function EditRecipePage({ params }: EditPageProps) {
    const { slug, id } = await params;
    
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // ✅ Uso de las funciones correctas
    const [recipe, categories] = await Promise.all([
        getRecipeById(id),
        getAllCategories()
    ]);

    if (!recipe) notFound();

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-10">
            <UnifiedAppHeader
                title={`Editar: ${recipe.name}`}
                backHref={`/recipes/${slug}/${id}`}
                userEmail={user.email || ''} 
                userRole={profile?.role || 'user'}
                moduleMenu={<RecipesMenu categories={categories} />}
            />
            <main className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
                <RecipeCreateForm 
                    categories={categories} 
                    initialData={recipe} 
                />
            </main>
        </div>
    );
}