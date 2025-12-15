// app/menu-planner/components/MenuRecipesSettings.tsx
'use client';

import React, { Fragment,useState } from 'react';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// Definición de Props para el clon.
interface CloneableElementProps {
		onSelect?: (e: Event) => void; 
		onClick?: (e: React.MouseEvent) => void;
}

interface MenuRecipesSettingsProps {
	// El children será el DropdownMenuItem
	children: React.ReactElement<CloneableElementProps>; 
}

export default function MenuRecipesSettings({ children }: MenuRecipesSettingsProps) {
	const [isOpen, setOpen] = useState(false);
	
	// 🚨 Lógica de prevención de cierre
	const newOnSelect = (e: Event) => {
			// 1. Prevenir el comportamiento por defecto de 'onSelect' (CERRAR EL MENÚ)
			e.preventDefault(); 
			
			// 2. Ejecutar el onSelect original si existía
			const originalOnSelect = children.props.onSelect;
			if (typeof originalOnSelect === 'function') {
					originalOnSelect(e);
			}
			
			// 3. Abrir el diálogo
			setOpen(true);
	};

	// 🚨 Clonamos el child para inyectarle el nuevo onSelect
	const trigger = React.cloneElement(children, {
			onSelect: newOnSelect,
			// También previene el onClick para mayor seguridad
			onClick: (e: React.MouseEvent) => e.stopPropagation(), 
	});

	return (
		<Fragment> 
			{/* 🚨 RENDERIZA EL TRIGGER CLONADO Y EL DIALOG COMO HERMANOS */}
			{trigger} 
			<Dialog open={isOpen} onOpenChange={setOpen}>
				<DialogContent className="sm:max-w-[800px]"> 
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