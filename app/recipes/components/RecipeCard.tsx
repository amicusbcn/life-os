// app/recipes/components/RecipeCard.tsx
import { MenuRecipeWithDetails } from '@/types/recipes';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Utensils, Clock, Timer, Pencil } from 'lucide-react';

interface RecipeCardProps {
    recipe: MenuRecipeWithDetails;
}

export default function RecipeCard({ recipe }: RecipeCardProps) {
    
    // Extraemos datos para facilitar la lectura
    const category = recipe.category_id;
    // Sumamos el tiempo de preparación y cocción (manejando valores nulos)
    const totalTime = (recipe.prep_time_min || 0) + (recipe.cook_time_min || 0);

    return (
        // Usamos hover:shadow-xl en la tarjeta para el efecto clickeable (asumimos que está envuelto en <Link>)
        <Card className="hover:shadow-xl transition-all duration-300 ease-in-out cursor-pointer h-full flex flex-col justify-between border-slate-200">
            
            <CardHeader className="p-4 pb-0">
                {/* Nombre y Categoría */}
                <div className="flex justify-between items-start">
                    <CardTitle className="text-xl font-semibold leading-tight text-slate-800 line-clamp-2">
                        {recipe.name}
                    </CardTitle>
                    {category && (
                        // Píldora de Categoría (similar al diseño de la imagen)
                        <span 
                            className="text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ml-3"
                            style={{ 
                                backgroundColor: category.color || '#ccc', 
                                color: '#1f2937' // Texto oscuro para contraste
                            }} 
                            title={`Categoría: ${category.name}`}
                        >
                            {category.name}
                        </span>
                    )}
                </div>
                
                {/* Descripción (Snippet) */}
                <CardDescription className="text-sm line-clamp-2 mt-2">
                    {recipe.description || 'Sin descripción detallada.'}
                </CardDescription>
            </CardHeader>

            {/* Contenido de Píldoras (Raciones y Tiempo) */}
            <CardContent className="p-4 pt-2">
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                    
                    {/* Raciones */}
                    {(recipe.servings !== null && recipe.servings !== undefined && recipe.servings > 0) && (
                        <div className="flex items-center gap-1.5" title="Raciones">
                            <Utensils className="w-4 h-4" />
                            <span>{recipe.servings} Pax</span>
                        </div>
                    )}

                    {/* Tiempo Total */}
                    {totalTime > 0 && (
                        <div className="flex items-center gap-1.5" title="Tiempo total (Prep. + Cocción)">
                            <Clock className="w-4 h-4" />
                            <span>{totalTime} min</span>
                        </div>
                    )}

                </div>
            </CardContent>
        </Card>
    );
}