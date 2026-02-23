'use client';


import { Badge } from "@/components/ui/badge";
import { Wrench, ArrowUpRight, Loader2, Plus } from "lucide-react";
import Link from 'next/link';

interface Props {
    tasks: any[]; // Las tareas ya vienen masticadas del servidor
    itemId: string;
}

export function MaintenanceList({ tasks, itemId }: Props) {
    // Ya no hay loading state aquí, porque el Server Component espera a tener los datos
    
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Historial</h3>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-full text-[10px] font-black hover:bg-orange-100 transition-colors border border-orange-100 uppercase italic">
                    <Plus className="w-3 h-3" /> Añadir Tarea
                </button>
            </div>

            {tasks.length > 0 ? (
                <div className="grid gap-3">
                    {tasks.map((task) => (
                        <div key={task.id} className="bg-white border border-slate-100 rounded-xl p-3 hover:border-blue-200 transition-all flex justify-between items-center group">
                            <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-700 truncate italic">{task.title}</p>
                                <div className="flex gap-2 mt-1 items-center">
                                    <Badge variant="outline" className="text-[8px] h-4 uppercase font-black px-1.5 border-slate-200 text-slate-400">
                                        {task.status}
                                    </Badge>
                                    <span className="text-[9px] text-slate-400 uppercase font-medium italic">
                                        {new Date(task.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                            <Link 
                                href={`/maintenance/task/${task.id}`}
                                className="p-2 rounded-lg bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            >
                                <ArrowUpRight size={14} />
                            </Link>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-10 text-center border-2 border-dashed rounded-2xl border-slate-100">
                    <Wrench className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-xs text-slate-400 font-medium italic">No hay tareas registradas</p>
                </div>
            )}
        </div>
    );
}