// app/maintenance/components/MaintenanceClientView.tsx
'use client';

import { useState } from 'react';
import { UnifiedAppSidebar } from '@/components/layout/UnifiedAppSidebar'; // Ajusta la ruta
import { MaintenanceMenu } from './MaintenanceMenu'; // Lo creamos ahora
import { MaintenanceTask } from '@/types/maintenance';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wrench, AlertTriangle, Lightbulb, Home } from 'lucide-react';
import { PropertyBase, PropertyLocation } from '@/types/properties';
import { InventoryItemBase } from '@/types/inventory';
import { AppModule } from '@/types/users';
import Link from 'next/link';

interface Props {initialTasks: MaintenanceTask[];
    properties: PropertyBase[];
    locations: PropertyLocation[];
    inventoryItems: InventoryItemBase[];
    users: any[];
    userRole: string;
    isAdminGlobal: boolean;        // ✨ Asegúrate de que esto esté aquí
    modulePermission?: string;
    profile: any;                 // ✨ Añadido
    accessibleModules: AppModule[];
}

export function MaintenanceClientView({ initialTasks, profile, accessibleModules,userRole, properties, locations, inventoryItems, users }: Props) {
    const [tasks] = useState<MaintenanceTask[]>(initialTasks);

    // Mapeo de iconos por tipo
    const TypeIcon = ({ type }: { type: string }) => {
        if (type === 'averia') return <AlertTriangle className="h-4 w-4 text-red-500" />;
        if (type === 'preventivo') return <Wrench className="h-4 w-4 text-blue-500" />;
        return <Lightbulb className="h-4 w-4 text-yellow-500" />;
    };

    return (
        <UnifiedAppSidebar
            title="Mantenimientos"
            profile={profile}
            modules={accessibleModules}
            moduleMenu={
                <MaintenanceMenu 
                    userRole={userRole}
                    properties={properties}
                    locations={locations}
                    inventoryItems={inventoryItems}
                    users={users}
                />
            }
        >
            <div className="p-6">
                <header className="mb-8">
                    <h1 className="text-3xl font-black tracking-tighter">MANTENIMIENTO</h1>
                    <p className="text-slate-500 text-sm">Resumen de salud de tus propiedades</p>
                </header>

                {tasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-3xl border-slate-200">
                        <Wrench className="h-12 w-12 text-slate-300 mb-4" />
                        <p className="text-slate-500 font-medium">No hay tareas pendientes</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {tasks.map((task) => (
                            <Link 
                                key={task.id} 
                                href={`/maintenance/task/${task.id}`} // <-- La nueva ruta
                                className="block group"
                            >
                                <Card className="p-5 rounded-2xl border-slate-200 hover:shadow-lg hover:border-blue-200 transition-all cursor-pointer h-full">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-2 bg-slate-50 group-hover:bg-blue-50 transition-colors rounded-xl">
                                            <TypeIcon type={task.type} />
                                        </div>
                                        <Badge variant="outline" className="text-[10px] uppercase tracking-widest font-bold border-slate-200">
                                            {task.status.replace('_', ' ')}
                                        </Badge>
                                    </div>

                                    <h3 className="font-bold text-slate-800 leading-snug mb-2 truncate group-hover:text-blue-600 transition-colors">
                                        {task.title}
                                    </h3>

                                    {/* ... resto del contenido de la card (ubicación, responsable, etc.) ... */}
                                    
                                    <div className="flex justify-between items-center mt-4">
                                        <div className="flex items-center gap-2">
                                            <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px]">
                                                {task.assigned_member?.name?.charAt(0) || '?'}
                                            </div>
                                            <span className="text-xs text-slate-500">
                                                {task.assigned_member?.name || 'Sin asignar'}
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-slate-400">
                                            {new Date(task.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </UnifiedAppSidebar>
    );
}