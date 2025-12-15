// app/menu-planner/components/MenuPlanEditModal.tsx
'use client'; // 🚨 ESENCIAL: Este debe ser un componente cliente

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle,DialogTrigger } from '@/components/ui/dialog';
import { Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';

import EditScheduleItemForm from './EditScheduleItemForm'; 
import { MenuScheduleItem, MealType, TurnType, MenuRecipeSimple, MenuRecipeCategory } from '@/types/menu-planner'; 

interface MenuPlanEditModalProps {
  day: string;
  mealType: MealType;
  turnType: TurnType;
  initialItems: MenuScheduleItem[];
  triggerType: 'edit' | 'add';
  allRecipes: MenuRecipeSimple[]; 
  allCategories: MenuRecipeCategory[]; 
  children: React.ReactNode;
}

// 🚨 EXPORTACIÓN POR DEFECTO REQUERIDA (Resuelve TS1192)
export default function MenuPlanEditModal({ 
  day, 
  mealType, 
  turnType, 
  initialItems, 
  triggerType,
  allRecipes,
  allCategories,
  children
}: MenuPlanEditModalProps) {
  
  const [isOpen, setIsOpen] = useState(false);
  
  const isEdit = triggerType === 'edit';
  const buttonText = isEdit ? 'Detalles' : `Añadir ${mealType === 'lunch' ? 'Comida' : 'Cena'}`;
  const Icon = isEdit ? Pencil : Plus;
  const dialogTitle = (
      <>
        Planificación: {day} <br/> 
        ({mealType === 'lunch' ? 'Comida' : 'Cena'} - {turnType === 'adults' ? 'Adultos' : 'Niños'})
      </>
    );
  const handleFinished = (refreshNeeded: boolean = false) => {
    setIsOpen(false);
    
    if (refreshNeeded) {
        toast.success("Planificación actualizada.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild> 
                {children}
            </DialogTrigger>
      <DialogContent className="sm:max-w-xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
          {/* 🚨 Aquí es donde se usa el Formulario (EditScheduleItemForm) */}
          <EditScheduleItemForm
            scheduleDate={day}
            mealType={mealType}
            turnType={turnType}
            initialItems={initialItems}
            allRecipes={allRecipes}
            allCategories={allCategories}
            onFinished={handleFinished}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}