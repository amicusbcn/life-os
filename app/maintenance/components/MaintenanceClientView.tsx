// app/maintenance/components/MaintenanceClientView.tsx
'use client';

import { useMemo, useState } from 'react';
import { UnifiedAppSidebar } from '@/components/layout/UnifiedAppSidebar'; // Ajusta la ruta
import { MaintenanceMenu } from './MaintenanceMenu'; // Lo creamos ahora
import { MaintenanceTask } from '@/types/maintenance';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wrench, AlertTriangle, Lightbulb, Home, LayoutGrid, List, Search } from 'lucide-react';
import { PropertyBase, PropertyLocation } from '@/types/properties';
import { InventoryItemBase } from '@/types/inventory';
import { AppModule } from '@/types/users';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TaskCard } from './TaskCard';
import { TaskRow } from './TaskRow';

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
    history?: boolean; 
    categories?: any[]; // Puedes tipar esto mejor según tu estructura de categorías
    currentProperty?: PropertyBase; // ✨ Para el contexto de la propiedad
}

export function MaintenanceClientView({ initialTasks, profile, accessibleModules, userRole, properties, locations, inventoryItems, users, history=false, categories,currentProperty }: Props) {
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [searchQuery, setSearchQuery] = useState('');
    const isPropertyContext=currentProperty?true:false;
    // Filtrado dinámico
    const filteredTasks = useMemo(() => {
        return initialTasks.filter(task => 
            task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            task.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [initialTasks, searchQuery]);

    const TypeIcon = ({ type, className }: { type: string, className?: string }) => {
        if (type === 'averia') return <AlertTriangle className={cn("text-red-500", className)} />;
        if (type === 'preventivo') return <Wrench className={cn("text-blue-500", className)} />;
        return <Lightbulb className={cn("text-yellow-500", className)} />;
    };

    const getTaskLocationLabel = (task: MaintenanceTask) => {
        // 1. Si la tarea apunta a un Ítem del Inventario
        if (task.item_id) {
            const item = inventoryItems.find(i => i.id === task.item_id);
            const prop = properties.find(p => p.id === task.property_id);
            
            // Formato: [Icono Caja] Lavadora (Casa Playa) o Lavadora (Personal)
            return {
                label: item?.name || 'Ítem desconocido',
                subLabel: prop ? prop.name : 'Personal',
                isItem: true
            };
        }

        // 2. Si la tarea apunta a una Ubicación física (Estancia)
        if (task.location_id) {
            const loc = locations.find(l => l.id === task.location_id);
            const prop = properties.find(p => p.id === task.property_id);
            
            return {
                label: loc?.name || 'Ubicación desconocida',
                subLabel: prop?.name || 'Propiedad',
                isItem: false
            };
        }

        // 3. Si solo tiene Propiedad (es una tarea general de la casa)
        const prop = properties.find(p => p.id === task.property_id);
        return {
            label: prop ? prop.name : 'Mi Inventario',
            subLabel: prop ? 'General' : 'Privado',
            isItem: false
        };
    };
    
    return (
        <UnifiedAppSidebar
            title={history? "Histórico de Mantenimiento" : "Tareas de Mantenimiento"}
            profile={profile}
            modules={accessibleModules}
            backLink={isPropertyContext?"/properties/"+currentProperty?.slug:""}
            moduleMenu={
                <MaintenanceMenu 
                    userRole={userRole}
                    properties={properties}
                    locations={locations}
                    inventoryItems={inventoryItems}
                    users={users}
                    history={history}
                />
            }
        >
            <div className="p-6">
                <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    {/* BARRA DE FILTROS RÁPIDOS */}
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <Input 
                            placeholder="Buscar por título, avería o descripción..."
                            className="pl-10 h-12 bg-white rounded-2xl border-slate-200 shadow-sm focus:ring-blue-500"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />

                    <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                        <Button 
                             
                            size="sm" 
                            onClick={() => setViewMode('grid')}
                            className={cn("rounded-lg h-8 px-3", viewMode === 'grid' && "shadow-sm")}
                        >
                            <LayoutGrid size={16} className="mr-2" /> Grid
                        </Button>
                        <Button 
                            variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                            size="sm" 
                            onClick={() => setViewMode('list')}
                            className={cn("rounded-lg h-8 px-3", viewMode === 'list' && "shadow-sm")}
                        >
                            <List size={16} className="mr-2" /> Lista
                        </Button>
                    </div>
                </header>



                {filteredTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-3xl border-slate-200 bg-slate-50/50">
                        <Wrench className="h-12 w-12 text-slate-300 mb-4 animate-pulse" />
                        <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">No se encontraron tareas</p>
                    </div>
                ) : (
                    viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredTasks.map((task) => {
                                const taskProperty = properties.find(p => p.id === task.property_id);
                                const locationInfo = getTaskLocationLabel(task);
                                return (
                                    <TaskCard 
                                        key={task.id} 
                                        task={task} 
                                        TypeIcon={TypeIcon} 
                                        property={taskProperty} 
                                        locationInfo={locationInfo}
                                    />
                                );
                            })}
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">
                                        <th className="px-6 py-4">Tarea / Tipo</th>
                                        <th className="px-6 py-4">Propiedad</th>
                                        <th className="px-6 py-4">Ubicación</th>
                                        <th className="px-6 py-4">Estado</th>
                                        <th className="px-6 py-4">Seguro</th>
                                        <th className="px-6 py-4">Responsable</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredTasks.map((task) => {
                                        const locationInfo = getTaskLocationLabel(task);
                                        const taskProperty = properties.find(p => p.id === task.property_id);
                                        return (
                                            <TaskRow key={task.id} task={task} TypeIcon={TypeIcon}
                                                property={taskProperty} locationInfo={locationInfo}
                                            />
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )
                )}
            </div>
        </UnifiedAppSidebar>
    );
}