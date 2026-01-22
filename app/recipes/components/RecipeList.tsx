// app/recipes/components/RecipeList.tsx (Actualizado para Slugs)
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { MenuRecipeWithDetails, MenuRecipeCategory } from '@/types/recipes';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'; 
import { Search, Utensils, Filter, X, ArrowLeft } from 'lucide-react';

import RecipeCard from './RecipeCard'; 

interface RecipeListProps {
    initialRecipes: MenuRecipeWithDetails[];
    categories: MenuRecipeCategory[];
    initialActiveCategoryId: string | null;
    slug: string; // Se usa para la navegación a la ficha
}

// Subcomponente extraído para mejor rendimiento y limpieza
const FilterPanel = ({ 
    categories, 
    activeCategoryId, 
    onCloseSheet 
}: { 
    categories: MenuRecipeCategory[], 
    activeCategoryId: string | null,
    onCloseSheet: () => void 
}) => (
    <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-700 mb-3">Filtrar por Categoría</h3>
        
        <Link href="/recipes" className="block">
            <Button variant="secondary" className="w-full text-left justify-start mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" /> Volver al Hub
            </Button>
        </Link>
        
        <Link href="/recipes/all" className="block">
            <div
                onClick={onCloseSheet}
                className={`block p-2 rounded-md hover:bg-gray-100 text-sm cursor-pointer transition-colors
                    ${activeCategoryId === 'all' 
                        ? 'bg-indigo-100 text-indigo-700 font-semibold' 
                        : 'text-gray-700'
                    }`}
            >
                Todas las recetas
            </div>
        </Link>

        <div className="space-y-1 max-h-80 overflow-y-auto mt-4 border-t pt-2">
            <h4 className="text-sm font-semibold text-gray-600">Categorías:</h4>
            {categories.map(category => (
                <Link href={`/recipes/${category.slug}`} key={category.id} className="block">
                    <div
                        onClick={onCloseSheet}
                        className={`p-2 rounded-md hover:bg-gray-100 text-sm cursor-pointer transition-colors
                            ${activeCategoryId === category.id 
                                ? 'bg-indigo-100 text-indigo-700 font-semibold' 
                                : 'text-gray-700'
                            }`}
                    >
                        {category.name}
                    </div>
                </Link>
            ))}
        </div>
    </div>
);

export default function RecipeList({ initialRecipes, categories, initialActiveCategoryId, slug }: RecipeListProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const activeCategoryId = initialActiveCategoryId; 

    // Filtrado local solo por texto (el filtrado por categoría es server-side)
    const filteredRecipes = useMemo(() => {
        if (!searchTerm) return initialRecipes;

        const lowerCaseSearch = searchTerm.toLowerCase();
        return initialRecipes.filter(recipe => {
            const matchesName = recipe.name.toLowerCase().includes(lowerCaseSearch);
            const matchesDescription = recipe.description?.toLowerCase().includes(lowerCaseSearch) || false;
            const matchesLabels = Array.isArray(recipe.labels) && recipe.labels.some(label => 
                label.toLowerCase().includes(lowerCaseSearch)
            );
            return matchesName || matchesDescription || matchesLabels;
        });
    }, [initialRecipes, searchTerm]);

    const currentCategory = activeCategoryId && activeCategoryId !== 'all'
        ? categories.find(c => c.id === activeCategoryId)?.name 
        : 'Todas las Recetas';

    return (
        <div className="flex">
            {/* Sidebar Desktop */}
            <aside className={`hidden md:block w-64 flex-shrink-0 mr-6`}>
                <Card className="p-4 shadow-md sticky top-6">
                    <FilterPanel 
                        categories={categories} 
                        activeCategoryId={activeCategoryId} 
                        onCloseSheet={() => setIsSheetOpen(false)} 
                    />
                </Card>
            </aside>

            {/* Contenido Principal */}
            <div className={`flex-1 space-y-4`}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-slate-700 flex-shrink-0 mr-4">
                        {currentCategory} 
                        <span className='ml-3 text-base font-normal text-gray-500'>
                            ({filteredRecipes.length})
                        </span>
                    </h3>

                    {/* Botón Filtro Mobile */}
                    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                        <SheetTrigger asChild>
                            <Button variant="outline" className="md:hidden flex items-center gap-1">
                                <Filter className="w-4 h-4" />
                                Categorías
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[280px] sm:w-[350px] p-4 pt-12">
                            <FilterPanel 
                                categories={categories} 
                                activeCategoryId={activeCategoryId} 
                                onCloseSheet={() => setIsSheetOpen(false)} 
                            />
                        </SheetContent>
                    </Sheet>
                </div>
                
                {/* Buscador */}
                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                        type="text"
                        placeholder={`Buscar dentro de ${currentCategory}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 p-2 border-slate-300 shadow-sm"
                    />
                    {searchTerm && (
                        <X 
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 cursor-pointer hover:text-red-500" 
                            onClick={() => setSearchTerm('')}
                        />
                    )}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredRecipes.length === 0 ? (
                         <div className="col-span-full text-center p-10 bg-white rounded-lg shadow-sm">
                            <Utensils className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                            <p className="text-lg text-gray-600">No se encontraron recetas en esta selección.</p>
                        </div>
                    ) : (
                        filteredRecipes.map(recipe => (
                            <Link href={`/recipes/${slug}/${recipe.id}`} key={recipe.id}>
                                <RecipeCard recipe={recipe} />
                            </Link>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}