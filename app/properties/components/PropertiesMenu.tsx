'use client';

import React, { useState, useContext } from 'react';
import Link from 'next/link';
import { 
    Home, Plus, Settings, LayoutDashboard, Users, 
    Megaphone, ChevronRight, MapPin 
} from 'lucide-react';
import { 
    SidebarMenu, SidebarMenuItem, SidebarMenuButton, 
    SidebarMenuSub, SidebarMenuSubItem, SidebarGroupLabel 
} from '@/components/ui/sidebar';
import { 
    Collapsible, CollapsibleContent, CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PropertyForm } from './PropertyForm';
import { AlertSheet } from './AlertSheet';
import { PropertyContext } from '../context/PropertyContext';

interface PropertiesMenuProps {
    mode:'operative'|'settings';
    properties: any[];
    currentView?: 'dashboard' | 'contacts';
    onViewChange?: (view: 'dashboard' | 'contacts') => void;
}

export function PropertiesMenu({ mode,properties, currentView, onViewChange }: PropertiesMenuProps) {
    const [isNewOpen, setIsNewOpen] = useState(false);
    
    // Contexto (Seguro)
    const context = useContext(PropertyContext);
    const currentPropertyId = context?.property?.id;
    const currentPropertySlug=context?.property?.slug;
    const can = context?.can || (() => false);
    if (mode==='operative'){
        return (
            <SidebarMenu>
                {/* 1. BOTÓN NUEVA PROPIEDAD */}
                <div className="px-2 pb-4 pt-2">
                    <Sheet open={isNewOpen} onOpenChange={setIsNewOpen}>
                        <SheetTrigger asChild>
                            <Button className="w-full justify-start gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-medium">
                                <Plus className="h-4 w-4" />
                                <span>Nueva Propiedad</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                            <SheetHeader className="mb-6"><SheetTitle>Registrar Propiedad</SheetTitle></SheetHeader>
                            <PropertyForm onSuccess={() => setIsNewOpen(false)} />
                        </SheetContent>
                    </Sheet>
                </div>

                <SidebarGroupLabel>Mis Propiedades</SidebarGroupLabel>

                {/* 2. LISTADO DE PROPIEDADES */}
                {properties.map((prop) => {
                    const isCurrent = currentPropertyId === prop.id;

                    // SI NO ES LA ACTUAL: Enlace simple
                    if (!isCurrent) {
                        return (
                            <SidebarMenuItem key={prop.id}>
                                <Link href={`/properties/${prop.slug}`} className="w-full">
                                    <SidebarMenuButton tooltip={prop.name} className="text-slate-600">
                                        <Home className="w-4 h-4 text-slate-400" />
                                        <span className="truncate">{prop.name}</span>
                                    </SidebarMenuButton>
                                </Link>
                            </SidebarMenuItem>
                        );
                    }

                    // SI ES LA ACTUAL: Collapsible Desplegado
                    return (
                        <Collapsible key={prop.id} open={true} className="group/collapsible">
                            <SidebarMenuItem>
                                <CollapsibleTrigger asChild>
                                    <SidebarMenuButton 
                                        isActive={true} // Siempre activo porque estamos dentro
                                        className="data-[active=true]:bg-indigo-50 data-[active=true]:text-indigo-700 font-bold hover:bg-indigo-100 transition-colors"
                                    >
                                        <Home className="w-4 h-4 text-indigo-600" />
                                        <span className="truncate flex-1">{prop.name}</span>
                                        <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                    </SidebarMenuButton>
                                </CollapsibleTrigger>
                                
                                <CollapsibleContent>
                                    <SidebarMenuSub className="border-l-indigo-200">
                                        
                                        {/* A. DASHBOARD */}
                                        <SidebarMenuSubItem>
                                            <SidebarMenuButton 
                                                isActive={currentView === 'dashboard'}
                                                onClick={() => {
                                                    console.log("Clic en Dashboard"); // DEBUG
                                                    onViewChange?.('dashboard');
                                                }}
                                                className={cn(
                                                    "cursor-pointer transition-all",
                                                    "data-[active=true]:bg-indigo-600 data-[active=true]:text-white data-[active=true]:font-medium",
                                                    "data-[active=true]:hover:bg-indigo-700"
                                                )}
                                            >
                                                <LayoutDashboard className="w-4 h-4" />
                                                <span>Dashboard</span>
                                            </SidebarMenuButton>
                                        </SidebarMenuSubItem>

                                        {/* B. CONTACTOS */}
                                        <SidebarMenuSubItem>
                                            <SidebarMenuButton 
                                                isActive={currentView === 'contacts'}
                                                onClick={() => {
                                                    console.log("Clic en Contactos"); // DEBUG
                                                    onViewChange?.('contacts');
                                                }}
                                                className={cn(
                                                    "cursor-pointer transition-all",
                                                    "data-[active=true]:bg-indigo-600 data-[active=true]:text-white data-[active=true]:font-medium",
                                                    "data-[active=true]:hover:bg-indigo-700"
                                                )}
                                            >
                                                <Users className="w-4 h-4" />
                                                <span>Contactos</span>
                                            </SidebarMenuButton>
                                        </SidebarMenuSubItem>
                                    </SidebarMenuSub>
                                </CollapsibleContent>
                            </SidebarMenuItem>
                        </Collapsible>
                    );
                })}
            </SidebarMenu>
        );
    }
    if(mode==='settings'){
        return(
            <>
                {/* C. AVISO (Solo Admin) */}
                {can('edit_house') && (
                    <SidebarMenuItem>
                        <AlertSheet 
                            propertyId={currentPropertyId||''} 
                            trigger={
                                <SidebarMenuButton className="text-orange-600 hover:text-orange-700 hover:bg-orange-50">
                                    <Megaphone className="w-4 h-4" />
                                    <span>Publicar Aviso</span>
                                </SidebarMenuButton>
                            }
                        />
                    </SidebarMenuItem>
                )}

                {/* D. CONFIGURACIÓN (Solo Admin) */}
                {can('edit_house') && (
                    <SidebarMenuItem>
                        <Link href={`/properties/${currentPropertySlug}/settings`}>
                            <SidebarMenuButton className="text-slate-500 hover:text-indigo-600">
                                <Settings className="w-4 h-4" />
                                <span>Configuración de la Casa</span>
                            </SidebarMenuButton>
                        </Link>
                    </SidebarMenuItem>
                )}
            </>            
        )
    }
}