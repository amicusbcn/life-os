// app/menu-planner/components/MenuRecipesSettings.tsx
'use client';

import React, { Fragment,useState } from 'react';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface MenuRecipesSettingsProps {
  children: React.ReactElement; 
}

export default function MenuRecipesSettings({ children }: MenuRecipesSettingsProps) {
  const [isOpen, setOpen] = useState(false);
  return (
    <Fragment> 
      <Dialog open={isOpen} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[800px]"> {/* Usamos un modal más grande para recetas */}
          <DialogHeader>
            <DialogTitle>Libro de Recetas Digital</DialogTitle>
          </DialogHeader>
          
          {/* // --- Placeholder de Gestión de Recetas --- */}
          <div className="py-4">
            <p className="text-sm text-gray-500">
              Aquí gestionarás el detalle de cada receta: ingredientes, pasos, tiempos y enlaces externos.
            </p>
            <Button className="mt-4" onClick={() => toast.info('CRUD de Recetas en desarrollo.')}>
              Ir a Gestión de Recetas
            </Button>
          </div>
          
        </DialogContent>
      </Dialog>
    </Fragment>
  );
}