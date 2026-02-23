'use client';

import { useState } from 'react'; // <--- Añadido para el toggle del móvil
import { UnifiedAppSidebar } from '@/components/layout/UnifiedAppSidebar';
import { TaskSideMenu } from '../../components/TaskSideMenu';
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MapPin, Box, Calendar, User, Clock, ChevronDown, ChevronUp, Info } from "lucide-react";
import { MaintenanceTimeline } from '../../components/MaintenanceTimeLine';
import { MaintenanceLog, MaintenanceTask } from '@/types/maintenance';
import { PropertyMember } from '@/types/properties';
import { AppModule } from '@/types/users';
import { TimelineContextActions } from '../../components/TimelineContextActions';
import { Button } from "@/components/ui/button";
import { TaskDetailedInfo } from '../../components/TaskDetailedInfo';
import { EditTaskSheet } from '../../components/EditTaskSheet';

interface Props {
    task: MaintenanceTask;
    initialTimeline: MaintenanceLog[];
    isAdmin: boolean;
    canEdit: boolean; // <--- AÑADIR ESTO
    profile: any;
    members: PropertyMember[];
    accessibleModules: AppModule[];
    categories: any[]; 
}

// Y luego recíbela en la función:
export function TaskDetailView({ 
    task, 
    initialTimeline,  
    isAdmin, 
    canEdit, // <--- AÑADIR ESTO
    profile, 
    accessibleModules, 
    members,
    categories 
}: Props) {
    const [isHeaderOpen, setIsHeaderOpen] = useState(false); // Control para el móvil
    const [isEditOpen, setIsEditOpen] = useState(false);
    const handleArchive = async () => {
        if (confirm("¿Seguro que quieres archivar esta incidencia? Ya no aparecerá en la lista activa.")) {
            // archiveTask(task.id)
        }
    };

    return (
        <UnifiedAppSidebar
            title={task.title}
            profile={profile}
            modules={accessibleModules}
            backLink="/maintenance"
            moduleMenu={
                <TaskSideMenu 
                    task={task} 
                    isAdmin={isAdmin} 
                    onArchive={handleArchive} 
                />
            }
        >
            <div className="flex flex-col h-full bg-white lg:flex-row">
                
                {/* --- HEADER MÓVIL DESPLEGABLE (Solo visible en < lg) --- */}
                <div className="lg:hidden sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
                    <div className="p-4" onClick={() => setIsHeaderOpen(!isHeaderOpen)}>
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col min-w-0">
                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">
                                    ID-{task.id.split('-')[0].toUpperCase()} • {task.status}
                                </span>
                                <h1 className="font-bold text-slate-900 truncate text-sm leading-tight">
                                    {task.title}
                                </h1>
                            </div>
                            <Button variant="ghost" size="sm" className="rounded-full h-8 w-8 p-0">
                                {isHeaderOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </Button>
                        </div>

                        {/* Contenido que se despliega en móvil */}
                        {isHeaderOpen && (
                            <div className="mt-4 space-y-4 pb-2 animate-in slide-in-from-top-2 duration-200">
                                <TaskDetailedInfo task={task} logs={initialTimeline} canEdit={canEdit} onEditClick={() => setIsEditOpen(true)} />.
                                <Button variant="outline" size="sm" className="w-full text-[10px] h-7 uppercase font-black tracking-widest border-slate-200 bg-white">
                                    Editar Información General
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* COLUMNA IZQUIERDA: TIMELINE */}
                <div className="flex-1 flex flex-col min-h-screen border-r border-slate-100 overflow-y-auto">
                    {/* Header de Escritorio (Oculto en móvil para no duplicar) */}
                    <div className="hidden lg:block p-8 border-b bg-slate-50/50">
                        <div className="flex items-center gap-3 mb-2">
                            <Badge className="bg-blue-600">ID-{task.id.split('-')[0].toUpperCase()}</Badge>
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                                <Clock className="h-3 w-3" /> Reportada el {new Date(task.created_at).toLocaleDateString()}
                            </span>
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">{task.title}</h1>
                    </div>

                    <div className="flex-1 p-4 lg:p-8">
                        <MaintenanceTimeline 
                            logs={initialTimeline} 
                            taskId={task.id}
                            propertyId={task.property_id}
                            members={members}
                            currentUser={{ 
                                id: profile.id, 
                                isAdmin: isAdmin 
                            }}
                        />
                        <div className="mt-12 max-w-2xl mx-auto">
                            <TimelineContextActions 
                                task={task} 
                                isAdmin={isAdmin} 
                                isResponsible={task.assigned_member?.user_id === profile?.id} 
                                members={members} 
                            />
                        </div>
                    </div>
                </div>

                {/* COLUMNA DERECHA: METADATOS (Solo visible en LG) */}
                <div className="hidden lg:block w-80 p-8 space-y-8 bg-slate-50/30 sticky top-0 h-screen overflow-y-auto">
                    <section className="space-y-4">
                        <TaskDetailedInfo task={task} logs={initialTimeline} canEdit={canEdit} onEditClick={() => setIsEditOpen(true)} />
                    </section>
                </div>
            </div>
            <EditTaskSheet 
                task={task} 
                isOpen={isEditOpen} 
                onClose={() => setIsEditOpen(false)} 
                categories={categories}
                members={members}
            />
        </UnifiedAppSidebar>
    );
}

// Subcomponente auxiliar para no repetir código en el Sidebar
function MetaItem({ icon, label, value }: { icon: React.ReactNode, label: string, value?: string }) {
    return (
        <div className="flex items-start gap-3 text-sm">
            <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-sm text-slate-400">{icon}</div>
            <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase leading-none mb-1">{label}</p>
                <p className="font-bold text-slate-700 leading-tight">{value}</p>
            </div>
        </div>
    );
}