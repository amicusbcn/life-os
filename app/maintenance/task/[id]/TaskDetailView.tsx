'use client';

import { useState } from 'react';
import { UnifiedAppSidebar } from '@/components/layout/UnifiedAppSidebar';
import { TaskSideMenu } from '../../components/TaskSideMenu';
import { Badge } from "@/components/ui/badge";
import { 
    Calendar, 
    Clock, 
    ChevronDown, 
    ChevronUp, 
    CircleCheck, 
    CirclePlay, 
    OctagonX, 
    SquarePause, 
    TriangleAlert, 
    Archive, 
    RefreshCw, 
    AlertTriangle 
} from "lucide-react";
import { MaintenanceTimeline } from '../../components/MaintenanceTimeLine';
import { MaintenanceLog, MaintenanceTask } from '@/types/maintenance';
import { PropertyMember } from '@/types/properties';
import { AppModule } from '@/types/users';
import { TimelineContextActions } from '../../components/TimelineContextActions';
import { Button } from "@/components/ui/button";
import { TaskDetailedInfo } from '../../components/TaskDetailedInfo';
import { EditTaskSheet } from '../../components/EditTaskSheet';
import LoadIcon from '@/utils/LoadIcon';
import { cn } from '@/lib/utils';

// --- FUNCIONES DE AYUDA (FUERA DEL COMPONENTE) ---

const calculateActivityAlert = (logs: MaintenanceLog[]) => {
    // 1. Buscamos la actividad programada más cercana (da igual si es pasada o futura)
    const scheduledLogs = logs
        ?.filter(log => log.activity_status === 'programada' && log.activity_date)
        .sort((a, b) => new Date(a.activity_date!).getTime() - new Date(b.activity_date!).getTime());

    if (!scheduledLogs || scheduledLogs.length === 0) return null;

    // Cogemos la más antigua que esté programada (la primera que debería ejecutarse)
    const nextActivity = scheduledLogs[0];
    const activityDate = new Date(nextActivity.activity_date!);
    const hoy = new Date();
    
    // Resetear horas para comparar solo días
    hoy.setHours(0, 0, 0, 0);
    const activityDateDay = new Date(activityDate);
    activityDateDay.setHours(0, 0, 0, 0);

    const diffTiempo = activityDateDay.getTime() - hoy.getTime();
    const diffDias = Math.ceil(diffTiempo / (1000 * 60 * 60 * 24));

    if (diffDias < 0) {
        return { text: `Vencido hace ${Math.abs(diffDias)}d`, color: "bg-red-600", icon: <AlertTriangle size={10} /> };
    }
    if (diffDias === 0) {
        return { text: `¡Toca hoy!`, color: "bg-orange-600", icon: <Clock size={10} /> };
    }
    if (diffDias <= 7) {
        return { text: `En ${diffDias} días`, color: "bg-orange-500", icon: <Clock size={10} /> };
    }
    
    return { text: `Cita: ${activityDate.toLocaleDateString()}`, color: "bg-blue-600", icon: <Calendar size={10} /> };
};

const getNextActionBadge = (logs: MaintenanceLog[]) => {
    const hoy = new Date();
    // Buscamos un log que tenga fecha programada futura (puedes usar activity_date o scheduled_date si lo creas)
    const futureLog = logs?.find(log => log.activity_date && new Date(log.activity_date) > hoy);
    
    if (futureLog && futureLog.activity_date) {
        return { 
            text: `Cita: ${new Date(futureLog.activity_date).toLocaleDateString()}`, 
            color: 'bg-blue-600', 
            icon: <Calendar size={10} /> 
        };
    }
    return null;
};

interface Props {
    task: MaintenanceTask;
    initialTimeline: MaintenanceLog[];
    isAdmin: boolean;
    canEdit: boolean;
    profile: any;
    members: PropertyMember[];
    accessibleModules: AppModule[];
    categories: any[]; 
}

