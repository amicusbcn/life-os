'use client';

import Link from 'next/link';
import { Check, ChevronsUpDown, User, Building2, House } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem,useSidebar } from '@/components/ui/sidebar';

interface Props {
    currentContext: string; // 'personal' o el slug de la casa
    properties: { id: string; name: string; slug: string }[];
}

export function InventoryContextSelector({ currentContext, properties }: Props) {
    const { open } = useSidebar();
    const activeProperty = properties.find(p => p.slug === currentContext);
    // Encontrar el nombre actual para mostrarlo en el botón
    const currentName = currentContext === 'personal' 
        ? 'Personal' 
        : properties.find(p => p.slug === currentContext)?.name || 'Seleccionar...';
    if (!open) {
        // MODO COLAPSADO: Solo un icono con Tooltip
        return (
            <SidebarMenuItem>
                <SidebarMenuButton tooltip={activeProperty?.name || "Inventario Personal"}>
                    {activeProperty ? <House className="h-4 w-4" /> : <User className="h-4 w-4" />}
                </SidebarMenuButton>
            </SidebarMenuItem>
        );
    }
    return (
        <SidebarMenu className='pb-4'>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button 
                            variant="ghost" 
                            className="w-full justify-between px-2 h-10 border border-slate-200 bg-white hover:bg-slate-50 shadow-sm"
                        >
                            <span className="flex items-center gap-2 truncate">
                                {currentContext === 'personal' 
                                    ? <User className="w-4 h-4 text-indigo-500"/> 
                                    : <Building2 className="w-4 h-4 text-emerald-500"/>
                                }
                                <span className="truncate">{currentName}</span>
                            </span>
                            <ChevronsUpDown className="w-4 h-4 opacity-50 shrink-0" />
                        </Button>
                    </DropdownMenuTrigger>
                    
                    <DropdownMenuContent className="w-56" align="start">
                        <DropdownMenuLabel className="text-xs text-slate-500 font-normal uppercase tracking-wider">
                            Contexto de Inventario
                        </DropdownMenuLabel>
                        
                        {/* OPCIÓN PERSONAL */}
                        <DropdownMenuItem asChild>
                            <Link href="/inventory/personal" className="flex items-center justify-between cursor-pointer">
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-indigo-500" />
                                    <span>Personal</span>
                                </div>
                                {currentContext === 'personal' && <Check className="w-4 h-4 text-indigo-600" />}
                            </Link>
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator />
                        
                        {/* LISTA DE PROPIEDADES */}
                        <DropdownMenuLabel className="text-xs text-slate-500 font-normal uppercase tracking-wider">
                            Propiedades
                        </DropdownMenuLabel>

                        {properties.length === 0 && (
                            <div className="px-2 py-1.5 text-xs text-slate-400 italic">No hay propiedades</div>
                        )}

                        {properties.map((prop) => (
                            <DropdownMenuItem key={prop.id} asChild>
                                <Link href={`/inventory/${prop.slug}`} className="flex items-center justify-between cursor-pointer">
                                    <div className="flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-emerald-500" />
                                        <span className="truncate max-w-[140px]">{prop.name}</span>
                                    </div>
                                    {currentContext === prop.slug && <Check className="w-4 h-4 text-emerald-600" />}
                                </Link>
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}