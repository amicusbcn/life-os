// app/menu-planner/components/MenuPlannerItemCell.tsx
'use client';

import React from 'react';
import { MenuScheduleItem, MealType, TurnType } from '@/types/menu-planner';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface MenuPlannerItemCellProps {
  day: string; // Formato YYYY-MM-DD
  mealType: MealType;
  turnType: TurnType;
  items: MenuScheduleItem[]; // Items de planificación para esta celda
}

export default function MenuPlannerItemCell({ day, mealType, turnType, items }: MenuPlannerItemCellProps) {
  // Aquí se construirá la UI de la celda, incluyendo el modal de edición/autocompletado.

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