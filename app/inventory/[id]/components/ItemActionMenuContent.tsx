// app/inventory/[id]/components/ItemActionsMenuContent.tsx
'use client'

import React, { useState } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ItemEditDialog } from './ItemEditDialog'; 
import { deleteInventoryItem } from '../../actions'; // 🚨 Asumimos una acción de servidor para borrar
import { redirect } from 'next/navigation'; // Para redirigir después del borrado

// 🚨 Interfaces necesarias (Ajustar los tipos 'any' a tus tipos reales)
interface ItemActionsMenuContentProps {
    item: any;
    categories: any[]; 
    locations: any[];
}

export function ItemActionsMenuContent({ item, categories, locations }: ItemActionsMenuContentProps) {
    const [isEditOpen, setIsEditOpen] = useState(false);
    const photoPath = item.photo_path || null;
    const handleDelete = async () => {
        if (confirm(`¿Estás seguro de que quieres eliminar ${item.name}? Esta acción es irreversible.`)) {
            // Llama a la Server Action de borrado
            const result = await deleteInventoryItem(item.id, photoPath); 
            if (result?.error) {
                alert("Error al eliminar: " + result.error);
            } else {
                redirect('/inventory'); 
            }
        }
    };

    return (
        <>
            {/* 1. DIALOGO DE EDICIÓN: Renderizado en la misma página */}
            <ItemEditDialog 
                item={item} 
                categories={categories} 
                locations={locations}
                isOpen={isEditOpen} 
                setOpen={setIsEditOpen} 
            />

            {/* 2. MENÚ DESPLEGABLE DE ACCIONES (El Trigger que va en rightAction) */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100 rounded-full text-slate-600">
                        <MoreVertical className="h-5 w-5" />
                    </Button>
                </DropdownMenuTrigger>
                
                <DropdownMenuContent align="end" className="w-48">
                    {/* ÍTEM DE EDICIÓN (Abre el diálogo) */}
                    <DropdownMenuItem 
                        className="cursor-pointer"
                        onClick={() => setIsEditOpen(true)} // Abre el Diálogo
                    >
                        <Edit className="mr-2 h-4 w-4" />
                        <span>Editar Ficha</span>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    {/* ÍTEM DE BORRADO */}
                    <DropdownMenuItem 
                        className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-600"
                        onClick={handleDelete}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Eliminar Item</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    );
}