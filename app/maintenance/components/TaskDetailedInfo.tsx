// app/maintenance/components/TaskDetailedInfo.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { 
    User, MapPin, Box, Calendar, Clock, ShieldAlert, Edit3, Home, User2, Activity,
    TriangleAlert, CirclePlay, SquarePause, CircleCheck, OctagonX, 
    BarChart3, Layers, Tag, ShieldCheck,
    FileText,
    RefreshCw,
    Siren,
    Zap,
    Wrench
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { getTaskLocationPath } from '@/utils/location-utils';
import LoadIcon from '@/utils/LoadIcon';
import { cn } from '@/lib/utils';

// --- CONFIGURACIÓN DE ESTADOS (Unificada con el Header) ---
const statusConfig: Record<string, any> = {
    'pendiente': { icon: <TriangleAlert size={16} />, bgColor: 'bg-amber-500', text: 'Pendiente', lightColor: 'bg-amber-50 border-amber-100 text-amber-700' },
    'en_proceso': { icon: <CirclePlay size={16} />, bgColor: 'bg-blue-500', text: 'En proceso', lightColor: 'bg-blue-50 border-blue-100 text-blue-700' }, 
    'bloqueado': { icon: <SquarePause size={16} />, bgColor: 'bg-slate-500', text: 'Bloqueado', lightColor: 'bg-slate-50 border-slate-200 text-slate-700' }, 
    'completada': { icon: <CircleCheck size={16} />, bgColor: 'bg-green-500', text: 'Completada', lightColor: 'bg-green-50 border-green-100 text-green-700' }, 
    'cancelada': { icon: <OctagonX size={16} />, bgColor: 'bg-red-500', text: 'Cancelada', lightColor: 'bg-red-50 border-red-100 text-red-700' }
};

const getPriorityInfo = (priority: number) => {
    switch (priority) {
        case 1: return { label: 'Baja', color: 'slate', icon: <BarChart3 size={14} /> };
        case 2: return { label: 'Normal', color: 'blue', icon: <Activity size={14} /> };
        case 3: return { label: 'Alta', color: 'orange', icon: <TriangleAlert size={14} /> };
        case 4: return { label: 'Urgente', color: 'red', icon: <Siren size={14} /> };
        default: return { label: 'Normal', color: 'blue', icon: <Activity size={14} /> };
    }
};

const getTypeConfig = (type: string) => {
    const t = type?.toLowerCase();
    switch (t) {
        case 'preventivo':
            return { label: 'Preventivo', color: 'purple', icon: <RefreshCw size={14} /> };
        case 'mejora':
            return { label: 'Mejora', color: 'blue', icon: <Zap size={14} className="fill-blue-500/20" /> };
        case 'averia':
        default:
            return { label: 'Avería', color: 'slate', icon: <Wrench size={14} /> };
    }
};
// --- SUBCOMPONENTES ---

function InfoCard({ label, value, color, icon }: { label: string, value: string, color: string, icon: React.ReactNode }) {
    const colors: Record<string, string> = {
        red: 'bg-red-50 text-red-700 border-red-100',
        blue: 'bg-blue-50 text-blue-700 border-blue-100',
        slate: 'bg-slate-50 text-slate-700 border-slate-200',
        orange: 'bg-orange-50 text-orange-700 border-orange-100',
        purple: 'bg-purple-50 text-purple-700 border-purple-100',
    };

    return (
        <div className={cn("p-3 rounded-xl border flex flex-col gap-1", colors[color] || colors.slate)}>
            <span className="text-[9px] font-black uppercase tracking-widest opacity-60 leading-none">
                {label}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
                <span className="opacity-80 shrink-0">{icon}</span>
                <span className="text-xs font-bold truncate leading-none">{value}</span>
            </div>
        </div>
    );
}

function MetaItem({ icon, label, value }: { icon: React.ReactNode, label: string, value?: string }) {
    return (
        <div className="flex items-start gap-3 text-sm">
            <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-sm text-slate-400">
                {icon}
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-[10px] text-slate-400 font-bold uppercase leading-none mb-1">{label}</p>
                <p className="font-bold text-slate-700 leading-tight truncate">{value || 'No definido'}</p>
            </div>
        </div>
    );
}

// --- COMPONENTE PRINCIPAL ---

