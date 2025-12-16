// app/recipes/components/RecipeCreateForm.tsx (CORRECCIÓN CRÍTICA DE EDICIÓN)
'use client';

import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Plus, Trash2, Save } from 'lucide-react';
import { useState } from 'react';
import { MenuRecipeCategory, MenuRecipeIngredient,MenuRecipeFullData } from '@/types/recipes';
import { saveRecipe } from '../actions'; // saveRecipe ahora maneja INSERT/UPDATE
import { useRouter } from 'next/navigation';

// --- Constantes de Unidades Comunes ---
const COMMON_UNITS = ['g', 'ml', 'unidad', 'cucharada', 'cucharadita', 'pizca'];

// --- Definición del Esquema del Formulario (Añadimos 'id' y ajustamos tipos para RHF) ---
interface RecipeFormInput {
	id?: string; // 🚨 AÑADIDO: ID para el modo Edición
	name: string;
	description: string; // 🚨 AJUSTADO: debe ser string para el textarea
	prep_time_min: number; // 🚨 AJUSTADO: debe ser number para RHF
	cook_time_min: number; // 🚨 AJUSTADO: debe ser number para RHF
	servings: number; // 🚨 AJUSTADO: debe ser number para RHF
	image_url: string; // 🚨 AJUSTADO: debe ser string para el input
	source_url: string; // 🚨 AJUSTADO: debe ser string para el input
	category_id: string | null;
	labels: string; 
	ingredients: MenuRecipeIngredient[];
}

interface RecipeCreateFormProps {
	categories: MenuRecipeCategory[];
	initialData?: MenuRecipeFullData; // Receta cargada
}

