// app/menu-planner/components/MenuPlannerItemCell.tsx
'use client';

import React,{useState}from 'react';
import { MenuScheduleItem, MealType, TurnType,MenuPlannerItemCellProps, MenuPlanItemAutocompleteProps,SelectedMeal } from '@/types/menu-planner';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import MenuPlanItemAutocomplete from './MenuPlanItemAutocomplete'; // 🚨 Nuevo import


export default function MenuPlannerItemCell({ day, mealType, turnType, items }: MenuPlannerItemCellProps) {
  // Aquí se construirá la UI de la celda, incluyendo el modal de edición/autocompletado.
  const [isLoading, setIsLoading] = useState(false); // Para mostrar estado de guardado/carga
    
    // Obtener el plato principal para inicializar el autocompletado
    const primaryItem = items.find(item => item.order_in_meal === 1); 
    const initialName = primaryItem?.menu_recipes?.name || primaryItem?.free_text || null;

    // Función que se dispara cuando el usuario selecciona o introduce un valor
      const handleSelectMeal = async (selected: SelectedMeal) => {
        setIsLoading(true);
        // 🚨 Aquí llamamos a la Server Action para GUARDAR la planificación
        // (ej: saveMenuItem({day, mealType, turnType, selected}))
        console.log("Planificando:", selected); 
        
        // Simulación:
        await new Promise(resolve => setTimeout(resolve, 500)); 
        setIsLoading(false);
    };
  return (
    <div className="min-h-[100px] flex flex-col p-1">
      {items.length === 0 ? (
        <Button variant="ghost" size="sm" className="w-full h-8 text-gray-400 hover:text-indigo-600">
          <Plus className="w-4 h-4 mr-1" />
          Añadir {mealType === 'lunch' ? 'Comida' : 'Cena'}
        </Button>
      ) : (
        items.map(item => (
          <div key={item.id} className="text-sm border-b pb-1 mb-1">
            {item.free_text || item.menu_recipes?.name || 'Item sin nombre'}
          </div>
        ))
      )}
    </div>
  );
}