export function TaskDetailedInfo({ task, logs, canEdit, onEditClick }: { task: any, logs: any[], canEdit: boolean, onEditClick?: () => void }) {    
    const [fullPath, setFullPath] = useState<string>("Cargando ubicación...");
    const currentStatus = statusConfig[task.status] || statusConfig['pendiente'];
    const priority = getPriorityInfo(task.priority);
    const type = getTypeConfig(task.type);
    const hasInsurance = task.insurance_status && task.insurance_status !== 'no';
    const allPhotos = logs.reduce((acc: string[], log) => {
        if (log.images && Array.isArray(log.images)) return [...acc, ...log.images];
        return acc;
    }, []);

    useEffect(() => {
        async function loadPath() {
            try {
                const path = await getTaskLocationPath(task);
                setFullPath(path);
            } catch (e) { setFullPath("Error al cargar ubicación"); }
        }
        loadPath();
    }, [task]);

    return (
        <div className="space-y-6 pb-8 ">
            {/* 1. CABECERA DE ESTADO UNIFICADA */}
            <div className="flex items-center justify-between gap-3">
                <div className={cn("flex-1 p-3 rounded-2xl border-2 shadow-sm flex items-center gap-3 transition-colors", currentStatus.lightColor)}>
                    <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-white shrink-0 shadow-md", currentStatus.bgColor)}>
                        {currentStatus.icon}
                    </div>
                    <div>
                        <p className="text-[9px] font-black uppercase leading-none mb-1 opacity-70">Estado Actual</p>
                        <p className="text-sm font-black uppercase italic tracking-wider leading-none">
                            {currentStatus.text}
                        </p>
                    </div>
                </div>
                
                {canEdit && (
                    <Button onClick={onEditClick} variant="outline" size="icon" className="h-12 w-12 rounded-2xl border-slate-200 hover:bg-slate-50 shrink-0 shadow-sm">
                        <Edit3 size={20} />
                    </Button>
                )}
            </div>

            {/* 2. DESCRIPCIÓN */}
            <section className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10"><FileText size={40} /></div>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Descripción original</h3>
                <p className="text-sm text-slate-600 leading-relaxed italic relative z-10">
                    "{task.description || 'Sin descripción detallada.'}"
                </p>
            </section>

            {/* 3. CLASIFICACIÓN RÁPIDA CON ICONOS */}
            <div className="grid grid-cols-2 gap-2">
                <InfoCard 
                    label="Prioridad" 
                    value={priority.label} 
                    color={priority.color as any} 
                    icon={priority.icon} 
                />
                <InfoCard 
                    label="Tipo" 
                    value={type.label} 
                    color={type.color as any} 
                    icon={type.icon} 
                />
                <InfoCard 
                    label="Categoría" 
                    value={task.category?.name || 'General'} 
                    color="slate" 
                    icon={<LoadIcon name={task.category?.icon || 'Tag'} className="h-3 w-3" />}
                />
                <InfoCard 
                    label="Seguro" 
                    value={hasInsurance ? 'Reclamado' : 'No aplica'} 
                    color={hasInsurance ? 'orange' : 'slate'} 
                    icon={<ShieldCheck size={12} />}
                />
            </div>

            {/* 4. LOCALIZACIÓN Y RESPONSABLE */}
            <section className="space-y-4 pt-2">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Detalles de asignación</h3>
                <div className="bg-white rounded-2xl border border-slate-100 p-1 space-y-1 shadow-sm">
                    <MetaItem 
                        icon={task.is_personal ? <User2 size={14}/> : <Home size={14}/>} 
                        label="Entorno" 
                        value={task.is_personal ? 'Inventario Personal' : task.properties?.name} 
                    />
                    <MetaItem icon={<MapPin size={14}/>} label="Ubicación" value={fullPath} />
                    {task.inventory_items && (
                        <MetaItem icon={<Box size={14}/>} label="Elemento" value={task.inventory_items.name} />
                    )}
                    <MetaItem icon={<User size={14}/>} label="Asignado a" value={task.assigned_member?.name || 'Sin asignar'} />
                </div>
            </section>

            {/* 5. SEGURO (Si aplica) */}
            {hasInsurance && (
                <section className="p-4 bg-orange-50/50 border border-orange-100 rounded-2xl flex items-center gap-4 animate-in fade-in slide-in-from-right-2">
                    <div className="h-10 w-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center shrink-0">
                        <ShieldAlert size={20} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest leading-none mb-1">Seguro</p>
                        <p className="text-xs font-bold text-orange-900 truncate">Ref: {task.insurance_ref || 'Pendiente'}</p>
                    </div>
                </section>
            )}

            {/* 6. GALERÍA TOTAL */}
            {allPhotos.length > 0 && (
                <section className="space-y-3">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Galería ({allPhotos.length})</h3>
                    <div className="grid grid-cols-4 gap-2">
                        {allPhotos.map((url: string, i: number) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-lg overflow-hidden border border-slate-200 hover:ring-2 hover:ring-blue-500 transition-all shadow-sm">
                                <img src={url} className="object-cover h-full w-full" alt={`Evidencia ${i}`} />
                            </a>
                        ))}
                    </div>
                </section>
            )}

            {/* 7. FECHAS */}
            <footer className="pt-6 border-t border-slate-100 flex flex-col gap-2 opacity-60">
                <div className="flex justify-between items-center text-[9px] text-slate-400 font-mono uppercase">
                    <div className="flex items-center gap-1"><Calendar size={10} /> {format(new Date(task.created_at), "dd/MM/yyyy")}</div>
                    <div className="flex items-center gap-1"><Clock size={10} /> Act: {format(new Date(task.updated_at), "dd/MM/yyyy")}</div>
                </div>
            </footer>
        </div>
    );
}