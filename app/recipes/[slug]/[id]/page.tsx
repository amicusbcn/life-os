/**
 * 🍳 VISTA DETALLADA DE RECETA
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Trash2, Edit, Utensils, Clock, User, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getAllCategories, getRecipeIngredients, getRecipeById } from '../../data'; 
import { MenuRecipeFullData } from '@/types/recipes'; 
import { deleteRecipe } from '../../actions'; 
import { RecipesMenu } from '../../components/RecipesMenu';
import { getUserData } from '@/utils/security';
import { UnifiedAppSidebar } from '@/components/layout/UnifiedAppSidebar';

interface RecipeViewPageProps { 
    params: Promise<{ slug: string; id: string }> 
}

export default async function RecipeViewPage({ params }: RecipeViewPageProps) {
    const { slug, id } = await params; 
    
    if (!id || id === 'undefined') notFound();
    
    // 1. Seguridad centralizada
    const { profile, accessibleModules } = await getUserData('recipes');

    // 2. Carga paralela de datos (Usando data.ts para consistencia)
    const [recipeData, ingredients, categories] = await Promise.all([
        getRecipeById(id),
        getRecipeIngredients(id),
        getAllCategories(), 
    ]);
    
    if (!recipeData) notFound();

    // 3. Sanitización y preparación de objeto completo
    const recipe: MenuRecipeFullData = { 
        ...recipeData, 
        ingredients: ingredients || [],
        labels: Array.isArray(recipeData.labels) 
            ? (recipeData.labels as string[]).map(l => l.trim()).filter(Boolean) 
            : [],
    };
    
    const category = categories?.find(c => c.id === recipe.category_id);
    const totalTime = (recipe.prep_time_min || 0) + (recipe.cook_time_min || 0);

    return (
        <UnifiedAppSidebar
            title={recipe.name}
            profile={profile}
            modules={accessibleModules}
            // Prop corregida para navegación unificada
            backLink={`/recipes/${slug}`}
            moduleMenu={<RecipesMenu mode="operative" categories={categories} />}
            moduleSettings={<RecipesMenu mode="settings" categories={categories} />}
        >
            <main className="max-w-4xl mx-auto space-y-6">
                
                {/* Cabecera y Acciones Rápidas */}
                <header className="flex justify-between items-start">
                    <div className="space-y-1">
                        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                            {recipe.name}
                        </h1>
                        {category && (
                             <Badge variant="outline" className="text-indigo-600 border-indigo-100 bg-indigo-50/50">
                                {category.name}
                             </Badge>
                        )}
                    </div>
                    
                    <div className="flex gap-2 shrink-0">
                        <Button variant="outline" size="icon" asChild title="Editar receta">
                            <Link href={`/recipes/${slug}/${id}/edit`}>
                                <Edit className="w-5 h-5 text-indigo-600" />
                            </Link>
                        </Button>
                        
                        <form action={deleteRecipe}>
                            <input type="hidden" name="id" value={recipe.id} />
                            <input type="hidden" name="categorySlug" value={slug} />
                            <Button variant="outline" size="icon" type="submit" className="hover:bg-red-50 hover:text-red-600" title="Eliminar receta">
                                <Trash2 className="w-5 h-5" />
                            </Button>
                        </form>
                    </div>
                </header>

                {/* Grid de Metadatos */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Card className="shadow-sm border-slate-200">
                        <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                            <span className="font-semibold text-[10px] text-slate-500 uppercase tracking-wider mb-1">Tiempo</span>
                            <div className="flex items-center gap-1.5 text-base font-bold text-slate-900">
                                <Clock className="w-4 h-4 text-indigo-500" />
                                {totalTime > 0 ? `${totalTime} min` : 'N/A'}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-slate-200">
                        <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                            <span className="font-semibold text-[10px] text-slate-500 uppercase tracking-wider mb-1">Raciones</span>
                            <div className="flex items-center gap-1.5 text-base font-bold text-slate-900">
                                <User className="w-4 h-4 text-indigo-500" />
                                {recipe.servings || 1}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-slate-200 col-span-2">
                        <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                            <span className="font-semibold text-[10px] text-slate-500 uppercase tracking-wider mb-1">Fuente Original</span>
                            {recipe.source_url ? (
                                <a href={recipe.source_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:underline">
                                    <ExternalLink className="w-4 h-4" />
                                    Ver referencia externa
                                </a>
                            ) : (
                                <span className="text-sm font-bold text-slate-400 italic font-serif">Receta propia</span>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Etiquetas */}
                {recipe.labels && recipe.labels.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {recipe.labels.map((label, index) => (
                            <Badge key={index} variant="secondary" className="px-3 py-0.5 text-xs">
                                {label}
                            </Badge>
                        ))}
                    </div>
                )}
                
                {/* Contenido Detallado */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-1 shadow-sm border-slate-200">
                        <CardHeader className="pb-3 border-b border-slate-50">
                            <CardTitle className="text-lg">Ingredientes</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <ul className="space-y-4">
                                {recipe.ingredients.map((ing, index) => (
                                    <li key={index} className="flex items-start text-sm leading-snug">
                                        <div className="min-w-[70px] font-bold text-indigo-600">
                                            {ing.quantity} {ing.unit}
                                        </div>
                                        <div className="text-slate-700">
                                            {ing.name}
                                            {ing.notes && <span className="block text-[11px] text-slate-400 italic">{ing.notes}</span>}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>

                    <Card className="lg:col-span-2 shadow-sm border-slate-200">
                        <CardHeader className="pb-3 border-b border-slate-50">
                            <CardTitle className="text-lg">Preparación</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 whitespace-pre-wrap text-slate-700 leading-relaxed text-base">
                            {recipe.description || 'No hay descripción de los pasos registrada.'}
                        </CardContent>
                    </Card>
                </div>
            </main>
        </UnifiedAppSidebar>
    );
}