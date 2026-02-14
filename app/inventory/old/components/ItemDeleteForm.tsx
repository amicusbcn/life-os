// app/inventory/[id]/components/ItemDeleteForm.tsx (NUEVO CLIENT COMPONENT)
'use client'

import React, { useRef } from 'react';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Trash2 } from 'lucide-react';

interface ItemDeleteFormProps {
    handleDeleteAction: () => Promise<void>;
    itemName: string;
}

export function ItemDeleteForm({ handleDeleteAction, itemName }: ItemDeleteFormProps) {
    const formRef = useRef<HTMLFormElement>(null);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        // 1. Prevenir el envío inicial del formulario
        event.preventDefault();

        // 2. Ejecutar la lógica interactiva (Cliente)
        if (confirm(`¿Estás seguro de que quieres eliminar ${itemName}? Esta acción es irreversible.`)) {
            // 3. Si se confirma, llamamos a la Server Action
            handleDeleteAction(); 
        }
    };

    return (
        <form ref={formRef} onSubmit={handleSubmit}>
            <button type="submit" className="w-full">
                {/* Usamos DropdownMenuItem como trigger */}
                <DropdownMenuItem 
                    className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-600"
                    // Evitamos que el onSelect del Dropdown cierre el menú antes de confirm
                    onSelect={(e) => e.preventDefault()} 
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Eliminar Item</span>
                </DropdownMenuItem>
            </button>
        </form>
    );
}