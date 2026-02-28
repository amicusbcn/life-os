// app/maintenance/components/MaintenanceCalendar.tsx
'use client';

import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { CheckCircle2, Calendar as CalendarIcon, AlertCircle } from "lucide-react";
import Link from 'next/link';

export function MaintenanceCalendar({ actions =[]}: { actions: any[] }) {
    const today = new Date();
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    
    // Generamos los días para la rejilla (incluyendo días de la semana anterior/posterior para rellenar)
    const days = eachDayOfInterval({
        start: startOfWeek(monthStart, { weekStartsOn: 1 }),
        end: endOfWeek(monthEnd, { weekStartsOn: 1 })
    });

    return (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Cabecera del Mes */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-xl font-black uppercase tracking-tighter text-slate-800">
                    {format(today, 'MMMM yyyy', { locale: es })}
                </h2>
                <div className="flex gap-4 text-[10px] font-bold uppercase">
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500"/> Pendientes</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500"/> Realizadas</div>
                </div>
            </div>

            {/* Grid de Días */}
            <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/30">
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
                    <div key={d} className="py-2 text-center text-[10px] font-black text-slate-400 uppercase">{d}</div>
                ))}
            </div>

            <div className="grid grid-cols-7 auto-rows-[120px]">
                {days.map((day, idx) => {
                    const dayActions = actions.filter(a => isSameDay(new Date(a.activity_date), day));
                    const isCurrentMonth = isSameDay(startOfMonth(day), monthStart);

                    return (
                        <div key={idx} className={cn(
                            "border-r border-b border-slate-100 p-2 transition-colors hover:bg-slate-50/50",
                            !isCurrentMonth && "bg-slate-50/30 opacity-40"
                        )}>
                            <span className={cn(
                                "text-[10px] font-bold ml-1",
                                isSameDay(day, today) ? "bg-blue-600 text-white px-1.5 py-0.5 rounded-md" : "text-slate-400"
                            )}>
                                {format(day, 'd')}
                            </span>

                            <div className="mt-2 space-y-1 overflow-y-auto max-h-[80px] scrollbar-none">
                                {dayActions.map(action => (
                                    <Link 
                                        href={`/maintenance/task/${action.task_id}`}
                                        key={action.id}
                                        className={cn(
                                            "block p-1 rounded-md text-[9px] font-bold leading-tight border transition-transform active:scale-95",
                                            action.is_completed 
                                                ? "bg-green-50 border-green-100 text-green-700" 
                                                : "bg-blue-50 border-blue-100 text-blue-700"
                                        )}
                                    >
                                        <div className="flex items-center gap-1 truncate">
                                            {action.is_completed ? <CheckCircle2 size={8}/> : <CalendarIcon size={8}/>}
                                            <span className="truncate">{action.task.title}</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}