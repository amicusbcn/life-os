// app/maintenance/components/MaintenanceMenu.tsx
import { SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Plus, Wrench } from "lucide-react";
import { MaintenanceForm } from "./MaintenanceForm";

export function MaintenanceMenu({ userRole, properties, locations, inventoryItems, users }: any) {
    const canManage = userRole === 'admin' || userRole === 'superadmin';

    return (
        <SidebarMenu className="gap-2">
            {canManage && (
                <SidebarMenuItem className="px-2">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button className="w-full justify-start gap-2 bg-slate-900 hover:bg-slate-800 text-white shadow-md font-bold h-10 px-4 rounded-xl">
                                <Plus className="h-5 w-5" />
                                <span>Nueva Tarea</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
                            <SheetHeader className="mb-6">
                                <SheetTitle>Reportar Incidencia o Tarea</SheetTitle>
                            </SheetHeader>
                            <MaintenanceForm 
                                propertyId={properties[0]?.id} // Aquí podrías añadir un selector si hay varias
                                locations={locations}
                                inventoryItems={inventoryItems}
                                users={users}
                            />
                        </SheetContent>
                    </Sheet>
                </SidebarMenuItem>
            )}
            
            <div className="px-4 py-2 mt-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Wrench className="h-3 w-3" /> Estado de Salud
                </p>
            </div>
            {/* Aquí irán los filtros de Pendientes, Urgentes, etc. */}
        </SidebarMenu>
    );
}