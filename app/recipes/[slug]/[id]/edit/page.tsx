// app/recipes/[slug]/[id]/edit/page.tsx
import { notFound } from 'next/navigation';
import { getUserData } from '@/utils/security';
import { UnifiedAppSidebar } from '@/components/layout/UnifiedAppSidebar';
import { getAllCategories, getRecipeById } from '@/app/recipes/data'; 
import { RecipesMenu } from '@/app/recipes/components/RecipesMenu';
import RecipeCreateForm from '@/app/recipes/components/RecipeCreateForm';
import { SidebarMenu } from '@/components/ui/sidebar';

interface EditPageProps {
    params: Promise<{ slug: string; id: string }>;
}

export default async function EditRecipePage({ params }: EditPageProps) {
    const { slug, id } = await params;
    
    // 1. Seguridad centralizada (Módulo 'recipes')
    const { profile, accessibleModules } = await getUserData('recipes');

    // 2. Obtención de datos del módulo
    const [recipe, categories] = await Promise.all([
        getRecipeById(id),
        getAllCategories()
    ]);

    if (!recipe) notFound();

    return (
        <UnifiedAppSidebar
            title={`Editar: ${recipe.name}`}
            profile={profile}
            modules={accessibleModules}
            // ✅ Prop corregida: backLink
            backLink={`/recipes/${slug}/${id}`}
            // Slot Cuerpo: Navegación y acciones operativas
            moduleMenu={
                <RecipesMenu mode="operative" categories={categories} />
            }
            // Slot Pie: Gestión de categorías
            moduleSettings={
                <RecipesMenu mode="settings" categories={categories} />
            }
        >
            <main className="max-w-4xl mx-auto">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
                    <RecipeCreateForm 
                        categories={categories} 
                        initialData={recipe} 
                    />
                </div>
            </main>
        </UnifiedAppSidebar>
    );
}