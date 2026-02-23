// app/maintenance/components/MaintenanceMenu.tsx
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarSeparator } from "@/components/ui/sidebar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Archive, Funnel, Plus, ShieldCheck, Wrench } from "lucide-react";
import { MaintenanceForm } from "./MaintenanceForm";
import Link from "next/link";

export function MaintenanceMenu({ userRole, properties, locations, inventoryItems, users, history=false }: any) {
    const canManage = userRole === 'admin' || userRole === 'superadmin';

    return (
        <>
            {/* GRUPO 1: ACCIONES PRINCIPALES */}
            <SidebarGroup>
                <SidebarGroupContent>
                    <SidebarMenu>
                        {canManage && (
                            <SidebarMenuItem className="pb-4">
                                <Sheet>
                                    <SheetTrigger asChild>
                                        <SidebarMenuButton 
        size="lg" 
        tooltip="Nueva Tarea"
        // Eliminamos w-full y px-4 manuales. 
        // Usamos flex-none en el icono para que no se desplace.
        className="bg-slate-900 hover:bg-slate-800 hover:text-white text-white font-bold rounded-xl transition-all duration-300"
      >
        <Plus className="h-5 w-5 shrink-0" />
        <span className="truncate">Nueva Tarea</span>
      </SidebarMenuButton>
                                    </SheetTrigger>
                                    <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
                                        <MaintenanceForm {...{properties, locations, inventoryItems, users}} />
                                    </SheetContent>
                                </Sheet>
                            </SidebarMenuItem>
                        )}

                        <SidebarMenuItem>
                            <SidebarMenuButton 
                                asChild 
                                isActive={!history} 
                                tooltip="Tareas Activas"
                                className="px-4"
                            >
                                <Link href="/maintenance">
                                    <Wrench className="h-4 w-4 shrink-0" />
                                    <span>Tareas Activas</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>

                        <SidebarMenuItem>
                            <SidebarMenuButton 
                                asChild 
                                isActive={history} 
                                tooltip="Histórico"
                                className="px-4 text-slate-500 hover:text-orange-600"
                            >
                                <Link href="/maintenance/archived">
                                    <Archive className="h-4 w-4 shrink-0" />
                                    <span>Histórico</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>

            {/* GRUPO 2: FILTROS INTELIGENTES */}
            <SidebarGroup>
                <SidebarGroupLabel className="px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Filtros Rápidos
                </SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton tooltip="Ver Urgentes" className="px-4 group">
                                <div className="h-2 w-2 rounded-full bg-red-500 mr-2 group-hover:animate-pulse" />
                                <span>Urgentes</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        
                        <SidebarMenuItem>
                            <SidebarMenuButton tooltip="Ver en Proceso" className="px-4">
                                <div className="h-2 w-2 rounded-full bg-blue-500 mr-2" />
                                <span>En Proceso</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>

                        <SidebarMenuItem>
                            <SidebarMenuButton tooltip="Ver con Seguro" className="px-4">
                                <ShieldCheck className="h-4 w-4 shrink-0 text-orange-500" />
                                <span>Seguros</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
        </>
    );
}