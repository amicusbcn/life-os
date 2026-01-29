// app/recipes/create/page.tsx
import { getUserData } from '@/utils/security';
import { UnifiedAppSidebar } from '@/components/layout/UnifiedAppSidebar';
import { getAllCategories } from '../data';
import RecipeCreateForm from '../components/RecipeCreateForm';
import { RecipesMenu } from '../components/RecipesMenu';

export default async function CreateRecipePage() {
    // 1. Seguridad centralizada (Módulo 'recipes')
    const { profile, accessibleModules } = await getUserData('recipes');

    // 2. Obtención de categorías para el selector del formulario
    const categories = await getAllCategories();

    return (
        <UnifiedAppSidebar
            title="Nueva Receta"
            profile={profile}
            modules={accessibleModules}
            // ✅ Navegación unificada
            backLink="/recipes"
            // Slot Cuerpo: Navegación operativa
            moduleMenu={
                <RecipesMenu mode="operative" categories={categories} />
            }
            // Slot Pie: Ajustes
            moduleSettings={
                <RecipesMenu mode="settings" categories={categories} />
            }
        >
            <main className="max-w-4xl mx-auto">
                {/* Contenedor estético para el formulario */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
                    <header className="mb-6 border-b border-slate-100 pb-4">
                        <h2 className="text-xl font-bold text-slate-800">Crear Nueva Receta</h2>
                        <p className="text-sm text-slate-500">Introduce los detalles, ingredientes y pasos de tu nueva creación.</p>
                    </header>

                    <RecipeCreateForm categories={categories} />
                </div>
            </main>
        </UnifiedAppSidebar>
    );
}