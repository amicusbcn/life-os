// app/recipes/components/RecipeCard.tsx
'use client'; // Aseguramos que LoadIcon (que es client-side) funcione bien

import { MenuRecipeWithDetails } from '@/types/recipes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Utensils, Clock } from 'lucide-react';
import LoadIcon from '@/utils/LoadIcon';

interface RecipeCardProps {
    recipe: MenuRecipeWithDetails;
}

export default function RecipeCard({ recipe }: RecipeCardProps) {
    // 🔍 DEBUG: Si no ves la categoría, abre la consola (F12) y busca este log.
    console.log(`Datos de ${recipe.name}:`, recipe.category_id);

    const category = recipe.category_id;
    const totalTime = (recipe.prep_time_min || 0) + (recipe.cook_time_min || 0);

    return (
        <Card className="hover:shadow-xl transition-all duration-300 ease-in-out cursor-pointer h-full flex flex-col border-slate-200 overflow-hidden bg-white">
            
            <CardHeader className="p-4 pb-0">
                <CardTitle className="text-lg font-semibold leading-tight text-slate-800 line-clamp-2">
                    {recipe.name}
                </CardTitle>
                
                <CardDescription className="text-sm line-clamp-2 mt-2 min-h-[2.5rem] text-slate-500">
                    {recipe.description || 'Sin descripción detallada.'}
                </CardDescription>
            </CardHeader>

            <CardContent className="p-4 pt-4 mt-auto">
                {/* Separador visual */}
                <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                    
                    {/* Grupo de info: Pax y Tiempo */}
                    <div className="flex items-center space-x-3 text-xs font-medium text-slate-500">
                        {recipe.servings && recipe.servings > 0 && (
                            <div className="flex items-center gap-1.5" title="Raciones">
                                <Utensils className="w-3.5 h-3.5 text-slate-400" />
                                <span>{recipe.servings} Pax</span>
                            </div>
                        )}

                        {totalTime > 0 && (
                            <div className="flex items-center gap-1.5" title="Tiempo total">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span>{totalTime} min</span>
                            </div>
                        )}
                    </div>

                    {/* Píldora de Categoría - Renderizado condicional estricto */}
                    {category && category.name ? (
                        <div 
                            className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-md flex items-center gap-1.5 shrink-0"
                            style={{ 
                                backgroundColor: category.color || '#f1f5f9', 
                                color: '#334155' 
                            }} 
                        >
                            {category.icon && (
                                <LoadIcon 
                                    name={category.icon} 
                                    className="w-3 h-3" 
                                    strokeWidth={2.5} 
                                />
                            )}
                            <span>{category.name}</span>
                        </div>
                    ) : null}
                </div>
            </CardContent>
        </Card>
    );
}