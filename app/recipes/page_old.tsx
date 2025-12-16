// app/recipes/page.tsx (USANDO UN WRAPPER DE CLIENTE)
import { fetchAllRecipesWithDetails, fetchAllCategories } from './data'; 
import { UnifiedAppHeader } from '@/app/core/components/UnifiedAppHeader'; 
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';

// 🚨 Nuevo Wrapper de Cliente que contiene la lógica del Hub y la Lista
import RecipesMainWrapper from './components/RecipesMainWrapper'; 

export default async function RecipesPage() {
    
    const [allRecipes, allCategories] = await Promise.all([
        fetchAllRecipesWithDetails(),
        fetchAllCategories(),
    ]);
    
    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            
            <UnifiedAppHeader
                title="Módulo de Recetas"
                backHref="/" 
                maxWClass="max-w-5xl"
            />

            <main className="max-w-5xl mx-auto p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-700">Mi Libro de Recetas</h2>
                    <Button asChild>
                        <Link href="/recipes/create">
                            <Plus className="w-4 h-4 mr-2" />
                            Nueva Receta
                        </Link>
                    </Button>
                </div>

                {/* 🚨 Wrapper de Cliente para manejar el estado Hub vs Lista */}
                <RecipesMainWrapper 
                    initialRecipes={allRecipes} 
                    categories={allCategories} 
                /> 
                
            </main>
        </div>
    );
}