// app/inventory/components/InventoryMenu.tsx
'use client'

import React from 'react';
import { Settings, PackagePlus } from 'lucide-react';
import { InventorySettingsDialog } from './InventorySettingsDialog'; 
import { InventoryMenuProps } from '@/types/inventory'; 
import { 
    SidebarMenuItem, 
    SidebarMenuButton,
    SidebarMenu
} from '@/components/ui/sidebar';

// Añadimos la prop mode para el slotting
interface EnhancedInventoryMenuProps extends InventoryMenuProps {
    mode: 'operative' | 'settings';
}

export function InventoryMenu({ categories, locations, mode }: EnhancedInventoryMenuProps) {
    
    // --- RENDERIZADO OPERATIVO (Cuerpo del Sidebar) ---
    if (mode === 'operative') {
        return (
            <SidebarMenu>
                {/* Aquí podrías añadir en el futuro una acción rápida como "Escanear QR" 
                    o "Añadir Ítem Rápido" si decides sacarlo de la vista principal.
                */}
                <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Añadir nuevo ítem" className="text-slate-600">
                        <PackagePlus className="h-4 w-4" />
                        <span>Añadir Ítem</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        );
    }

    // --- RENDERIZADO DE CONFIGURACIÓN (Pie del Sidebar) ---
    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <InventorySettingsDialog 
                    categories={categories} 
                    locations={locations} 
                >
                    <SidebarMenuButton tooltip="Configurar Inventario">
                        <Settings className="h-4 w-4 text-slate-500" />
                        <span>Configurar Inventario</span>
                    </SidebarMenuButton>
                </InventorySettingsDialog>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}