/**
 * 🍳 VISTA DETALLADA DE RECETA
 * Muestra la información completa de una receta: tiempos, ingredientes, pasos.
 * Permite navegar a la edición o eliminar la receta.
 * * - Server Component: Sí
 * - Data Fetching: Paralelo (Receta + Ingredientes + Categorías)
 */

import { createClient } from '@/utils/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { Trash2, Edit, Utensils, Clock, User, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UnifiedAppHeader } from '@/app/core/components/UnifiedAppHeader';
import { getAllCategories, getRecipeIngredients } from '../../data'; 
import { MenuRecipeFullData } from '@/types/recipes'; 
import { deleteRecipe } from '../../actions'; 
import { RecipesMenu } from '../../components/RecipesMenu';

interface RecipeViewPageProps { 
    params: { slug: string; id: string } 
}

export default async function RecipeViewPage({ params }: RecipeViewPageProps) {
    const { slug, id } = await params; 
    
    if (!id || id === 'undefined') notFound();
    
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login'); 

    // Obtener perfil para rol (Header)
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    const userRole = profile?.role || 'user';

    // Carga paralela de datos
    const [
        { data: recipeData, error: recipeError },
        ingredients,
        categories,
    ] = await Promise.all([
        supabase.from('menu_recipes').select('*').eq('id', id).single(),
        getRecipeIngredients(id),
        getAllCategories(), 
    ]);
    
    if (recipeError || !recipeData) {
        if (recipeError) console.error("Error cargando receta:", recipeError.message);
        notFound();
    }

    // Sanitización de datos
    const rawLabels = Array.isArray(recipeData.labels) ? recipeData.labels as string[] : [];
    const sanitizedLabels = rawLabels.map(l => l.trim()).filter(Boolean);

    const recipe: MenuRecipeFullData = { 
        ...recipeData, 
        ingredients: ingredients || [],
        labels: sanitizedLabels,
    };
    
    const category = categories?.find(c => c.id === recipe.category_id);
    const totalTime = (recipe.prep_time_min || 0) + (recipe.cook_time_min || 0);

    const backToCategoryHref = `/recipes/${slug}`;
    const editHref = `/recipes/${slug}/${id}/edit`;

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-10">
            <UnifiedAppHeader
                title="Mi Libro de Recetas"
                backHref={backToCategoryHref}
                userEmail={user.email || ''} 
                userRole={userRole}
                moduleMenu={<RecipesMenu categories={categories} />}
            />

            <main className="max-w-4xl mx-auto p-4 space-y-6">
                
                {/* Cabecera y Acciones */}
                <header className="flex justify-between items-start pt-2">
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 break-words max-w-[80%]">
                        {recipe.name}
                    </h1>
                    <div className="flex gap-2 shrink-0">
                        <Link href={editHref}>
                            <Button variant="outline" size="icon" title="Editar receta">
                                <Edit className="w-5 h-5 text-indigo-600" />
                            </Button>
                        </Link>
                        
                        {/* La acción deleteRecipe ahora acepta FormData, compatible con 'action' */}
                        <form action={deleteRecipe}>
                            <input type="hidden" name="id" value={recipe.id} />
                            <input type="hidden" name="categorySlug" value={slug} />
                            <Button variant="outline" size="icon" type="submit" className="hover:bg-red-50 hover:text-red-600" title="Eliminar receta">
                                <Trash2 className="w-5 h-5" />
                            </Button>
                        </form>
                    </div>
                </header>

                {/* Metadatos */}
                <Card className="shadow-sm border-slate-200">
                    <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm text-slate-700">
                        <div className="flex flex-col gap-1">
                            <span className="font-semibold text-xs text-slate-500 uppercase">Tiempo Total</span>
                            <span className="flex items-center gap-1.5 text-base font-medium">
                                <Clock className="w-4 h-4 text-indigo-500" />
                                {totalTime > 0 ? `${totalTime} min` : 'N/A'}
                            </span>
                        </div>
                        
                        <div className="flex flex-col gap-1">
                            <span className="font-semibold text-xs text-slate-500 uppercase">Raciones</span>
                            <span className="flex items-center gap-1.5 text-base font-medium">
                                <User className="w-4 h-4 text-indigo-500" />
                                {recipe.servings || 1}
                            </span>
                        </div>
                        
                        {category && (
                            <div className="flex flex-col gap-1">
                                <span className="font-semibold text-xs text-slate-500 uppercase">Categoría</span>
                                <span className="flex items-center gap-1.5 text-base font-medium">
                                    <Utensils className="w-4 h-4 text-indigo-500" />
                                    {category.name}
                                </span>
                            </div>
                        )}
                        
                        {recipe.source_url && (
                            <div className="flex flex-col gap-1">
                                <span className="font-semibold text-xs text-slate-500 uppercase">Fuente</span>
                                <a href={recipe.source_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-base font-medium hover:text-blue-600 transition-colors">
                                    <ExternalLink className="w-4 h-4 text-blue-500" />
                                    Ver URL
                                </a>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Etiquetas: CORRECCIÓN DE TIPADO - Añadido ?.length y ?.map */}
                {(recipe.labels?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                        {recipe.labels?.map((label, index) => (
                            <Badge key={index} variant="secondary" className="text-xs font-medium">
                                {label}
                            </Badge>
                        ))}
                    </div>
                )}
                
                {/* Contenido Detallado */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-1 shadow-sm border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-xl">Ingredientes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-3 text-base">
                                {recipe.ingredients.map((ing, index) => (
                                    <li key={index} className="border-b border-slate-100 pb-1.5 last:border-0">
                                        <span className="font-semibold text-slate-900 mr-1.5">
                                            {ing.quantity} {ing.unit}
                                        </span>
                                        {ing.name}
                                        {ing.notes && <span className="text-sm text-slate-500 italic ml-2">({ing.notes})</span>}
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>

                    <Card className="lg:col-span-2 shadow-sm border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-xl">Preparación</CardTitle>
                        </CardHeader>
                        <CardContent className="whitespace-pre-wrap text-slate-700 leading-relaxed">
                            {recipe.description || 'No hay descripción de los pasos.'}
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}