export default function RecipeCreateForm({ categories, initialData }: RecipeCreateFormProps) { // 🚨 Usar initialData en props
	const router = useRouter();
	const [isSubmitting, setIsSubmitting] = useState(false);
    
    const isEditing = !!initialData?.id; // 🚨 Detectar modo Edición

	// 🚨 CORRECCIÓN CRÍTICA: Mapeo de initialData a defaultValues
	const { 
		register, 
		control, 
		handleSubmit, 
		formState: { errors } 
	} = useForm<RecipeFormInput>({
		defaultValues: initialData ? {
            // Campos base y Conversión de null -> valor seguro
            id: initialData.id,
			name: initialData.name,
			description: initialData.description || '',
			
            // Campos numéricos (null -> 0 o 1)
			prep_time_min: initialData.prep_time_min || 0,
			cook_time_min: initialData.cook_time_min || 0,
			servings: initialData.servings || 1,
            
            // URLs
			image_url: initialData.image_url || '',
			source_url: initialData.source_url || '',
            
            // Labels: Convertir Array<string> (DB) a String (Form input)
			labels: Array.isArray(initialData.labels) ? initialData.labels.join(', ') : initialData.labels || '',

			category_id: initialData.category_id || null,
			
            // Ingredientes
			ingredients: initialData.ingredients || [{ name: '', quantity: 1, unit: 'unidad', notes: null } as MenuRecipeIngredient]
		} : {
			// Valores por defecto para la creación
			name: '', description: '', prep_time_min: 0, cook_time_min: 0, servings: 1, 
            image_url: '', source_url: '', category_id: null, labels: '',
			ingredients: [
				{ name: '', quantity: 1, unit: 'unidad', notes: null } as MenuRecipeIngredient
			],
		} as RecipeFormInput, // Forzar el cast final
	});

	// Control dinámico de los campos de ingredientes
	const { fields, append, remove } = useFieldArray({
		control,
		name: 'ingredients',
	});


	// --- Función de Envío ---
	const onSubmit: SubmitHandler<RecipeFormInput> = async (data) => {
		setIsSubmitting(true);
		
		const formData = new FormData();
		
		// 🚨 CRÍTICO: Añadir el ID si estamos editando
        if (isEditing && data.id) {
            formData.append('id', data.id); 
        }

		// 1. Añadir campos básicos de la receta
		Object.entries(data).forEach(([key, value]) => {
			// Excluimos ingredientes y nulls
            if (key !== 'ingredients' && value !== null && value !== undefined) {
				formData.append(key, String(value));
			}
		});
		
		// 2. Serializar el array de ingredientes a JSON
		const validIngredients = data.ingredients.filter(ing => ing.name && ing.quantity! > 0);
		formData.append('ingredients_json', JSON.stringify(validIngredients));

		const result = await saveRecipe(formData); // saveRecipe ya maneja INSERT/UPDATE
		setIsSubmitting(false);

		if (result.success && result.recipeId) {
            // Si creamos, redirigimos a la edición, si editamos, recargamos
            if (!isEditing) {
			    router.push(`/recipes/${result.recipeId}/edit`); 
            } else {
                router.refresh(); // Recarga los datos de la misma página de edición
                alert('Receta actualizada con éxito.');
            }
		} else {
			alert(`Error al guardar: ${result.error}`);
		}
	};


	return (
		<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* 🚨 CRÍTICO: Campo oculto para el ID si estamos editando */}
            {isEditing && (
                <input type="hidden" id="id" {...register('id')} value={initialData.id} /> 
            )}
            
            <h1 className="text-3xl font-bold mb-6 text-slate-900">
                {isEditing ? `Editar Receta: ${initialData?.name}` : 'Crear Nueva Receta'}
            </h1>

			{/* 🚨 1. SECCIÓN PRINCIPAL */}
			<Card>
				<CardHeader>
					<CardTitle>Detalles de la Receta</CardTitle>
					<CardDescription>Información esencial, tiempos y raciones.</CardDescription>
				</CardHeader>
				<CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
					
					{/* Nombre */}
					<div className="md:col-span-3">
						<label htmlFor="name" className="text-sm font-medium">Nombre de la Receta *</label>
						<Input id="name" {...register('name', { required: true })} className="mt-1" placeholder="Ej: Curry de Garbanzos y Espinacas" />
						{errors.name && <p className="text-xs text-red-500 mt-1">El nombre es obligatorio.</p>}
					</div>

					{/* Descripción */}
					<div className="md:col-span-3">
						<label htmlFor="description" className="text-sm font-medium">Descripción/Pasos *</label>
						<Textarea id="description" {...register('description')} rows={4} className="mt-1" placeholder="Describe brevemente la receta o añade los pasos." />
					</div>

					{/* Tiempos y Raciones (3 Columnas) */}
					<div>
						<label htmlFor="prep_time_min" className="text-sm font-medium">Preparación (min)</label>
						<Input id="prep_time_min" type="number" {...register('prep_time_min', { valueAsNumber: true })} className="mt-1" placeholder="0" />
					</div>
					<div>
						<label htmlFor="cook_time_min" className="text-sm font-medium">Cocción (min)</label>
						<Input id="cook_time_min" type="number" {...register('cook_time_min', { valueAsNumber: true })} className="mt-1" placeholder="0" />
					</div>
					<div>
						<label htmlFor="servings" className="text-sm font-medium">Raciones</label>
						<Input id="servings" type="number" {...register('servings', { valueAsNumber: true })} className="mt-1" placeholder="1" />
					</div>

					{/* URL Fuente y Imagen (2 Columnas) */}
					<div className="md:col-span-2">
						<label htmlFor="source_url" className="text-sm font-medium">URL de la Fuente</label>
						<Input id="source_url" {...register('source_url')} className="mt-1" placeholder="https://..." />
					</div>
					<div>
						<label htmlFor="image_url" className="text-sm font-medium">URL de la Imagen</label>
						<Input id="image_url" {...register('image_url')} className="mt-1" placeholder="https://..." />
					</div>
					
					{/* Selector de Categoría y Etiquetas (2 Columnas) */}
					<div>
						<label htmlFor="category_id" className="text-sm font-medium">Categoría</label>
						<select id="category_id" {...register('category_id')} className="mt-1 block w-full p-2 border border-input rounded-md">
							<option value="">-- Seleccionar Categoría --</option>
							{categories.map(cat => (
								<option key={cat.id} value={cat.id}>{cat.name}</option>
							))}
						</select>
					</div>
					<div>
						<label htmlFor="labels" className="text-sm font-medium">Etiquetas (Separadas por coma)</label>
						<Input id="labels" {...register('labels')} className="mt-1" placeholder="Ej: rápida, vegetariana, batch-cooking" />
					</div>
				</CardContent>
			</Card>

			{/* 🚨 2. SECCIÓN INGREDIENTES REFINADA */}
			<Card>
                {/* ... (Sección Ingredientes se mantiene) ... */}
				<CardHeader>
					<CardTitle>Ingredientes</CardTitle>
					<CardDescription>Define la cantidad y unidad para cada componente.</CardDescription>
				</CardHeader>
				<CardContent>
					
					{/* Encabezado de la tabla de ingredientes */}
					<div className="grid grid-cols-10 gap-2 font-semibold text-sm text-gray-600 border-b pb-2 mb-2">
						<span className="col-span-4">Ingrediente *</span>
						<span className="col-span-2">Cantidad *</span>
						<span className="col-span-2">Unidad</span>
						<span className="col-span-1">Notas</span>
						<span className="col-span-1"></span> {/* Columna de acción */}
					</div>
					
					<div className="space-y-3">
						{fields.map((field, index) => (
							<div key={field.id} className="grid grid-cols-10 gap-2 items-start">
								
								{/* Ingrediente */}
								<div className="col-span-4">
									<Input 
										placeholder="Ej: Harina de trigo" 
										{...register(`ingredients.${index}.name` as const, { required: false })}
									/>
								</div>
								
								{/* Cantidad */}
								<div className="col-span-2">
									<Input 
										type="number" 
										placeholder="0" 
										step="0.01"
										{...register(`ingredients.${index}.quantity` as const, { valueAsNumber: true })}
									/>
								</div>

								{/* Unidad (Selector + Input Text) */}
								<div className="col-span-2 flex gap-1">
									<select 
										{...register(`ingredients.${index}.unit` as const)}
										className="block w-2/5 p-2 border border-input rounded-md text-sm"
									>
										{COMMON_UNITS.map(unit => (
											<option key={unit} value={unit}>{unit}</option>
										))}
									</select>
									<Input 
										placeholder="Otro" 
										{...register(`ingredients.${index}.unit` as const)}
										className="w-3/5"
									/>
								</div>
								
								{/* Notas (Pequeño Textarea para multi-línea) */}
								<div className="col-span-1">
									<Input
										placeholder="Notas"
										{...register(`ingredients.${index}.notes` as const)}
									/>
								</div>

								{/* Botón Borrar */}
								<div className="col-span-1 flex justify-end">
									<Button 
										type="button" 
										variant="ghost" 
										size="icon" 
										onClick={() => remove(index)}
										className="text-gray-400 hover:text-red-500"
									>
										<Trash2 className="w-4 h-4" />
									</Button>
								</div>
							</div>
						))}
						
						{/* Botón Añadir */}
						<Button 
							type="button" 
							variant="outline" 
							onClick={() => append({ name: '', quantity: 1, unit: 'unidad', notes: null } as MenuRecipeIngredient)} 
							className="mt-4"
						>
							<Plus className="w-4 h-4 mr-2" />
							Añadir Ingrediente
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* 🚨 3. ACCIONES DEL FORMULARIO */}
			<div className="flex justify-end pt-4">
				<Button type="submit" disabled={isSubmitting}>
					{isSubmitting ? (
						<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					) : (
						<Save className="mr-2 h-4 w-4" />
					)}
					{isSubmitting ? 'Guardando...' : (isEditing ? 'Actualizar Receta' : 'Guardar Receta')}
				</Button>
			</div>
		</form>
	);
}