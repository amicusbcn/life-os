// app/recipes/components/CategoryHub.tsx
'use client';

import { MenuRecipeCategory } from '@/types/recipes';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Utensils, FolderOpen } from 'lucide-react'; // Usamos FolderOpen como fallback
import Link from 'next/link'; // 🚨 IMPORTANTE: Usamos Next Link
import LoadIcon from '@/utils/LoadIcon'; // Componente dinámico de iconos

// 🚨 MODIFICACIÓN: Ya no se necesita onSelectCategory
interface CategoryHubProps {
	// Asumimos que MenuRecipeCategory ahora tiene el campo 'slug' y 'recipeCount' (o se lo pasamos)
    categories: (MenuRecipeCategory & { recipeCount: number })[];
}

export default function CategoryHub({ categories }: CategoryHubProps) {

    // Helper para generar el color del texto del icono (mejorando la legibilidad)
    const getTextColor = (bgColor: string): string => {
        // Esto es una simplificación: si el color de fondo es muy claro, usar color oscuro
        if (bgColor && bgColor.includes('#f') || bgColor.includes('#e')) {
            return 'text-slate-800'; 
        }
        return 'text-white';
    };

	return (
		<div className="space-y-8">
			<h2 className="text-2xl font-bold text-slate-700">Explora las Recetas por Categoría</h2>

			<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
				{categories.map(category => {
					const iconName = category.icon || 'Utensils'; 
                    const recipeCount = category.recipeCount || 0; // Usar el conteo real
                    const bgColor = category.color || '#94a3b8'; // Color de fondo de la BBDD
                    const iconTextColor = getTextColor(bgColor);

					return (
						<Link 
							key={category.id} 
                            // 🚨 Navegación directa al SLUG
							href={`/recipes/${category.slug}`} 
							className="block hover:shadow-xl transition-all duration-300 h-40 flex flex-col justify-between p-5 border-2 border-slate-200 rounded-lg bg-white"
						>
                            {/* --- DISEÑO MEJORADO: Icono y Conteo prominente --- */}
                            <div className="flex justify-between items-start">
								<div 
									className={`p-3 rounded-xl`}
									style={{ backgroundColor: bgColor }} 
								>
									<LoadIcon 
										name={iconName}
										className={`h-6 w-6 ${iconTextColor}`} 
									/>
								</div>
                                
                                <div className="text-right">
                                    <span className="block text-4xl font-black text-slate-800 tracking-tight">
                                        {recipeCount}
                                    </span>
                                    <span className="block text-xs text-slate-500 font-semibold">
                                        {recipeCount === 1 ? 'Receta' : 'Recetas'}
                                    </span>
                                </div>
                            </div>
                            {/* --- Título en la parte inferior --- */}
							<div className="mt-4">
								<h3 className="text-lg font-bold text-slate-900 leading-tight">
									{category.name}
								</h3>
							</div>
						</Link>
					);
				})}
			</div>

			{/* 🚨 El botón "Ver todas las recetas sin filtrar" se quita ya que la navegación debe ser por Link/URL */}
            <div className="text-center pt-8">
                <Link href="/recipes/all" className="text-indigo-600 hover:text-indigo-800 underline font-medium">
					Ver todas las recetas sin filtrar
				</Link>
            </div>

		</div>
	);
}