'use client';

import React, { useEffect ,useState} from 'react';
import { User, FileText, MapPin, Box, Calendar, Clock, ShieldAlert, Edit3, Home, User2, Activity } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getTaskLocationPath } from '@/utils/location-utils';

// --- FUNCIONES AUXILIARES ---
const getPriorityLabel = (priority: number) => {
    switch (priority) {
        case 1: return 'Baja';
        case 2: return 'Normal';
        case 3: return 'Alta';
        case 4: return 'Urgente';
        default: return 'Normal';
    }
};

const getPriorityColor = (priority: number) => {
    switch (priority) {
        case 1: return 'bg-slate-100 text-slate-600 border-slate-200';
        case 2: return 'bg-blue-50 text-blue-600 border-blue-100';
        case 3: return 'bg-orange-50 text-orange-600 border-orange-100';
        case 4: return 'bg-red-50 text-red-600 border-red-100';
        default: return 'bg-blue-50 text-blue-600 border-blue-100';
    }
};

// --- SUBCOMPONENTES AUXILIARES ---

function InfoCard({ label, value, color }: { label: string, value: string, color: 'red' | 'blue' | 'slate' | 'orange' }) {
    const colors = {
        red: 'bg-red-50 text-red-700 border-red-100',
        blue: 'bg-blue-50 text-blue-700 border-blue-100',
        slate: 'bg-slate-50 text-slate-700 border-slate-200',
        orange: 'bg-orange-50 text-orange-700 border-orange-100',
    };

    return (
        <div className={`p-3 rounded-xl border ${colors[color]} flex flex-col gap-0.5`}>
            <span className="text-[9px] font-black uppercase tracking-wider opacity-70">{label}</span>
            <span className="text-xs font-bold truncate">{value}</span>
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

export function TaskDetailedInfo({ 
    task, 
    logs, 
    canEdit,
    onEditClick // <--- Nueva prop para abrir el Sheet
}: { 
    task: any, 
    logs: any[],
    canEdit: boolean, 
    onEditClick?: () => void 
}) {    
    const [fullPath, setFullPath] = useState<string>("Cargando ubicación...");
    
    // Extraemos todas las fotos de todos los logs
    const allPhotos = logs.reduce((acc: string[], log) => {
        if (log.images && Array.isArray(log.images)) {
            return [...acc, ...log.images];
        }
        return acc;
    }, []);
    useEffect(() => {
        async function loadPath() {
            try {
                const path = await getTaskLocationPath(task);
                setFullPath(path);
            } catch (error) {
                console.error("Error cargando el path:", error);
                setFullPath("Error al cargar ubicación");
            }
        }
        loadPath();
    }, [task]);

    return (<div className="space-y-6">
            {/* 1. CABECERA DE ESTADO Y BOTÓN EDITAR */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex-1 p-3 bg-white rounded-2xl border-2 border-blue-100 shadow-sm ring-4 ring-blue-50/30 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0">
                        <Activity size={16} />
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Estado Actual</p>
                        <p className="text-sm font-black text-blue-700 uppercase italic tracking-wider">
                            {task.status || 'Pendiente'}
                        </p>
                    </div>
                </div>
                
                    {canEdit && (
                        <Button 
                            onClick={onEditClick}
                            variant="outline" 
                            size="icon" 
                            className="h-12 w-12 rounded-2xl border-slate-200 hover:bg-blue-50 hover:text-blue-600 transition-all shrink-0 shadow-sm"
                        >
                            <Edit3 size={20} />
                        </Button>
                    )}
            </div>

            {/* 2. DESCRIPCIÓN */}
            <section className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Descripción original</h3>
                <p className="text-sm text-slate-600 leading-relaxed italic">
                    "{task.description || 'Sin descripción detallada.'}"
                </p>
            </section>

            {/* 3. CLASIFICACIÓN RÁPIDA */}
            <div className="grid grid-cols-2 gap-2">
                <InfoCard label="Prioridad" value={getPriorityLabel(task.priority)} color={task.priority > 2 ? 'red' : 'blue'} />
                <InfoCard label="Tipo" value={task.type || 'Avería'} color="slate" />
                <InfoCard label="Categoría" value={task.category?.name || 'General'} color="slate" />
                <InfoCard label="Seguro" value={task.insurance_status ? 'Reclamado' : 'No reclamado'} color={task.insurance_status ? 'orange' : 'slate'} />
            </div>

            {/* 4. VINCULACIÓN Y CONTEXTO */}
            <section className="space-y-4 pt-2">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Localización</h3>
                <div className="space-y-3">
                    {/* El contexto: ¿Propiedad o Personal? */}
                    <MetaItem 
                        icon={task.is_personal ? <User2 size={14}/> : <Home size={14}/>} 
                        label="Contexto" 
                        value={task.is_personal ? 'Inventario Personal' : `Propiedad: ${task.properties?.name}`} 
                    />
                    {/* La ubicación física */}
                    <MetaItem 
                        icon={<MapPin size={14}/>} 
                        label="Ruta Completa" 
                        value={fullPath} 
                    />
                    {task.inventory_items && (
                        <MetaItem icon={<Box size={14}/>} label="Objeto" value={task.inventory_items.name} />
                    )}
                    <MetaItem icon={<User size={14}/>} label="Responsable" value={task.assigned_member?.name || 'Sin asignar'} />
                </div>
            </section>

            {/* 5. SEGURO (Si aplica) */}
            {task.insurance_status && (
                <section className="p-4 bg-orange-50/50 border border-orange-100 rounded-2xl flex items-center gap-4">
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