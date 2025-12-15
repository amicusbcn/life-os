  // app/menu-planner/components/MenuCategoriesSettings.tsx
'use client'

import React, { useState, Fragment } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
// Importa otros componentes UI o actions necesarios

// Definición de Props para el clon.
interface CloneableElementProps {
		onSelect?: (e: Event) => void; 
		onClick?: (e: React.MouseEvent) => void;
}

// 🚨 Asegúrate de que este componente esté exportado como default si MenuPlannerMenu lo usa así.
export default function MenuCategoriesSettings({ children, /* otras props como categorías */ }: { children: React.ReactNode, /* ... */ }) {
		const [open, setOpen] = useState(false);

    // 🚨 Aserción de tipo para el elemento hijo
		const childElement = children as React.ReactElement<CloneableElementProps>;

    // 🚨 Lógica de prevención de cierre
		const newOnSelect = (e: Event) => {
				// 1. Prevenir el comportamiento por defecto de 'onSelect' (CERRAR EL MENÚ)
				e.preventDefault(); 
				
				// 2. Ejecutar el onSelect original si existía
				const originalOnSelect = (childElement.props as CloneableElementProps).onSelect;
				if (typeof originalOnSelect === 'function') {
						originalOnSelect(e);
				}
				
				// 3. Abrir el diálogo
				setOpen(true);
		};

    // 🚨 Clonamos el child para inyectarle el nuevo onSelect
		const trigger = React.cloneElement(childElement, {
				onSelect: newOnSelect,
				// Opcional: También previene el onClick para mayor seguridad
				onClick: (e: React.MouseEvent) => e.stopPropagation(), 
		} as React.PropsWithChildren<CloneableElementProps>);


		return (
				<Fragment>
						{/* 🚨 RENDERIZA EL TRIGGER CLONADO Y EL DIALOG COMO HERMANOS */}
						{trigger} 
						<Dialog open={open} onOpenChange={setOpen}>
								<DialogContent className="sm:max-w-[425px]">
										<DialogHeader>
												<DialogTitle>Gestionar Categorías</DialogTitle>
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