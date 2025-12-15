// app/menu-planner/components/MenuCategoriesSettings.tsx
'use client';

import React, { useState, ComponentPropsWithoutRef,Fragment } from 'react';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// Definición de props (usando ComponentPropsWithoutRef o tu interfaz estable)
interface MenuRecipeCategoriesSettingsProps {
  children: React.ReactElement<ComponentPropsWithoutRef<typeof DropdownMenuItem>>;
}

export default function MenuCategoriesSettings({ children }: MenuRecipeCategoriesSettingsProps) {
  const [isOpen, setOpen] = useState(false);
  
  // 🚨 HANDLER CREADO EN EL CLIENTE (Serialización segura)
  const handleSelect = (e: Event) => {
    setOpen(true);
  };
  
  // 🚨 CLONAMOS E INYECTAMOS EL HANDLER
  const trigger = React.cloneElement(
    children, 
    { 
      onSelect: handleSelect, // Inyectamos el handler (creado en el cliente)
      asChild: true 
    }
  );

  return (
    // 🚨 El Dialog es el wrapper, y el 'trigger' es el elemento clonado que lo abre
    <Fragment> 
            {trigger} 

      <Dialog open={isOpen} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
      <DialogTitle>Gestionar Categorías de Recetas</DialogTitle>
      </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-gray-500">
            Aquí podrás crear, editar y asignar colores/iconos a categorías como: Carnes, Pescados, Vegan, Rápido, etc.
          </p>
          <Button className="mt-4" onClick={() => toast.info('Funcionalidad de gestión de categorías en desarrollo.')}>
            Abrir CRUD de Categorías
          </Button>
        </div>
        
        </DialogContent>
      </Dialog>
    </Fragment>
  );
}