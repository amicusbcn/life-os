import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, Utensils } from 'lucide-react'; 
import { Button } from '@/components/ui/button';
import { UnifiedAppHeader } from '@/app/core/components/UnifiedAppHeader';
import { getCategoriesWithCount, getAllCategories } from './data';
import { RecipesMenu } from './components/RecipesMenu';
import CategoryHub from './components/CategoryHub'; 

export default async function RecipesPage() {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login'); 
    
    // Obtención de datos usando las nuevas funciones estandarizadas en data.ts
    const categoriesWithCount = await getCategoriesWithCount(); 
    const categoriesRaw = await getAllCategories();

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    const userRole = profile?.role || 'user';

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-10">
            <UnifiedAppHeader
                title="Mi Libro de Recetas"
                backHref="/"
                userEmail={user.email || ''} 
                userRole={userRole}
                moduleMenu={<RecipesMenu categories={categoriesRaw} />}
            />

            <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                <header className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-extrabold text-slate-900">
                        Categorías
                    </h1>
                    
                    <Link href="/recipes/new">
                        <Button className="flex items-center gap-2">
                            <Plus className="w-5 h-5" />
                            Nueva Receta
                        </Button>
                    </Link>
                </header>

                {categoriesWithCount.length === 0 ? (
                    <div className="text-center p-16 bg-white rounded-xl border border-dashed border-slate-300">
                        <Utensils className="w-10 h-10 text-gray-400 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-gray-700">Aún no tienes categorías</h2>
                        <p className="text-sm text-gray-500 mt-1">Empieza creando una receta para generar tu primera categoría.</p>
                    </div>
                ) : (
                    <CategoryHub categories={categoriesWithCount} />
                )}
            </main>
        </div>
    );
}