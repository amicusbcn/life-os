// app/menu-planner/components/EditScheduleItemForm.tsx

'use client';

import { useState } from 'react';
import { MenuScheduleItem, MenuRecipeSimple, MenuRecipeCategory, TurnType, MealType } from '@/types/menu-planner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { upsertScheduleItem } from '@/app/menu-planner/actions';
import { toast } from 'sonner';

import MenuPlanItemAutocomplete from './MenuPlanItemAutocomplete'; 

interface EditScheduleItemFormProps {
    scheduleDate: string;
    mealType: MealType;
    turnType: TurnType;
    initialItems: MenuScheduleItem[];
    allRecipes: MenuRecipeSimple[];
    allCategories: MenuRecipeCategory[];
    onFinished: (refreshNeeded: boolean) => void;
}

const DEFAULT_ITEM: MenuScheduleItem = {
    id: 'new', 
    schedule_id: 'temp',
    meal_type: 'lunch', 
    turn_type: 'adults', 
    order_in_meal: 1,
    recipe_id: null, 
    free_text: null, 
    is_out: false,
};

export default function EditScheduleItemForm({
    scheduleDate,
    mealType,
    turnType,
    initialItems,
    allRecipes,
    allCategories,
    onFinished,
}: EditScheduleItemFormProps) {
    
    const primaryItem = initialItems[0] || DEFAULT_ITEM; 
    
    const initialInput = primaryItem.recipe_id || primaryItem.free_text || null;

    const [recipeId, setRecipeId] = useState<string | undefined | null>(primaryItem.recipe_id);
    // CRÍTICO: Estado para guardar el texto escrito por el usuario
    const [queryText, setQueryText] = useState<string | null>(primaryItem.free_text || null); 
    
    const [isOut, setIsOut] = useState<boolean>(primaryItem.is_out || false);
    const [isPending, setIsPending] = useState(false);
    
    // CRÍTICO: Acepta ID y el texto de la query
    const handleAutocompleteSelect = (newRecipeId: string | null, currentQuery: string | null) => {
        setRecipeId(newRecipeId);
        setQueryText(currentQuery);
    };

    const handleIsOutChange = (checked: boolean | 'indeterminate') => {
        const newIsOut = !!checked;
        setIsOut(newIsOut);
        if (newIsOut) {
            setRecipeId(null);
            setQueryText(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsPending(true);

        const formData = new FormData();
        
        // Datos de slot/contexto
        formData.append('scheduleDate', scheduleDate);
        formData.append('turnType', turnType);
        formData.append('mealType', mealType);
        
        // CRÍTICO: Enviamos 'new' o el ID real
        const itemToSubmitId = primaryItem.id === 'new' ? 'new' : primaryItem.id;
        formData.append('itemId', itemToSubmitId); 

        // Solo enviamos orderInMeal si NO es una inserción nueva (UPDATE)
        if (itemToSubmitId !== 'new') {
            formData.append('orderInMeal', primaryItem.order_in_meal.toString());
        } else {
             // Marcador para que la Server Action sepa que debe calcularlo
            formData.append('orderInMeal', '1'); 
        }

        // Datos de contenido
        formData.append('isOut', isOut ? 'true' : 'false');
        
        // 1. Enviamos el ID de la receta seleccionada
        formData.append('recipeId', recipeId || '');
        
        // 2. CRÍTICO: Si no hay ID de receta, enviamos el texto para que el backend lo cree.
        const unresolvedText = (!recipeId && queryText && queryText.trim() !== '') ? queryText.trim() : null;
        formData.append('unresolvedText', unresolvedText || '');


        const result = await upsertScheduleItem(formData);
        
        setIsPending(false);

        if (result.success) {
            toast.success('Plato planificado correctamente.');
            onFinished(true); 
        } else {
            toast.error(result.error || 'Error desconocido al guardar la planificación.');
            onFinished(false); 
        }
    };

    const currentRecipe = recipeId && allRecipes.find(r => r.id === recipeId);

    return (
        <form onSubmit={handleSubmit} className="space-y-4 h-full flex flex-col">
            
            {/* 1. Opción: Comer fuera de casa */}
            <div className="flex items-center space-x-2 p-3 bg-red-50/50 rounded-md">
                <Checkbox 
                    id="isOut" 
                    checked={isOut} 
                    onCheckedChange={handleIsOutChange}
                />
                <Label htmlFor="isOut" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    ¿Coméis/Cenáis fuera de casa? (Marca esto para no planificar)
                </Label>
            </div>

            {/* 2. Autocompletar Unificado (Solo si no comemos fuera) */}
            {!isOut && (
                <div className="space-y-2 pt-4 flex-1">
                    <Label htmlFor="meal-input">Elige o escribe tu plato (Se creará como Receta si no existe)</Label>
                    <MenuPlanItemAutocomplete
                        initialValue={initialInput}
                        onSelect={handleAutocompleteSelect}
                        allRecipes={allRecipes}
                    />
                    
                    {currentRecipe && (
                        <p className="text-sm text-indigo-600 mt-1">
                            Receta seleccionada: {currentRecipe.name}
                        </p>
                    )}
                    
                    {(!currentRecipe && queryText && queryText.trim() !== '') && (
                        <p className="text-sm text-gray-500 mt-1 italic">
                           **Creando placeholder:** Se guardará "{queryText.trim()}" como una nueva Receta en tu libro.
                        </p>
                    )}
                </div>
            )}
            
            <div className="flex justify-end pt-4 border-t border-gray-100">
                <Button type="submit" disabled={isPending}>
                    {isPending ? 'Guardando...' : 'Guardar Planificación'}
                </Button>
            </div>
        </form>
    );
}