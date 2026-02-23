import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { MapPin, ShieldCheck } from "lucide-react";
import Link from "next/link";

export function TaskCard({ task, TypeIcon }: any) {
    // Definimos el color según la prioridad para el borde lateral
    const priorityColor = 
        task.priority === 4 ? 'bg-red-500' : 
        task.priority === 3 ? 'bg-orange-500' : 
        task.priority === 2 ? 'bg-blue-500' : 'bg-slate-300';

    return (
        <Link href={`/maintenance/task/${task.id}`} className="block group">
            <Card className="relative overflow-hidden p-5 rounded-3xl border-slate-200 hover:shadow-xl hover:border-blue-300 transition-all cursor-pointer h-full bg-white flex flex-col">
                
                {/* Indicador de Prioridad Lateral */}
                <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", priorityColor)} />

                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-slate-50 group-hover:bg-blue-50 transition-colors rounded-xl border border-slate-100 group-hover:border-blue-100">
                            <TypeIcon type={task.type} className="h-4 w-4" />
                        </div>
                        {task.insurance_status && (
                            <div className="p-2 bg-orange-50 rounded-xl border border-orange-100 text-orange-600 shadow-sm">
                                <ShieldCheck size={14} strokeWidth={3} />
                            </div>
                        )}
                    </div>
                    <Badge variant="outline" className={cn(
                        "text-[9px] uppercase tracking-tighter font-black border-none px-2 py-1",
                        task.status === 'pendiente' ? "bg-amber-50 text-amber-700" :
                        task.status === 'en_proceso' ? "bg-blue-50 text-blue-700" : "bg-green-50 text-green-700"
                    )}>
                        {task.status.replace('_', ' ')}
                    </Badge>
                </div>

                <div className="flex-1">
                    <h3 className="font-black text-slate-800 leading-tight mb-2 group-hover:text-blue-600 transition-colors line-clamp-2 uppercase italic text-sm tracking-tight">
                        {task.title}
                    </h3>
                    
                    {/* Ubicación estilo breadcrumb */}
                    <div className="flex items-center gap-1.5 text-slate-400 mb-4">
                        <MapPin size={10} />
                        <span className="text-[10px] font-bold uppercase truncate max-w-[180px]">
                            {task.property?.name || 'Personal'} 
                            {task.location?.name && ` • ${task.location.name}`}
                        </span>
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-50 flex justify-between items-center mt-auto">
                    <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-black border-2 border-white shadow-sm">
                            {task.assigned_member?.full_name?.charAt(0) || 'U'}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[9px] text-slate-400 font-black uppercase leading-none mb-0.5">Asignado</span>
                            <span className="text-[10px] font-bold text-slate-700 leading-none">
                                {task.assigned_member?.full_name?.split(' ')[0] || 'Sin asignar'}
                            </span>
                        </div>
                    </div>
                    
                    <div className="text-right">
                        <span className="text-[9px] text-slate-300 font-mono block">
                            {new Date(task.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                        </span>
                    </div>
                </div>
            </Card>
        </Link>
    );
}