// app/timeline/components/TimelineMenu.tsx
'use client'

import React from 'react';
import { Settings, PlusCircle } from 'lucide-react';
import { TimelineSettings } from './TimelineSettings'; 
import { TimelineMenuProps } from '@/types/timeline'; 
import { 
    SidebarMenuItem, 
    SidebarMenuButton,
    SidebarMenu
} from '@/components/ui/sidebar';

// Añadimos mode para el slotting
interface EnhancedTimelineMenuProps extends TimelineMenuProps {
    mode: 'operative' | 'settings';
}

export function TimelineMenu({ allTags, allPeople, mode }: EnhancedTimelineMenuProps) {
    
    // --- RENDERIZADO OPERATIVO (Cuerpo del Sidebar) ---
    if (mode === 'operative') {
        return (
            <SidebarMenu>
                <SidebarMenuItem>
                    {/* Aquí podrías envolver este botón con el diálogo de "Nuevo Evento" 
                        si lo tienes implementado, similar a NewItemDialog */}
                    <SidebarMenuButton size="lg" className="bg-blue-600 text-white hover:bg-blue-700 hover:text-white shadow-md mb-4">
                        <PlusCircle className="h-5 w-5" />
                        <span className="font-bold">Nuevo Hito</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        );
    }

    // --- RENDERIZADO DE CONFIGURACIÓN (Pie del Sidebar) ---
    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <TimelineSettings 
                    allTags={allTags} 
                    allPeople={allPeople} 
                >
                    <SidebarMenuButton tooltip="Configurar Timeline">
                        <Settings className="h-4 w-4 text-slate-500" />
                        <span>Configurar Etiquetas y Personas</span>
                    </SidebarMenuButton>
                </TimelineSettings>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}