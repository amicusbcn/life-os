// app/settings/modules/components/ModuleCard.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import LoadIcon from '@/utils/LoadIcon';
import { toast } from 'sonner';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { toggleModuleStatus } from '../actions'; 
import { EditModuleSheet } from './EditModuleSheet';

export function ModuleCard({ module }: { module: any }) {
    const [isActive, setIsActive] = useState(module.is_active);

    const handleToggle = async (targetState: boolean) => {
        if (isActive === targetState) return; // No hacer nada si ya está en ese estado

        const previousState = isActive;
        setIsActive(targetState); // Update optimista

        toast.promise(
            toggleModuleStatus(module.id, targetState), 
            {
                loading: 'Actualizando módulo...',
                success: `Módulo ${module.name} ${targetState ? 'activado' : 'desactivado'}`,
                error: () => {
                    setIsActive(previousState);
                    return 'Error al comunicar con el núcleo';
                }
            }
        );
    };
    return (
        <Card className={`overflow-hidden transition-all duration-300 border-slate-200 ${!module.is_active ? 'bg-slate-50/50 opacity-80' : 'bg-white shadow-sm'}`}>
            <CardHeader className="p-x5 pb-3">
                <div className="flex items-start justify-between">
                    <div className={`p-2.5 rounded-xl ${module.is_active ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-200 text-slate-400'}`}>
                        <LoadIcon name={module.icon || 'Package'} className="w-6 h-6" />
                    </div>
                    <div className="flex bg-slate-100 p-1 rounded-lg shrink-0 h-7 items-center border border-slate-200/50">
                        <button 
                            type="button" 
                            onClick={() => handleToggle(false)} 
                            className={cn(
                                "px-2 h-5 rounded-md flex items-center justify-center transition-all text-[9px] font-black tracking-tighter uppercase",
                                !isActive 
                                    ? "bg-red-500 shadow-sm text-white" 
                                    : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            OFF
                        </button>
                        <button 
                            type="button" 
                            onClick={() => handleToggle(true)} 
                            className={cn(
                                "px-2 h-5 rounded-md flex items-center justify-center transition-all text-[9px] font-black tracking-tighter uppercase",
                                isActive 
                                    ? "bg-emerald-500 shadow-sm text-white" 
                                    : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            ON
                        </button>
                    </div>
                </div>
                <div className="mt-4">
                    <CardTitle className={`text-lg font-bold ${module.is_active ? 'text-slate-900' : 'text-slate-400'}`}>{module.name}</CardTitle>
                    <CardDescription className={`font-mono text-[10px] uppercase tracking-tighter font-bold ${module.is_active ? 'text-indigo-500' : 'text-slate-300'}`}>
                        key: {module.key}
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent className="p-5 py-0 space-y-4">
                <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 h-8">
                    {module.description || 'Sin descripción configurada.'}
                </p>
                
                <div className="flex items-center justify-end pt-0">
                    <Badge variant="outline" className={`text-[10px] font-bold ${module.is_active ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-slate-400 bg-slate-100'}`}>
                        {module.is_active ? 'SISTEMA ACTIVO' : 'FUERA DE LÍNEA'}
                    </Badge>
                    <EditModuleSheet module={module} />
                </div>
            </CardContent>
        </Card>
    );
}