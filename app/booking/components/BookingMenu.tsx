// app/booking/components/BookingMenu.tsx
'use client'

import React from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { UserCircle, Settings, CalendarClock, Building } from 'lucide-react'
import { 
    SidebarMenuItem, 
    SidebarMenuButton 
} from '@/components/ui/sidebar'
import { BookingProperty } from '@/types/booking' 

interface BookingMenuProps {
    isSuperAdmin: boolean;
    isModuleAdmin: boolean;
    isPropertyOwner: boolean;
    isDebugActive: boolean;
    currentProperty?: BookingProperty;
    mode: 'operative' | 'settings'; // Prop para control de slots
}

export function BookingMenu({ 
    isSuperAdmin,
    isModuleAdmin, 
    isPropertyOwner,
    isDebugActive, 
    currentProperty,
    mode 
}: BookingMenuProps) {
  
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const openDialog = (dialogName: 'settings' | 'wizard' | 'admin') => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('dialog', dialogName);
        router.replace(`${pathname}?${params.toString()}`);
    };

    if (!isSuperAdmin && !isModuleAdmin && !isPropertyOwner && !currentProperty) return null;

    // --- RENDERIZADO OPERATIVO (Cuerpo del Sidebar) ---
    if (mode === 'operative') {
        return (
            <>
                {/* Generador de Turnos: Acción operativa del día a día */}
                {currentProperty && (isPropertyOwner || isModuleAdmin) && (
                    <SidebarMenuItem>
                        <SidebarMenuButton onClick={() => openDialog('wizard')} tooltip="Generador de Turnos">
                            <CalendarClock className="h-4 w-4" />
                            <span>Generador de Turnos</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                )}
            </>
        )
    }

    // --- RENDERIZADO DE CONFIGURACIÓN (Pie del Sidebar) ---
    return (
        <>
            {/* Gestión de la Propiedad */}
            {currentProperty && (isPropertyOwner || isModuleAdmin) && (
                <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => openDialog('settings')} tooltip="Ajustes de Propiedad">
                        <Building className="h-4 w-4" />
                        <span>Ajustes: {currentProperty.name}</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            )}

            {/* Administrar Módulo (Admin) */}
            {isModuleAdmin && (
                <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => openDialog('admin')} tooltip="Administrar Módulo">
                        <Settings className="h-4 w-4 text-indigo-600" />
                        <span className="text-indigo-900 font-medium">Administrar Módulo</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            )}

            {/* Modo Dios (Super Admin) */}
            {isSuperAdmin && (
                <SidebarMenuItem>
                    <SidebarMenuButton 
                        className="text-violet-600 font-bold bg-violet-50 hover:bg-violet-100"
                        onClick={() => {
                            const url = new URL(window.location.href);
                            if (isDebugActive) url.searchParams.delete('debug');
                            else url.searchParams.set('debug', 'true');
                            window.location.href = url.toString();
                        }}
                    >
                        <UserCircle className="h-4 w-4" />
                        <span>{isDebugActive ? 'Apagar Modo Dios' : 'Encender Modo Dios'}</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            )}
        </>
    )
}