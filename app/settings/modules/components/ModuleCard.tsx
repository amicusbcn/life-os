'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import LoadIcon from '@/utils/LoadIcon';
import { toast } from 'sonner';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { toggleModuleStatus } from '../actions'; 
import { EditModuleSheet } from './EditModuleSheet';
import { ModuleChangelogSheet } from './ModuleChangelogSheet'; // Componente nuevo que crearemos
import { History } from 'lucide-react';

export function ModuleCard({ module }: { module: any }) {
    const [isActive, setIsActive] = useState(module.is_active);

    const handleToggle = async (targetState: boolean) => {
        if (isActive === targetState) return;

        const previousState = isActive;
        setIsActive(targetState);

        toast.promise(
            toggleModuleStatus(module.id, targetState), 
            {
                loading: 'Actualizando núcleo...',
                success: `Módulo ${module.name} ${targetState ? 'activado' : 'desactivado'}`,
                error: () => {
                    setIsActive(previousState);
                    return 'Error al comunicar con el núcleo';
                }
            }
        );
    };

    // Color según el estado (status)
    const statusColors = {
        development: 'bg-amber-100 text-amber-700 border-amber-200',
        beta: 'bg-blue-100 text-blue-700 border-blue-200',
        stable: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        deprecated: 'bg-red-100 text-red-700 border-red-200',
    };

    return (
        <Card className={`overflow-hidden transition-all duration-300 border-slate-200 ${!module.is_active ? 'bg-slate-50/50 opacity-80' : 'bg-white shadow-sm'}`}>
            <CardHeader className="p-x5 pb-3">
                <div className="flex items-start justify-between">
                    <div className={`p-2.5 rounded-xl ${module.is_active ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-200 text-slate-400'}`}>
                        <LoadIcon name={module.icon || 'Package'} className="w-6 h-6" />
                    </div>
                    
                    {/* Switch ON/OFF estilo minimalista */}
                    <div className="flex bg-slate-100 p-1 rounded-lg shrink-0 h-7 items-center border border-slate-200/50">
                        <button onClick={() => handleToggle(false)} className={cn("px-2 h-5 rounded-md text-[9px] font-black tracking-tighter uppercase transition-all", !isActive ? "bg-red-500 shadow-sm text-white" : "text-slate-400 hover:text-slate-600")}>OFF</button>
                        <button onClick={() => handleToggle(true)} className={cn("px-2 h-5 rounded-md text-[9px] font-black tracking-tighter uppercase transition-all", isActive ? "bg-emerald-500 shadow-sm text-white" : "text-slate-400 hover:text-slate-600")}>ON</button>
                    </div>
                </div>

                <div className="mt-4 space-y-1">
                    <div className="flex items-center gap-2">
                        <CardTitle className={`text-lg font-bold ${module.is_active ? 'text-slate-900' : 'text-slate-400'}`}>{module.name}</CardTitle>
                        {module.current_version && (
                            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
                                v{module.current_version}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <CardDescription className={`font-mono text-[10px] uppercase tracking-tighter font-bold ${module.is_active ? 'text-indigo-500' : 'text-slate-300'}`}>
                            {module.key}
                        </CardDescription>
                        {module.status && (
                            <Badge variant="outline" className={cn("text-[8px] h-4 px-1 uppercase tracking-widest border-none font-black", statusColors[module.status as keyof typeof statusColors])}>
                                {module.status}
                            </Badge>
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-5 py-0 space-y-4">
                <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 h-8">
                    {module.description || 'Sin descripción configurada.'}
                </p>
                
                <div className="flex items-center justify-between pt-0 border-t border-slate-50 mt-2">
                    <Badge variant="outline" className={`text-[9px] font-bold border-none px-0 ${module.is_active ? 'text-emerald-500' : 'text-slate-400'}`}>
                        {module.is_active ? '● SISTEMA ACTIVO' : '○ FUERA DE LÍNEA'}
                    </Badge>
                    
                    <div className="flex items-center gap-1">
                        <ModuleChangelogSheet  module={module} />
                        <EditModuleSheet module={module} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}