'use client';

import React from 'react';
import { Settings, ChevronLeft, Plus, Wrench, CalendarClock, History, Calendar } from 'lucide-react';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import Link from 'next/link';

interface MaintenanceMenuProps {
    mode: 'operative' | 'settings';
    userRole?: string;
    isPropertyContext?: boolean;
    backLink?: { href: string; label: string };
    view?: 'active' | 'preventive' | 'calendar' | 'archived' | 'settings';
}

export function MaintenanceMenu({ 
    mode, 
    userRole, 
    isPropertyContext, 
    backLink,
    view = 'active'
}: MaintenanceMenuProps) {
    const canManage = userRole === 'admin' || userRole === 'superadmin';

    // --- MODO OPERATIVO ---
    if (mode === 'operative') {
        return (
            <div className="flex flex-col gap-2">
                {isPropertyContext && backLink && (
                    <div className="px-2 mb-2">
                        <Link 
                            href={backLink.href}
                            className="flex items-center gap-2 py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all group"
                        >
                            <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                            <span className="text-[11px] font-bold uppercase tracking-tighter">{backLink.label}</span>
                        </Link>
                    </div>
                )}

                {canManage && (
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
                )}

                <SidebarMenu className="px-2">
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={view === 'active'} tooltip="Tareas Activas">
                            <Link href="/maintenance">
                                <Wrench className="h-4 w-4 shrink-0" />
                                <span className="font-medium">Tareas Activas</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={view === 'preventive'} tooltip="Planes Preventivos">
                            <Link href="/maintenance/preventive" className="text-orange-600">
                                <CalendarClock className="h-4 w-4 shrink-0" />
                                <span className="font-medium">Planes Preventivos</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={view === 'calendar'} tooltip="Calendario">
                            <Link href="/maintenance/calendar">
                                <Calendar className="h-4 w-4 shrink-0 text-blue-600" />
                                <span className="font-medium">Calendario de acciones</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={view === 'archived'} tooltip="Histórico">
                            <Link href="/maintenance/archived" className="text-slate-500">
                                <History className="h-4 w-4 shrink-0" />
                                <span className="font-medium">Histórico</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </div>
        );
    }

    // --- MODO SETTINGS (Solo emite el evento) ---
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