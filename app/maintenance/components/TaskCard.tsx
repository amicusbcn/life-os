import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import LoadIcon from "@/utils/LoadIcon";
import { Home, User, Package, MapPin, ShieldCheck } from "lucide-react";
import Link from "next/link";

export function TaskCard({ task, TypeIcon, property, locationInfo, statusIcon }: any) {
    // Mantenemos el color de prioridad para el acento lateral
    const priorityColor = 
        task.priority === 4 ? 'bg-red-500' : 
        task.priority === 3 ? 'bg-orange-500' : 
        task.priority === 2 ? 'bg-blue-500' : 'bg-slate-300';

    return (
        <Link href={`/maintenance/task/${task.id}`} className="block group h-full">
            <Card className="relative overflow-hidden p-5 rounded-[2rem] border-slate-200 hover:shadow-2xl hover:border-blue-300 transition-all cursor-pointer h-full bg-white flex flex-col border-b-4">
                
                {/* Indicador de Prioridad Lateral */}
                <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", priorityColor)} />

                {/* HEADER DE LA CARD: Tipo, Seguro y Estado */}
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2.5 bg-slate-50 group-hover:bg-blue-50 transition-colors rounded-2xl border border-slate-100 group-hover:border-blue-100 shadow-sm">
                            <TypeIcon type={task.type} className="h-4 w-4" />
                        </div>
                        {task.insurance_status !== "no" && (
                            <div className="p-2 bg-orange-50 rounded-xl border border-orange-100 text-orange-600 shadow-sm">
                                <ShieldCheck size={14} strokeWidth={3} />
                            </div>
                        )}
                    </div>
                    {/* El icono de estado que pasamos desde el View */}
                    <div className="scale-110">
                        {statusIcon}
                    </div>
                </div>

                <div className="flex-1">
                    {/* ÁMBITO Y CATEGORÍA */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                        <div className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md">
                            {property ? (
                                <Home size={10} className="text-slate-500" />
                            ) : (
                                <User size={10} className="text-blue-500" />
                            )}
                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                                {property?.name || 'Personal'}
                            </span>
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                            <LoadIcon 
                                name={task.category?.icon || "CircleQuestion"} 
                                size={12} 
                                className={`text-${task.category?.color || "slate-400"}`} 
                            />
                            <span className={`text-[10px] font-bold uppercase tracking-tighter text-${task.category?.color || "slate-400"}`}>
                                {task.category?.name || 'Sin Categoría'}
                            </span>
                        </div>
                    </div>
                    
                    {/* TÍTULO */}
                    <h3 className="font-black text-slate-800 leading-tight mb-3 group-hover:text-blue-600 transition-colors line-clamp-2 uppercase italic text-base tracking-tighter">
                        {task.title}
                    </h3>
                    
                    {/* UBICACIÓN */}
                    <div className="flex items-center gap-2 text-slate-400 bg-slate-50/80 p-2 rounded-xl border border-slate-100/50 mb-4">
                        {locationInfo.isItem ? (
                            <Package size={12} className="text-blue-400" />
                        ) : (
                            <MapPin size={12} className="text-slate-400" />
                        )}
                        <span className="text-[10px] font-bold uppercase truncate italic">
                            {locationInfo.label}
                        </span>
                    </div>
                </div>

                {/* FOOTER: Responsable y Fecha */}
                <div className="pt-4 border-t border-slate-50 flex justify-between items-center mt-auto">
                    <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-black border-2 border-white shadow-md">
                            {task.assigned_member?.full_name?.charAt(0) || '-'}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[8px] text-slate-400 font-black uppercase leading-none mb-1 text-left">Asignado</span>
                            <span className="text-[11px] font-bold text-slate-700 leading-none">
                                {task.assigned_member?.full_name?.split(' ')[0] || 'S/A'}
                            </span>
                        </div>
                    </div>
                    
                    <span className="text-[10px] font-mono text-slate-300 font-bold">
                        {new Date(task.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }).replace('.', '')}
                    </span>
                </div>
            </Card>
        </Link>
    );
}