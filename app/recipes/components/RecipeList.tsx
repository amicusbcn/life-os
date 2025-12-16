// app/recipes/components/RecipeList.tsx (Actualizado para Slugs)
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
// 🚨 NO NECESITAMOS HOOKS DE NAVEGACIÓN, ya que usamos Link y las props
// import { useRouter, usePathname, useSearchParams } from 'next/navigation'; 
import { MenuRecipeWithDetails, MenuRecipeCategory } from '@/types/recipes';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'; 
import { Search, Utensils, Filter, X, FolderOpen, ArrowLeft } from 'lucide-react';

import RecipeCard from './RecipeCard'; 

// 🚨 ACTUALIZACIÓN DE INTERFAZ DE PROPS
interface RecipeListProps {
	initialRecipes: MenuRecipeWithDetails[];
	categories: MenuRecipeCategory[];
    // 🚨 Nueva prop requerida: ID de la categoría activa para resaltar
	initialActiveCategoryId: string | null; 
    // 🚨 La prop onBackToHub ya no es necesaria, pero la ponemos para que no haya error
    // Si la usas internamente, elimínala del uso en el componente, pero la dejamos para evitar un error de prop
	slug: string; 
}

// 🚨 Cambiamos las props y eliminamos los hooks de navegación innecesarios
export default function RecipeList({ initialRecipes, categories, initialActiveCategoryId,slug }: RecipeListProps) {
	const [searchTerm, setSearchTerm] = useState('');
	
	// 🚨 Usamos la prop activa pasada por el Server Component
	const activeCategoryId = initialActiveCategoryId; 
	const [isSheetOpen, setIsSheetOpen] = useState(false);

	// La bandera es necesaria para el filtrado, pero el filtrado ya se hizo en el Server Component
	// Mantenemos la lógica de filtrado aquí solo para la búsqueda por texto (searchTerm)
	const isFixedCategoryMode = activeCategoryId && activeCategoryId !== 'all';

	// Lógica de Búsqueda de Texto (El filtro de Categoría ya viene hecho)
	const filteredRecipes = useMemo(() => {
		let recipes = initialRecipes;

		if (searchTerm) {
			const lowerCaseSearch = searchTerm.toLowerCase();
			recipes = recipes.filter(recipe => {
				const matchesName = recipe.name.toLowerCase().includes(lowerCaseSearch);
				const matchesDescription = recipe.description?.toLowerCase().includes(lowerCaseSearch) || false;
				// Aseguramos que labels es un array antes de usar some
				const matchesLabels = Array.isArray(recipe.labels) && recipe.labels.some(label => 
					label.toLowerCase().includes(lowerCaseSearch)
				);
				return matchesName || matchesDescription || matchesLabels;
			});
		}
		return recipes;
	}, [initialRecipes, searchTerm]); // Eliminamos activeCategoryId de dependencies

	const currentCategory = activeCategoryId && activeCategoryId !== 'all'
		? categories.find(c => c.id === activeCategoryId)?.name 
		: 'Todas las Recetas';

	

	// 🚨 Componente del Panel de Filtros (Ajustado para usar Link a SLUG)
	const GeneralFilterPanel = () => (
		<div className="space-y-4">
			<h3 className="text-lg font-bold text-slate-700 mb-3">Filtrar por Categoría</h3>
			
            {/* 🚨 NAVEGACIÓN: Volver al Hub principal /recipes */}
            <Link href="/recipes" className="block">
				<Button
					variant="secondary"
					className="w-full text-left justify-start mb-4"
				>
					<ArrowLeft className="w-4 h-4 mr-2" /> Volver al Hub
				</Button>
            </Link>
            
            {/* 🚨 NAVEGACIÓN: Opción "Todas las recetas" */}
            <Link href="/recipes/all" className="block">
                <div
                    onClick={() => setIsSheetOpen(false)} // Cerrar Sheet al navegar
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
                    // 🚨 NAVEGACIÓN: Link a la ruta amigable /recipes/[slug]
					<Link 
                        href={`/recipes/${category.slug}`} 
                        key={category.id} 
                        className="block"
                    >
						<div
                            onClick={() => setIsSheetOpen(false)} // Cerrar Sheet al navegar
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

	return (
		<div className="flex">
			
			{/* 1. COLUMNA IZQUIERDA: Filtro (Desktop) */}
			<aside className={`hidden md:block w-64 flex-shrink-0 mr-6`}>
				<Card className="p-4 shadow-md sticky top-6">
					{GeneralFilterPanel()}
				</Card>
			</aside>

			{/* 2. COLUMNA DERECHA: Contenido */}
			<div className={`flex-1 space-y-4`}>
				
				{/* Cabecera Móvil y Escritorio */}
				<div className="flex justify-between items-center mb-4">
					<h3 className="text-xl font-semibold text-slate-700 flex-shrink-0 mr-4">
						{currentCategory} 
						<span className='ml-3 text-base font-normal text-gray-500'>
							({filteredRecipes.length})
						</span>
					</h3>

					{/* Botón de Filtro (Mobile/Tablet) */}
					<Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                        <SheetTrigger>
							<Button variant="outline" className="md:hidden flex items-center gap-1">
								<Filter className="w-4 h-4" />
								Categorías
							</Button>
                        </SheetTrigger>
						<SheetContent side="left" className="w-[280px] sm:w-[350px] p-4 pt-12">
							<div className="pt-4">
								{GeneralFilterPanel()}
							</div>
						</SheetContent>
					</Sheet>
				</div>
				
				{/* Barra de Búsqueda (Se mantiene) */}
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


				{/* Lista de Recetas (Se mantiene) */}
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