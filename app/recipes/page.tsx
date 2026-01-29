// app/recipes/page.tsx
import { getUserData } from '@/utils/security';
import { UnifiedAppSidebar } from '@/components/layout/UnifiedAppSidebar';
import { getCategoriesWithCount, getAllCategories } from './data';
import { RecipesMenu } from './components/RecipesMenu';
import CategoryHub from './components/CategoryHub'; 
import { Utensils } from 'lucide-react'; 

export default async function RecipesPage() {
    // 1. Seguridad y Datos de Usuario centralizados
    const { profile, accessibleModules } = await getUserData('recipes');
    
    // 2. Obtención de datos (data.ts)
    const [categoriesWithCount, categoriesRaw] = await Promise.all([
        getCategoriesWithCount(),
        getAllCategories()
    ]);

    return (
        <UnifiedAppSidebar
            title="Mi Libro de Recetas"
            profile={profile}
            modules={accessibleModules}
            moduleMenu={
                <RecipesMenu mode="operative" categories={categoriesRaw} />
            }
            // Slot Pie: Gestión de categorías
            moduleSettings={
                <RecipesMenu mode="settings" categories={categoriesRaw} />
            }
        >
            <main className="max-w-7xl mx-auto">
                {/* Título de la sección interna */}
                <header className="mb-8">
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                        Categorías
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Explora tus recetas organizadas por tipo de cocina o ingrediente.
                    </p>
                </header>

                {/* Vista de contenido o Estado Vacío */}
                {categoriesWithCount.length === 0 ? (
                    <div className="text-center p-16 bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Utensils className="w-8 h-8 text-slate-400" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">Aún no tienes categorías</h2>
                        <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto">
                            Tu libro está vacío. Crea tu primera receta para empezar a organizar tu cocina.
                        </p>
                    </div>
                ) : (
                    <CategoryHub categories={categoriesWithCount} />
                )}
            </main>
        </UnifiedAppSidebar>
    );
}