export function TaskDetailView({ 
    task, 
    initialTimeline,  
    isAdmin, 
    canEdit, 
    profile, 
    accessibleModules, 
    members,
    categories 
}: Props) {
    const [isHeaderOpen, setIsHeaderOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);

    const statusConfig: Record<string, any> = {
        'pendiente': { icon: <TriangleAlert size={16} />, bgColor: 'bg-amber-500', text: 'Pendiente' },
        'en_proceso': { icon: <CirclePlay size={16} />, bgColor: 'bg-blue-500', text: 'En proceso' }, 
        'bloqueado': { icon: <SquarePause size={16} />, bgColor: 'bg-slate-500', text: 'Bloqueado' }, 
        'completada': { icon: <CircleCheck size={16} />, bgColor: 'bg-green-500', text: 'Completada' }, 
        'cancelada': { icon: <OctagonX size={16} />, bgColor: 'bg-red-500', text: 'Cancelada' }
    };

    const handleArchive = async () => {
        if (confirm("¿Seguro que quieres archivar esta incidencia?")) {
            // Lógica de archivo
        }
    };

    const getBadges = () => {
        if (task.is_archived) {
            return [{ text: 'Archivada', color: 'bg-slate-500', icon: <Archive size={10}/> }];
        }

        const badges = [];

        // 1. Badge de Naturaleza (¿Qué es esto?)
        if (task.type === 'preventivo') {
            badges.push({ text: 'Preventivo', color: 'bg-purple-600', icon: <RefreshCw size={10}/> });
        } else {
            const currentStatus = statusConfig[task.status] || statusConfig['pendiente'];
            badges.push({ text: currentStatus.text, color: currentStatus.bgColor, icon: currentStatus.icon });
        }

        // 2. Badge de Agenda (¿Cuándo hay que actuar?)
        // Esta función ahora sirve para TODO: preventivos programados o averías con cita
        const activityAlert = calculateActivityAlert(initialTimeline); 
        if (activityAlert) badges.push(activityAlert);

        // 3. Badge de Categoría (Solo si no es preventivo)
        if (task.type !== 'preventivo' && task.category) {
            badges.push({ 
                text: task.category.name, 
                color: `bg-${task.category.color || 'slate-400'}`, 
                icon: <LoadIcon name={task.category.icon || 'Tags'} size={10} /> 
            });
        }

        return badges;
    };

    return (
        <UnifiedAppSidebar
            title={task.title}
            profile={profile}
            modules={accessibleModules}
            backLink="/maintenance"
            moduleMenu={<TaskSideMenu task={task} isAdmin={isAdmin} onArchive={handleArchive} />}
        >
            <div className="flex flex-col h-full bg-white lg:flex-row">
                
                {/* --- HEADER MÓVIL --- */}
                <div className="lg:hidden sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
                    <div className="p-4 cursor-pointer" onClick={() => setIsHeaderOpen(!isHeaderOpen)}>
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                    {getBadges().map((badge, idx) => (
                                        <Badge key={idx} className={cn("text-[9px] gap-1 px-2 py-0.5 border-none text-white", badge.color)}>
                                            {badge.icon}
                                            {badge.text}
                                        </Badge>
                                    ))}
                                </div>

                                <div className="flex items-center gap-3 pt-1">
                                    {!task.is_archived && (
                                        <div className={cn(
                                            "h-3 w-3 rounded-full shrink-0 shadow-sm",
                                            task.priority === 3 ? "bg-red-500 animate-pulse" : 
                                            task.priority === 2 ? "bg-blue-500" : "bg-slate-300"
                                        )} />
                                    )}
                                    <h1 className="font-black text-slate-900 truncate text-base uppercase tracking-tighter italic">
                                        {task.title}
                                    </h1>
                                </div>
                            </div>
                            <div className="text-slate-400 ml-2">
                                {isHeaderOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </div>
                        </div>

                        {isHeaderOpen && (
                            <div className="mt-4 animate-in fade-in zoom-in-95 duration-200">
                                <TaskDetailedInfo task={task} logs={initialTimeline} canEdit={canEdit} onEditClick={() => setIsEditOpen(true)} />
                            </div>
                        )}
                    </div>
                </div>

                {/* COLUMNA IZQUIERDA: TIMELINE */}
                <div className="flex-1 flex flex-col min-h-screen border-r border-slate-100 overflow-y-auto">
                    <div className="hidden lg:block p-8 border-b bg-slate-50/50">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex flex-wrap items-center gap-2">
                                {getBadges().map((badge, idx) => (
                                    <Badge key={idx} className={cn("text-[10px] gap-1 px-2.5 py-1 border-none text-white", badge.color)}>
                                        {badge.icon}
                                        {badge.text}
                                    </Badge>
                                ))}
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                ID-{task.id.slice(0,8).toUpperCase()}
                            </span>
                        </div>
                        <div className="flex items-center gap-4">
                            {!task.is_archived && (
                                <div className={cn(
                                    "h-4 w-4 rounded-full shrink-0 shadow-md",
                                    task.priority === 3 ? "bg-red-500 animate-pulse" : 
                                    task.priority === 2 ? "bg-blue-500" : "bg-slate-300"
                                )} />
                            )}
                            <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase leading-[0.9]">
                                {task.title}
                            </h1>
                        </div>
                    </div>

                    <div className="flex-1 p-4 lg:p-8">
                        <MaintenanceTimeline 
                            logs={initialTimeline}
                            task={task}
                            members={members}
                            currentUser={{ id: profile.id, isAdmin }}
                        />
                        
                    </div>
                </div>

                {/* COLUMNA DERECHA: METADATOS */}
                <div className="hidden lg:block w-80 p-8 space-y-8 bg-slate-50/30 sticky top-0 h-screen overflow-y-auto no-scrollbar">
                    
                    {/* Nuevo bloque de estado rápido */}
                    <section className="space-y-4">
                        <div className="flex flex-col gap-3">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                Estado y Agenda
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {getBadges().map((badge, idx) => (
                                    <Badge 
                                        key={idx} 
                                        className={cn(
                                            "text-[10px] gap-1.5 px-3 py-1.5 border-none text-white shadow-sm transition-all hover:scale-105", 
                                            badge.color
                                        )}
                                    >
                                        {badge.icon}
                                        {badge.text}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        {/* Separador sutil */}
                        <div className="h-px bg-slate-200 w-full" />

                        {/* Información detallada (Ubicación, Responsable, etc.) */}
                        <TaskDetailedInfo 
                            task={task} 
                            logs={initialTimeline} 
                            canEdit={canEdit} 
                            onEditClick={() => setIsEditOpen(true)} 
                        />
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