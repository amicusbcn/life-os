// app/inventory/[id]/components/ItemActionsMenu.tsx
// (Reutilizado como moduleMenu)

import { Fragment } from 'react';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Edit, Trash2 } from 'lucide-react';
import { ItemEditDialog } from './ItemEditDialog'; 
import { deleteInventoryItem } from '../../actions';
import { redirect } from 'next/navigation';
import { ItemDeleteForm } from './ItemDeleteForm';

interface ItemActionsMenuProps {
    item: any;
    categories: any[];
    locations: any[];
}

export async function ItemActionsMenu({ item, categories, locations }: ItemActionsMenuProps) {
    
    // Server Action para el borrado
    const handleDeleteAction = async () => {
        'use server'
        const photoPath = item.photo_path || null;
        await deleteInventoryItem(item.id, photoPath); 
        redirect('/inventory');
    };

    return (
        <Fragment>
            {/* 1. ÍTEM DE EDICIÓN: Componente Cliente en MODO WRAPPER */}
            <ItemEditDialog 
                item={item} 
                categories={categories} 
                locations={locations} 
                isOpen={undefined} 
                setOpen={undefined} 
            >
                {/* El DropdownMenuItem es el children que se clonará */}
                <DropdownMenuItem className="cursor-pointer">
                    <Edit className="mr-2 h-4 w-4" />
                    <span>Editar Item</span>
                </DropdownMenuItem>
            </ItemEditDialog>

            {/* 2. ÍTEM DE ELIMINAR (Server Action directa) */}
            <ItemDeleteForm 
                handleDeleteAction={handleDeleteAction} // Pasamos la Server Action como prop
                itemName={item.name}
            />
            {/* 3. SEPARADOR */}
            <DropdownMenuSeparator />
        </Fragment>
    );
}