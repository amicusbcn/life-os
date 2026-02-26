import { cn } from "@/lib/utils";
import LoadIcon from "@/utils/LoadIcon";
import { getTaskLocationPath } from "@/utils/location-utils";
import { Badge, Box, Home, MapPin, Package, ShieldCheck, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export function TaskRow({ task, TypeIcon, property, locationInfo,statusIcon }: any) {
    const [path, setPath] = useState<string>("Cargando...");

    useEffect(() => {
        async function loadPath() {
            const fullPath = await getTaskLocationPath(task);
            setPath(fullPath);
        }
        loadPath();
    }, [task]);

    return (
        <tr className="hover:bg-blue-50/50 transition-colors group cursor-pointer relative">
            <td className="px-6 py-4 relative">
                <Link href={`/maintenance/task/${task.id}`} className="absolute inset-0 z-10"/>
                
                <div className="flex items-center gap-3 relative z-20 pointer-events-none">
                    <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-white transition-colors border border-transparent group-hover:border-slate-200 shadow-sm">
                        <TypeIcon type={task.type} className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="text-sm font-black text-slate-800 line-clamp-1 uppercase italic tracking-tighter">
                            {task.title}
                        </p>
                    </div>
                </div>
            </td>
            {/* COLUMNA CATEGORIA */}
            <td className="px-6 py-4 relative z-0">
                <div className="flex flex-col text-center">
                    <div className="flex items-center gap-1.5 justify-center">
                        <LoadIcon name={task.category?.icon||"CirlceQuestion"} size={15} className={`shrink-0  text-${task.category?.color || "slate-400"}`} />
                    </div>
                    <span className={`text-[11px] font-bold  truncate text-${task.category?.color || "slate-400"}`}>
                        {task.category?.name || 'Sin Categoría'}
                    </span>
                </div>
            </td>
            {/* COLUMNA ÁMBITO (Propiedad o Personal) */}
            <td className="px-6 py-4 relative z-0">
                <div className="flex flex-col text-center">
                    <div className="flex items-center gap-1.5 text-slate-500 justify-center">
                        {property?(
                            <Home size={16} className="shrink-0 text-slate-400" />
                        ):(
                            <User size={16} className="shrink-0 text-blue-400" />
                        )}
                    </div>
                    <span className="text-[11px] font-bold text-slate-600 truncate">
                        {property?.name || 'Personal'}
                    </span>
                </div>
            </td>

            

            {/* COLUMNA UBICACIÓN ESPECÍFICA */}
            <td className="px-6 py-4 relative z-0 text-center">
                <div className="flex items-center gap-2 text-slate-500 text-center justify-center">
                    {locationInfo.isItem ? <Package size={12} className="text-blue-400" /> : <MapPin size={12} className="text-slate-400" />}
                    
                </div>
                <span className="text-[11px] font-medium text-slate-500 italic">
                        {locationInfo.label}
                    </span>
            </td>

            {/* ESTADO */}
            <td className="px-6 py-4 relative z-0 text-center justify-center">
                <div className="flex justify-center">
                {statusIcon}
                </div>
            </td>

            {/* SEGURO */}
            <td className="px-6 py-4 text-center relative z-0 justify-center">
                {task.insurance_status !== "no" ? (
                    <div className="inline-flex p-1.5 bg-orange-100 rounded-lg text-orange-600 shadow-sm border border-orange-200">
                        <ShieldCheck size={14} strokeWidth={3} />
                    </div>
                ) : <span className="text-slate-200">-</span>}
            </td>

            {/* RESPONSABLE */}
            <td className="px-6 py-4 relative z-0 text-center">
                <div className="flex items-center gap-2 justify-center">
                    <div className="h-7 w-7 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-black border-2 border-white shadow-sm">
                        {task.assigned_member?.full_name?.charAt(0) || '-'}
                    </div>
                </div>
                <span className="text-[11px] font-bold text-slate-600 truncate text-center">
                    {task.assigned_member?.full_name?.split(' ')[0] || 'S/A'}
                </span>
            </td>
        </tr>
    );
}