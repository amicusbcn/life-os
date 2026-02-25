'use client';

import React, { useState } from 'react';
import { Settings, MapPin, ChevronLeft, Plus, ChevronDown, Tag } from 'lucide-react';
import { 
    SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarGroup, SidebarGroupLabel, useSidebar, 
    SidebarSeparator
} from '@/components/ui/sidebar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from '@/components/ui/button';
import Link from 'next/link';

import { InventoryForm } from './InventoryForm'; 
import { InventorySettingsContent } from './InventorySettingsContent'; 

import { InventoryCategory, InventoryLocation } from '@/types/inventory';
import { LocationTree } from './LocationTree';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { InventoryContextSelector } from './InventoryContextSelector';

interface EnhancedInventoryMenuProps {
    mode: 'operative' | 'settings';
    userRole?: string;
    isPropertyContext?: boolean;
    backLink?: { href: string; label: string };
    // Estas son las que faltaban para el Selector de Contexto
    currentContext?: string;
    properties?: any[];
    // Para el formulario de nuevo ítem
    categories: InventoryCategory[];
    locations: InventoryLocation[];
    propertyId?: string;
}

export function InventoryMenu({ 
    mode, 
    userRole, 
    isPropertyContext, 
    backLink,
    currentContext,
    properties=[],
    categories,
    locations,
    propertyId
}: EnhancedInventoryMenuProps) {
    const isInventoryPath = typeof window !== 'undefined' && window.location.pathname.startsWith('/inventory');
    const [isNewItemOpen, setIsNewItemOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const canManage = userRole === 'admin' || userRole === 'superadmin';

    if (mode === 'operative') {
        return (
            <div className="flex flex-col gap-2">
                {/* 1. BOTÓN VOLVER */}
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
                {/* 2. SELECTOR DE CONTEXTO - ¡EL REGRESO! */}
                {/* Solo lo ocultamos si estamos en una propiedad Y tenemos botón de volver 
                    (lo que significa que venimos de la sección de propiedades) */}
                {!(isPropertyContext && backLink ) && (
                    <InventoryContextSelector 
                        currentContext={currentContext!} 
                        properties={properties || []} 
                    />
                )}

                {/* 2. ACCIÓN PRINCIPAL: NUEVO ÍTEM (Solo Admin) */}
                {canManage && (
                    <SidebarMenuItem>
                        <SidebarMenuButton 
                            onClick={() => window.dispatchEvent(new CustomEvent('open-new-item'))}
                            className="bg-blue-600 text-white hover:bg-blue-700 hover:text-white transition-colors mb-2"
                            tooltip="Nuevo Ítem"
                        >
                            <Plus className="h-4 w-4" />
                            <span className="font-bold uppercase text-[11px] tracking-tight">Nuevo Ítem</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                )}
            </div>
        );
    }

    // --- MODO SETTINGS (Solo si es Admin) ---
    if (!canManage) return null;

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                    <SheetTrigger asChild>
                        <SidebarMenuButton tooltip="Configurar Maestros">
                            <Settings className="h-4 w-4 text-slate-500" />
                            <span>Configuración</span>
                        </SidebarMenuButton>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-[400px] sm:w-[540px]">
                        <SheetHeader className="mb-6">
                            <SheetTitle>Configuración de Inventario</SheetTitle>
                        </SheetHeader>
                        <InventorySettingsContent 
                            categories={categories} 
                            locations={locations} 
                        />
                    </SheetContent>
                </Sheet>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}