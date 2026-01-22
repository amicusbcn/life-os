import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getCategoriesWithCount, getRecipesByCategoryId } from '../data';
import RecipeList from '../components/RecipeList';
import { UnifiedAppHeader } from '@/app/core/components/UnifiedAppHeader';
import { RecipesMenu } from '../components/RecipesMenu';

interface CategoryPageProps {
    params: { slug: string }
}

export default async function CategoryPage({ params }: CategoryPageProps) {
    const { slug } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const categories = await getCategoriesWithCount();
    
    // Buscar la categoría activa por slug
    const activeCategory = categories.find(c => c.slug === slug);
    
    // Si no existe y no es 'all', 404
    if (!activeCategory && slug !== 'all') {
        notFound();
    }

    const categoryId = slug === 'all' ? 'all' : activeCategory?.id || null;
    const recipes = await getRecipesByCategoryId(categoryId);

    // ✅ CORRECCIÓN: Pasamos 'categories' directamente. 
    // TypeScript permite pasar objetos con propiedades extra (recipeCount), 
    // siempre que cumplan con la estructura base de MenuRecipeCategory.
    const menuCategories = categories;

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-10">
            <UnifiedAppHeader
                title="Mi Libro de Recetas"
                backHref="/recipes"
                userEmail={user.email || ''} 
                userRole={profile?.role || 'user'}
                moduleMenu={<RecipesMenu categories={menuCategories} />}
            />
            <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                <RecipeList 
                    initialRecipes={recipes} 
                    categories={categories}
                    initialActiveCategoryId={categoryId}
                    slug={slug}
                />
            </main>
        </div>
    );
}