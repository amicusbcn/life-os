// app/maintenance/task/[id]/components/TaskSideMenu.tsx
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Archive, Trash2, Bell, Share2 } from "lucide-react";
import Link from "next/link";

export function TaskSideMenu({ task, isAdmin, onArchive }: any) {
    return (
        <SidebarMenu className="gap-2">
            <SidebarMenuItem>
                <Link href={`/properties/${task.properties.slug}/maintenance`} passHref>
                    <Button variant="ghost" className="w-full justify-start gap-2 text-slate-500 hover:text-slate-900">
                        <ChevronLeft className="h-4 w-4" />
                        <span>Volver a la lista</span>
                    </Button>
                </Link>
            </SidebarMenuItem>

            <div className="px-4 py-2 mt-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Acciones de Tarea</p>
            </div>

            <SidebarMenuItem className="px-2 space-y-1">
                <Button variant="outline" className="w-full justify-start gap-2 rounded-xl text-xs h-9">
                    <Bell className="h-4 w-4" /> Notificar a miembros
                </Button>
                
                {isAdmin && !task.is_archived && (
                    <Button 
                        onClick={onArchive}
                        className="w-full justify-start gap-2 rounded-xl text-xs h-9 bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200"
                    >
                        <Archive className="h-4 w-4" /> Archivar Incidencia
                    </Button>
                )}

                {isAdmin && (
                    <Button variant="ghost" className="w-full justify-start gap-2 rounded-xl text-xs h-9 text-red-600 hover:bg-red-50 hover:text-red-700">
                        <Trash2 className="h-4 w-4" /> Eliminar permanentemente
                    </Button>
                )}
            </SidebarMenuItem>
        </SidebarMenu>
    );
}