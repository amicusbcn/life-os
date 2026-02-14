'use client';

import React, { useState } from 'react';
import { Settings, MapPin, ChevronLeft, Plus, ChevronDown, Tag } from 'lucide-react';
import { 
    SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarGroup, SidebarGroupLabel, SidebarContent 
} from '@/components/ui/sidebar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from '@/components/ui/button';
import Link from 'next/link';

import { InventoryForm } from './InventoryForm'; 
import { InventorySettingsContent } from './InventorySettingsContent'; 

import { InventoryCategory, InventoryLocation } from '@/types/inventory';
import { LocationTree } from './LocationTree';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface EnhancedInventoryMenuProps {
    mode: 'operative' | 'settings';
    categories: InventoryCategory[];
    locations: InventoryLocation[];
    activeCategory?: string | null;
    onCategoryChange?: (id: string | null) => void;
    activeLocation?: string | null;
    onLocationChange?: (id: string | null) => void;
    backLink?: { href: string; label: string };
    propertyId?: string;
    isPropertyContext?: boolean; 
    userRole?: string; 
}

export function InventoryMenu({ 
    mode, 
    categories, 
    locations, 
    activeCategory, 
    onCategoryChange,
    activeLocation,
    onLocationChange,
    propertyId,
    backLink,
    isPropertyContext,
    userRole
}: EnhancedInventoryMenuProps) {
    
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
                            <span className="text-[11px] font-bold uppercase tracking-tighter">Dashboard Propiedad</span>
                        </Link>
                    </div>
                )}

                {/* 2. ACCIÓN PRINCIPAL: NUEVO ÍTEM (Solo Admin) */}
                {canManage && (
                    <div className="px-2 mb-2">
                        <Sheet open={isNewItemOpen} onOpenChange={setIsNewItemOpen}>
                            <SheetTrigger asChild>
                                <Button className="w-full justify-start gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-bold h-10 px-4 rounded-xl">
                                    <Plus className="h-5 w-5" />
                                    <span>Nuevo Ítem</span>
                                </Button>
                            </SheetTrigger>
                            <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
                                <SheetHeader className="mb-6">
                                    <SheetTitle>Añadir Nuevo Ítem</SheetTitle>
                                </SheetHeader>
                                <InventoryForm 
                                    categories={categories} 
                                    locations={locations} 
                                    propertyId={propertyId}
                                    onSuccess={() => setIsNewItemOpen(false)} 
                                />
                            </SheetContent>
                        </Sheet>
                    </div>
                )}

                {/* 3. INFO CONTEXTO (Si no hay propiedad seleccionada) */}
                {!isPropertyContext && (
                    <div className="px-4 py-2">
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inventario General</p>
                    </div>
                )}

                {/* SECCIÓN: UBICACIONES */}
                <Collapsible defaultOpen className="group/collapsible">
                    <SidebarGroup>
                        <CollapsibleTrigger asChild>
                            <SidebarGroupLabel className="flex w-full cursor-pointer items-center justify-between hover:bg-slate-100 transition-colors py-2 rounded-md px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-3 w-3" />
                                    <span>Ubicaciones</span>
                                </div>
                                <ChevronDown className="h-3 w-3 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-0 -rotate-90" />
                            </SidebarGroupLabel>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="px-0">
                            <SidebarMenu className="mt-1 ml-2 border-l border-slate-100 pl-2">
                                <LocationTree 
                                    locations={locations}
                                    activeLocation={activeLocation}
                                    onLocationChange={onLocationChange || (() => {})}
                                />
                            </SidebarMenu>
                        </CollapsibleContent>
                    </SidebarGroup>
                </Collapsible>

                {/* SECCIÓN: CATEGORÍAS */}
                <Collapsible defaultOpen className="group/collapsible">
                    <SidebarGroup>
                        <CollapsibleTrigger asChild>
                            <SidebarGroupLabel className="flex w-full cursor-pointer items-center justify-between hover:bg-slate-100 transition-colors py-2 rounded-md px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                <div className="flex items-center gap-2">
                                    <Tag className="h-3 w-3" />
                                    <span>Categorías</span>
                                </div>
                                <ChevronDown className="h-3 w-3 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-0 -rotate-90" />
                            </SidebarGroupLabel>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <SidebarMenu className="mt-1">
                                {categories.map(cat => (
                                    <SidebarMenuItem key={cat.id}>
                                        <SidebarMenuButton 
                                            isActive={activeCategory === cat.id}
                                            onClick={() => {
                                                const nextValue = activeCategory === cat.id ? null : cat.id;
                                                onCategoryChange?.(nextValue);
                                            }}
                                            className="px-4"
                                        >
                                            <span className="opacity-60 mr-2">{cat.icon || '📦'}</span>
                                            <span>{cat.name}</span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </CollapsibleContent>
                    </SidebarGroup>
                </Collapsible>
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