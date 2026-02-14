// app/inventory/components/MaintenanceList.tsx
'use client';

import { MaintenanceCard } from './MaintenanceCard';
import { MaintenanceNewDialog } from './MaintenanceNewDialog';
import { Wrench, Plus } from 'lucide-react';

interface Props {
    itemId: string;
    tasks: any[];
    profiles: any[];
}

export function MaintenanceList({ itemId, tasks = [], profiles = [] }: Props) {
    return (
        <div className="space-y-6 pb-10">
            {/* Header con botón de añadir */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Historial de Tareas</h3>
                    <p className="text-xs text-slate-500">{tasks.length} registros encontrados</p>
                </div>
                
                <MaintenanceNewDialog itemId={itemId} profiles={profiles}>
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-full text-xs font-bold hover:bg-orange-100 transition-colors border border-orange-100">
                        <Plus className="w-3 h-3" /> Añadir Tarea
                    </button>
                </MaintenanceNewDialog>
            </div>

            {/* Lista de Cards */}
            {tasks.length > 0 ? (
                <div className="grid gap-3">
                    {tasks.sort((a, b) => new Date(b.last_maintenance_date).getTime() - new Date(a.last_maintenance_date).getTime()).map((task) => (
                        <MaintenanceCard key={task.id} task={task} profiles={profiles} />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-2xl border-slate-100 bg-slate-50/50">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3">
                        <Wrench className="w-5 h-5 text-slate-300" />
                    </div>
                    <p className="text-sm text-slate-500 font-medium">No hay mantenimientos registrados</p>
                    <p className="text-[11px] text-slate-400">Registra revisiones, cambios de filtros o reparaciones.</p>
                </div>
            )}
        </div>
    );
}