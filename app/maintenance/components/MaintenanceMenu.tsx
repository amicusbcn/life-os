// app/maintenance/components/MaintenanceMenu.tsx
'use client';

import React from 'react';
import { Settings, Plus, Wrench, CalendarClock, History, Calendar } from 'lucide-react';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import Link from 'next/link';
import { PropertyBase } from '@/types/properties';
import { cn } from '@/lib/utils';

interface MaintenanceMenuProps {
    mode: 'operative' | 'settings';
    userRole?: string;
    currentProperty?: PropertyBase;
    view?: 'active' | 'preventive' | 'calendar' | 'archived' | 'settings';
}

export function MaintenanceMenu({ 
    mode, 
    userRole, 
    currentProperty, 
    view = 'active'
}: MaintenanceMenuProps) {
    const canManage = userRole === 'admin' || userRole === 'superadmin';
    const isPropertyContext = !!currentProperty;

    // 1. Calculamos la base de la URL según el contexto
    const baseUrl = isPropertyContext 
        ? `/properties/${currentProperty.slug}/maintenance` 
        : '/maintenance';

    // 2. Definimos los items del menú de forma iterativa
    const menuItems = [
        { 
            id: 'active', 
            label: 'Tareas Activas', 
            icon: Wrench, 
            href: `${baseUrl}/active`, // Forzamos /active para consistencia
            color: "" 
        },
        { 
            id: 'preventive', 
            label: 'Planes Preventivos', 
            icon: CalendarClock, 
            href: `${baseUrl}/preventive`,
            color: "text-orange-600" 
        },
        { 
            id: 'calendar', 
            label: 'Calendario', 
            icon: Calendar, 
            href: `${baseUrl}/calendar`,
            color: "text-blue-600" 
        },
        { 
            id: 'archived', 
            label: 'Histórico', 
            icon: History, 
            href: `${baseUrl}/archived`,
            color: "text-slate-500" 
        },
    ];

    if (mode === 'operative') {
        return (
            <div className="flex flex-col gap-2">
                {/* Botón Acción Principal */}
                <SidebarMenuItem className="list-none px-2">
                    <SidebarMenuButton 
                        onClick={() => window.dispatchEvent(new CustomEvent('open-new-task'))}
                        className="bg-slate-900 text-white hover:bg-slate-800 hover:text-white transition-colors mb-4 h-11 rounded-xl shadow-md"
                        tooltip="Nueva Tarea"
                    >
                        <Plus className="h-4 w-4 shrink-0" />
                        <span className="font-bold uppercase text-[11px] tracking-tight">Nueva Incidencia</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>

                {/* Lista de Vistas Dinámica */}
                <SidebarMenu className="px-2">
                    {menuItems.map((item) => (
                        <SidebarMenuItem key={item.id}>
                            <SidebarMenuButton 
                                asChild 
                                isActive={view === item.id} 
                                tooltip={item.label}
                            >
                                <Link href={item.href}>
                                    <item.icon className={cn("h-4 w-4 shrink-0", item.color)} />
                                    <span className={cn("font-medium", view === item.id && "font-bold")}>
                                        {item.label}
                                    </span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </div>
        );
    }

    // --- MODO SETTINGS ---
    if (!canManage) return null;

    return (
        <SidebarMenu className="px-2">
            <SidebarMenuItem>
                <SidebarMenuButton 
                    onClick={() => window.dispatchEvent(new CustomEvent('open-maintenance-settings'))}
                    tooltip="Configurar Motor"
                    className="text-slate-500 hover:text-slate-900"
                >
                    <Settings className="h-4 w-4 shrink-0" />
                    <span>Configurar Motor</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}