// app/maintenance/task/[id]/TaskDetailView.tsx
'use client';

import { UnifiedAppSidebar } from '@/components/layout/UnifiedAppSidebar';
import { TaskSideMenu } from '../../components/TaskSideMenu';
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MapPin, Box, Calendar, User, Clock } from "lucide-react";
import { MaintenanceTimeline } from '../../components/MaintenanceTimeLine';
import { TimelineInput } from '../../components/TimelineInput';
import { MaintenanceLog, MaintenanceTask } from '@/types/maintenance';
import { PropertyMember } from '@/types/properties';
import { AppModule } from '@/types/users';
import { TimelineContextActions } from '../../components/TimelineContextActionst';
// Importaremos luego el Timeline y el Selector de Estado

interface Props{
    task: MaintenanceTask;
    initialTimeline: MaintenanceLog[];
    isAdmin: boolean;
    profile: any;
    members: PropertyMember[];
    accessibleModules: AppModule[];
}
export function TaskDetailView({ task, initialTimeline,  isAdmin, profile, accessibleModules,members }: Props) {
    
    const handleArchive = async () => {
        // Llamada a server action para archivar
        if(confirm("¿Seguro que quieres archivar esta incidencia? Ya no aparecerá en la lista activa.")) {
            // archiveTask(task.id)
        }
    };

    return (
        <UnifiedAppSidebar
            title={task.title}
            profile={profile}
            modules={accessibleModules}
            moduleMenu={
                <TaskSideMenu 
                    task={task} 
                    isAdmin={isAdmin} 
                    onArchive={handleArchive} 
                />
            }
        >
            <div className="flex flex-col h-full bg-white lg:flex-row">
                {/* COLUMNA IZQUIERDA: TIMELINE (Scrollable) */}
                <div className="flex-1 flex flex-col min-h-screen border-r border-slate-100">
                    <div className="p-6 border-b bg-slate-50/50">
                        <div className="flex items-center gap-3 mb-2">
                            <Badge className="bg-blue-600">ID-{task.id.split('-')[0].toUpperCase()}</Badge>
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                                <Clock className="h-3 w-3" /> Reportada el {new Date(task.created_at).toLocaleDateString()}
                            </span>
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">{task.title}</h1>
                    </div>

                    {/* El Timeline irá aquí */}
                    <div className="flex-1 p-6">
                        {/* <MaintenanceTimeline logs={initialTimeline} taskId={task.id} /> */}
                        <div className="text-center py-2 text-slate-300">
                            <MaintenanceTimeline 
                                logs={initialTimeline} 
                                taskId={task.id}              // <--- Añadir esto
                                propertyId={task.property_id}  // <--- Añadir esto
                                members={members}              // <--- Asegúrate de tener 'members' en las props de TaskDetailView
                                currentUser={{ 
                                    id: profile.id, 
                                    isAdmin: isAdmin 
                                }}
                                />
                            <div className="mt-12">
                                <TimelineContextActions task={task} isAdmin={isAdmin} isResponsible={task.assigned_member?.user_id === profile?.id} members={members} />

                            </div>
                        </div>
                    </div>
                </div>

                {/* COLUMNA DERECHA: METADATOS (Sticky en desktop) */}
                <div className="w-full lg:w-80 p-6 space-y-8 bg-slate-50/30">
                    <section className="space-y-4">
                        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Información Clave</h2>
                        
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 text-sm">
                                <div className="p-2 bg-white rounded-lg border border-slate-200"><MapPin className="h-4 w-4 text-slate-400" /></div>
                                <div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">Ubicación</p>
                                    <p className="font-medium text-slate-700">{task.properties?.name}</p>
                                </div>
                            </div>

                            {task.inventory_items && (
                                <div className="flex items-center gap-3 text-sm">
                                    <div className="p-2 bg-white rounded-lg border border-slate-200"><Box className="h-4 w-4 text-slate-400" /></div>
                                    <div>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">Objeto</p>
                                        <p className="font-medium text-slate-700">{task.inventory_items.name}</p>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-3 text-sm">
                                <div className="p-2 bg-white rounded-lg border border-slate-200"><User className="h-4 w-4 text-slate-400" /></div>
                                <div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">Responsable</p>
                                    <p className="font-medium text-slate-700">{task.assigned_member?.name || 'Sin asignar'}</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <Separator className="bg-slate-100" />

                    {/* Selector de Estado (Solo Admin/Responsable) */}
                    <section className="space-y-4">
                        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado Actual</h2>
                        {/* Aquí iría el componente interactivo de StatusSelect */}
                        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                            <span className="text-sm font-bold text-blue-600 uppercase italic">{task.status}</span>
                        </div>
                    </section>
                </div>
            </div>
        </UnifiedAppSidebar>
    );
}