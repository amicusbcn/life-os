// app/inventory/components/InventoryMenu.tsx (SERVER COMPONENT)

import { Fragment } from 'react';
import { Settings } from 'lucide-react';
import { DropdownMenuItem,DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { InventorySettingsDialog } from './InventorySettingsDialog'; 
import { InventoryMenuProps } from '@/types/inventory'; 

export async function InventoryMenu({ categories, locations }: InventoryMenuProps) {
    return (
        <Fragment>
            {/* 1. ÍTEM: Opción de configuración (ENVUELVE EL DIÁLOGO) */}
            <InventorySettingsDialog 
                categories={categories} 
                locations={locations} 
            >
                {/* 🚨 Este es el JSX que se clonará y se inyectará como TRIGGER */}
                <DropdownMenuItem className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" /> {/* Asumo que Settings viene de lucide-react */}
                    <span>Configurar Inventario</span>
                </DropdownMenuItem>
            </InventorySettingsDialog>
            
            {/* 2. SEPARADOR: Para aislar de los ítems CORE (Logout, etc.) */}
            <DropdownMenuSeparator />
        </Fragment>
    );
}