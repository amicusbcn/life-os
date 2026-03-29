// app/booking/components/BookingMenu.tsx
'use client';

import React from 'react';
import { 
  Calendar, 
  RotateCw, 
  Sparkles, 
  Key, 
  UserCheck, 
  Megaphone, 
  Plus, 
  Settings,
  Scale,
  RefreshCcw
} from 'lucide-react';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import Link from 'next/link';
import { PropertyBase } from '@/types/properties';
import { cn } from '@/lib/utils';

interface BookingMenuProps {
    mode: 'operative' | 'settings';
    isAdmin?: boolean;
    currentProperty?: PropertyBase;
    isDebugActive?:boolean;
    view?: 'calendar' | 'market' | 'my-turns' | 'handovers' | 'rotation' | 'special';
}

export function BookingMenu({ 
    mode, 
    isAdmin=false, 
    currentProperty, 
    view = 'calendar'
}: BookingMenuProps) {
    if (!currentProperty) return null;

    const baseUrl = `/properties/${currentProperty.slug}/booking`;

    // 1. Items para el día a día (Operativa)
    const operativeItems = [
        { 
            id: 'calendar', 
            label: 'Calendario General', 
            icon: Calendar, 
            href: baseUrl,
            color: "" 
        },
        { 
            id: 'market', 
            label: 'Turnos Libres', 
            icon: Megaphone, 
            href: `${baseUrl}/market`,
            color: "text-emerald-600" // Color "oportunidad"
        },
        { 
            id: 'my-turns', 
            label: 'Mis Turnos', 
            icon: UserCheck, 
            href: `${baseUrl}/my-turns`,
            color: "text-blue-600" 
        },
        { 
            id: 'handovers', 
            label: 'Llaves y Limpieza', 
            icon: Key, 
            href: `${baseUrl}/handovers`,
            color: "text-slate-500" 
        },
    ];

    // 2. Items para el Administrador (Configuración de la Rueda/Sorteos)
    const settingsItems = [
        { 
            id: 'rotation', 
            label: 'Configurar Rueda', 
            icon: RotateCw, 
            href: `${baseUrl}/settings/rotation` 
        },
        { 
            id: 'special', 
            label: 'Periodos Especiales', 
            icon: Sparkles, 
            href: `${baseUrl}/settings/special` 
        },
        { 
            id: 'rules', 
            label: 'Normas de la Casa', 
            icon: Scale, 
            href: `${baseUrl}/settings/rules` 
        },
    ];

    if (mode === 'operative') {
        return (
            <div className="flex flex-col gap-2">
                {/* Botón Acción Principal: Nueva Reserva */}
                <SidebarMenuItem className="list-none px-2">
                    <SidebarMenuButton 
                        onClick={() => window.dispatchEvent(new CustomEvent('open-new-booking'))}
                        className="bg-slate-900 text-white hover:bg-slate-800 hover:text-white transition-colors mb-4 h-11 rounded-xl shadow-md"
                        tooltip="Reservar Turno"
                    >
                        <Plus className="h-4 w-4 shrink-0" />
                        <span className="font-bold uppercase text-[11px] tracking-tight">Nueva Reserva</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>

                {/* Lista de Vistas de Booking */}
                <SidebarMenu className="px-2">
                    {operativeItems.map((item) => (
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

    // --- MODO SETTINGS (Gestión de la Rueda y Reglas) ---
    if (!isAdmin) return null;

    return (
        <SidebarMenu className="px-2">
            {settingsItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton 
                        asChild
                        isActive={view === item.id}
                        tooltip={item.label}
                        className="text-slate-500 hover:text-slate-900"
                    >
                        <Link href={item.href}>
                            <item.icon className="h-4 w-4 shrink-0" />
                            <span>{item.label}</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            ))}
            {/* Botón de exenciones */}
            <SidebarMenuItem>
                <SidebarMenuButton 
                    className="text-slate-500 hover:text-slate-900"
                    onClick={() => window.dispatchEvent(new CustomEvent('open-exemptions-settings'))}
                    tooltip="Periodos Especiales"
                >
                    <Sparkles className="h-4 w-4 shrink-0 text-amber-600" />
                    <span>Periodos Especiales</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
            {/* Botón de Rueda */}
            
                <SidebarMenuItem key='rueda'>
                    <SidebarMenuButton 
                        asChild
                        isActive={view === "rotation"}
                        tooltip="Ejecutar Rueda"
                        className="text-slate-500 hover:text-slate-900"
                    >
                        <Link href="/properties/llava/booking/scheduler/">
                            <RotateCw className="h-4 w-4 shrink-0 text-indigo-600" />
                            <span>Ejecutar Rueda</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            {/* Botón de Ajustes de Motor (Globales del módulo) */}
            <SidebarMenuItem>
                <SidebarMenuButton 
                    onClick={() => window.dispatchEvent(new CustomEvent('open-booking-settings'))}
                    tooltip="Ajustes del Módulo"
                    className="text-slate-400 hover:text-slate-900 mt-4 border-t pt-4 rounded-none"
                >
                    <Settings className="h-4 w-4 shrink-0" />
                    <span className="text-xs uppercase font-bold tracking-widest">Motor de Reservas</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}