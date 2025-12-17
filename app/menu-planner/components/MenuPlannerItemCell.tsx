// app/menu-planner/components/MenuPlannerItemCell.tsx (Versión Final Corregida)

'use client';

import React from 'react';
import { MenuScheduleItem, MealType, TurnType, MenuRecipeSimple, MenuRecipeCategory } from '@/types/menu-planner';
import { Button } from '@/components/ui/button';
import { Plus, Pencil } from 'lucide-react';
import MenuPlanEditModal from './MenuPlanEditModal';

interface MenuPlannerItemCellProps {
    day: string;
    mealType: MealType;
    turnType: TurnType;
    items: MenuScheduleItem[]; // Array de ítems para esta celda
    allRecipes: MenuRecipeSimple[]; 
    allCategories: MenuRecipeCategory[];
}

// 🚨 FUNCIÓN DE AYUDA CORREGIDA: Ahora recibe 'items' como cuarto argumento.
const getRecipeDisplayTrigger = (item: MenuScheduleItem, allRecipes: MenuRecipeSimple[], index: number, items: MenuScheduleItem[]) => {
    const isOut = item.is_out;
    // Buscamos la receta completa si tenemos el ID
    const recipe = item.recipe_id ? allRecipes.find(r => r.id === item.recipe_id) : null;
    
    // Obtenemos los datos de la categoría para el color
    const categoryColor = recipe?.category_id?.color;
    const categoryName = recipe?.category_id?.name;
    
    // Determinamos el texto a mostrar
    const displayText = isOut ? 'Comer fuera' : item.free_text || recipe?.name || 'Plato sin nombre';

    return (
        <div 
            className={`
                text-sm p-1 my-0.5 rounded transition-colors duration-150 cursor-pointer 
                hover:bg-indigo-50/70 flex items-center group
                ${isOut ? 'text-red-500 italic bg-red-50 border border-red-200' : 'bg-white shadow-sm border border-gray-200'}
            `}
        >
            
            {/* ETIQUETA DE COLOR (Cuadro verde) */}
            {!isOut && (
                <div 
                    className="w-2 h-4 rounded-sm mr-2 flex-shrink-0" 
                    style={{ backgroundColor: categoryColor || '#ccc' }} 
                    title={`Categoría: ${categoryName || 'Sin Categoría'}`}
                />
            )}
            
            {/* TEXTO DEL PLATO */}
            <span className={`flex-1 truncate ${isOut ? 'line-through' : ''}`}>
                 {/* 🚨 CORRECCIÓN TS2552: 'items' es accesible aquí */}
                 {items.length > 1 ? `${index + 1}. ` : ''} 
                 {displayText}
            </span>

            {/* ICONO DE EDICIÓN FLOTANTE */}
            <Pencil className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0" />
        </div>
    );
};

export default function MenuPlannerItemCell({ day, mealType, turnType, items, allRecipes, allCategories }: MenuPlannerItemCellProps) {
    
    const isCellEmpty = items.length === 0;
    const isOutPlanned = items.some(item => item.is_out);
    return (
        <div className="min-h-[100px] flex flex-col p-1 relative">

            {/* 1. RENDERIZAR TODOS LOS PLATOS EXISTENTES */}
            {items.map((item: MenuScheduleItem, index: number) => {
                
                // 🚨 CORRECCIÓN TS2554: Pasamos el array 'items' completo
                const displayTrigger = getRecipeDisplayTrigger(item, allRecipes, index, items);

                return (
                    <MenuPlanEditModal 
                        key={item.id} 
                        day={day}
                        mealType={mealType}
                        turnType={turnType}
                        initialItems={[item]} 
                        triggerType={'edit'} 
                        allRecipes={allRecipes}
                        allCategories={allCategories}
                    >
                        {displayTrigger}
                    </MenuPlanEditModal>
                );
            })}

            {/* 2. BOTÓN DE ADICIÓN (Clave corregida) */}
            {!isOutPlanned && (
                <MenuPlanEditModal 
                    key={`add-${day}-${mealType}-${turnType}`}
                    day={day}
                    mealType={mealType}
                    turnType={turnType}
                    initialItems={[]}
                    triggerType={'add'}
                    allRecipes={allRecipes}
                    allCategories={allCategories}
                >
                    {/* Este es el botón de trigger para añadir un nuevo plato */}
                    <Button 
                        variant={isCellEmpty ? "outline" : "ghost"} 
                        size="sm" 
                        className={`
                            w-full h-8 mt-1
                            ${isCellEmpty ? 'text-gray-500 hover:border-indigo-400' : 'text-indigo-600 hover:bg-indigo-50/50'}
                        `}
                    >
                        <Plus className="w-4 h-4 mr-1" />
                        {isCellEmpty ? `Añadir ${mealType === 'lunch' ? 'Comida' : 'Cena'}` : 'Añadir plato +'}
                    </Button>
                </MenuPlanEditModal>
            )}
        </div>
    );
}