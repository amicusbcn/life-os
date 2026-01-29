// app/recipes/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { getCategoriesWithCount, getRecipesByCategoryId } from '../data';
import RecipeList from '../components/RecipeList';
import { RecipesMenu } from '../components/RecipesMenu';
import { getUserData } from '@/utils/security';
import { UnifiedAppSidebar } from '@/components/layout/UnifiedAppSidebar';

interface CategoryPageProps {
    params: Promise<{ slug: string }>; // En Next.js 15+ params es una Promise
}

export default async function CategoryPage({ params }: CategoryPageProps) {
    const { slug } = await params;

    // 1. Seguridad y Datos de Usuario centralizados
    const { profile, accessibleModules } = await getUserData('recipes');

    // 2. Obtención de datos del módulo
    const categories = await getCategoriesWithCount();
    
    // Buscar la categoría activa por slug
    const activeCategory = categories.find(c => c.slug === slug);
    
    // Validación de existencia
    if (!activeCategory && slug !== 'all') {
        notFound();
    }

    const categoryId = slug === 'all' ? 'all' : activeCategory?.id || null;
    const recipes = await getRecipesByCategoryId(categoryId);

    // Título dinámico para el Sidebar
    const pageTitle = slug === 'all' ? 'Todas las Recetas' : (activeCategory?.name || 'Recetas');

    return (
        <UnifiedAppSidebar
            title={pageTitle}
            profile={profile}
            modules={accessibleModules}
            // Botón de atrás al Hub de categorías
            backLink="/recipes"
            // Slot Cuerpo: Botón "Nueva Receta" y navegación operativa
            moduleMenu={
                <RecipesMenu mode="operative" categories={categories} />
            }
            // Slot Pie: Gestión de categorías
            moduleSettings={
                <RecipesMenu mode="settings" categories={categories} />
            }
        >
            <main className="max-w-7xl mx-auto">
                <RecipeList 
                    initialRecipes={recipes} 
                    categories={categories}
                    initialActiveCategoryId={categoryId}
                    slug={slug}
                />
            </main>
        </UnifiedAppSidebar>
    );
}