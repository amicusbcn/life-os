// app/recipes/components/CategoryHub.tsx
'use client';

import { MenuRecipeCategory } from '@/types/recipes';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Utensils, Tag, Soup, Fish, Leaf, Drumstick, Cake } from 'lucide-react';
import Link from 'next/link';
import LoadIcon from '@/utils/LoadIcon';

interface CategoryHubProps {
    categories: MenuRecipeCategory[];
    // Función para manejar el clic y cambiar el filtro en el padre (page.tsx)
    onSelectCategory: (categoryId: string) => void; 
}

export default function CategoryHub({ categories, onSelectCategory }: CategoryHubProps) {

    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-bold text-slate-700">Explora las Recetas por Categoría</h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {categories.map(category => {
                    // El campo 'icon' de la BBDD es el nombre del icono de Lucide (ej: 'Fish')
                    const iconName = category.icon || 'Utensils'; 

                    return (
                        <Card 
                            key={category.id} 
                            onClick={() => onSelectCategory(category.id)}
                            className="hover:shadow-xl transition-all duration-300 cursor-pointer h-36 flex flex-col justify-center items-center border-slate-200"
                        >
                            <CardContent className="flex flex-col items-center p-4">
                                <div 
                                    className="p-3 rounded-full mb-3"
                                    style={{ backgroundColor: category.color || '#ccc' }} 
                                >
                                    {/* 🚨 USAMOS EL COMPONENTE DINÁMICO */}
                                    <LoadIcon 
                                        name={iconName}
                                        className="h-8 w-8 text-white" 
                                    />
                                </div>
                                <CardTitle className="text-lg text-center leading-tight">
                                    {category.name} - {iconName}
                                </CardTitle>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <div className="text-center pt-8">
                <button onClick={() => onSelectCategory('all')} className="text-indigo-600 hover:text-indigo-800 underline font-medium">
                    Ver todas las recetas sin filtrar
                </button>
            </div>
        </div>
    );
}