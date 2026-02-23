import { useEffect, useState } from 'react';
import { getTaskLocationPath } from '@/utils/location-utils';
import Link from 'next/link';
import { ArrowRight, MapPin, ShieldCheck,Home, Box } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function TaskRow({ task, TypeIcon, property, locationInfo}: any) {
    const [path, setPath] = useState<string>("Cargando...");

    useEffect(() => {
        async function loadPath() {
            const fullPath = await getTaskLocationPath(task);
            setPath(fullPath);
        }
        loadPath();
    }, [task]);

    return (
        // Hacemos que toda la fila sea clickeable con un truco de CSS o usando Link en las celdas
        <tr className="hover:bg-blue-50/50 transition-colors group cursor-pointer relative">
            <td className="px-6 py-4 relative">
                {/* Link invisible que cubre la fila (técnica limpia) */}
                <Link href={`/maintenance/task/${task.id}`} className="absolute inset-0 z-10"/>
                
                <div className="flex items-center gap-3 relative z-20 pointer-events-none">
                    <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-white transition-colors border border-transparent group-hover:border-slate-200">
                        <TypeIcon type={task.type} className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-800 line-clamp-1">{task.title}</p>
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">#{task.id.slice(0,5)}</p>
                    </div>
                </div>
            </td>
            
            <td className="px-6 py-4 relative z-0">
                <div className="flex items-center gap-2 text-slate-500 max-w-[200px]">
                    <Home size={12} className="shrink-0" />
                    <span className="text-[11px] font-medium truncate italic text-slate-400">
                        {property?.name || 'Personal'}
                    </span>
                </div>
            </td>

            
            <td className="px-6 py-4 relative z-0">
                <div className="flex items-center gap-2 text-slate-500 max-w-[200px]">
                    {locationInfo.isItem ? (
                        <Box size={12} className="shrink-0" /> // Icono para ítems/objetos
                        ) : (
                        <MapPin size={12} className="shrink-0" /> // Icono para estancias/casas
                        )}
                    <span className="text-[11px] font-medium truncate italic text-slate-400">
                        {locationInfo.label}
                    </span>
                </div>
            </td>

            <td className="px-6 py-4 relative z-0">
                <Badge className={cn(
                    "text-[9px] uppercase font-black px-2 py-0.5 rounded-full border-none shadow-none",
                    task.status === 'pendiente' ? "bg-amber-100 text-amber-700" :
                    task.status === 'en_proceso' ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                )}>
                    {task.status.replace('_', ' ')}
                </Badge>
            </td>

            <td className="px-6 py-4 text-center relative z-0">
                {task.insurance_status ? (
                    <div className="inline-flex p-1 bg-orange-100 rounded text-orange-600">
                        <ShieldCheck size={14} strokeWidth={3} />
                    </div>
                ) : <span className="text-slate-300">-</span>}
            </td>

            <td className="px-6 py-4 relative z-0">
                <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-[9px] font-black uppercase">
                        {task.assigned_member?.name?.charAt(0) || 'U'}
                    </div>
                    <span className="text-xs font-bold text-slate-600 truncate max-w-[80px]">
                        {task.assigned_member?.name?.split(' ')[0] || 'S/A'}
                    </span>
                </div>
            </td>
        </tr>
    );
}