// app/maintenance/components/MaintenanceClientView.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { UnifiedAppSidebar } from '@/components/layout/UnifiedAppSidebar'; // Ajusta la ruta
import { MaintenanceMenu } from './MaintenanceMenu'; // Lo creamos ahora
import { MaintenanceTask } from '@/types/maintenance';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wrench, AlertTriangle, Lightbulb, OctagonX, LayoutGrid, List, Search, ShieldCheck, TriangleAlert, CirclePlay, SquarePause, CircleCheck, Home, Tag, Globe, User, Siren } from 'lucide-react';
import { PropertyBase, PropertyLocation } from '@/types/properties';
import { InventoryItemBase } from '@/types/inventory';
import { AppModule } from '@/types/users';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TaskCard } from './TaskCard';
import { TaskRow } from './TaskRow';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { MaintenanceForm } from './MaintenanceForm';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SelectSeparator } from '@radix-ui/react-select';
import LoadIcon from '@/utils/LoadIcon';

interface Props {
    initialTasks: MaintenanceTask[];
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
    view?: string; // Para saber desde qué vista venimos (active, archived, preventive, me)
}

export function MaintenanceClientView({ initialTasks, profile, accessibleModules, userRole, properties, locations, inventoryItems, users, history=false, categories,currentProperty,view }: Props) {
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [searchQuery, setSearchQuery] = useState('');
    const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [contextFilter, setContextFilter] = useState<'all' | 'property' | 'personal'>('all');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [showUrgentOnly, setShowUrgentOnly] = useState(false);
    const [showInsuranceOnly, setShowInsuranceOnly] = useState(false);
    
    const isPropertyContext = !!currentProperty;

    // ✨ GESTIÓN DE EVENTOS DEL MENÚ
    useEffect(() => {
        const handleOpenTask = () => setIsNewTaskOpen(true);
        const handleOpenSettings = () => setIsSettingsOpen(true);

        window.addEventListener('open-new-task', handleOpenTask);
        window.addEventListener('open-maintenance-settings', handleOpenSettings);

        return () => {
            window.removeEventListener('open-new-task', handleOpenTask);
            window.removeEventListener('open-maintenance-settings', handleOpenSettings);
        };
    }, []);
    
    // Filtrado dinámico
    const filteredTasks = useMemo(() => {
        return initialTasks.filter(task => {
            // 1. Filtro por búsqueda de texto
            const matchesSearch = 
                task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                task.description?.toLowerCase().includes(searchQuery.toLowerCase());

            // 2. Filtro por Urgencia (Prioridad > 2 o según tu escala)
            const matchesUrgency = !showUrgentOnly || (task.priority && task.priority > 2);

            // 3. Filtro por Seguro
            const matchesInsurance = !showInsuranceOnly || (task.insurance_status !== 'no' || !!task.insurance_ref);
            
            // Filtro por Ámbito (Contexto)
            let matchesContext = true;
            if (contextFilter === 'personal') {
                matchesContext = !task.property_id;
            } else if (contextFilter !== 'all') {
                // Si no es 'all' ni 'personal', es que hemos seleccionado un ID de propiedad
                matchesContext = task.property_id === contextFilter;
            }

            // filtro por categoría
            const matchesCategory = selectedCategory === 'all' || task.category?.id === selectedCategory;

            return matchesSearch && matchesUrgency && matchesInsurance && matchesContext && matchesCategory;
        });
    }, [initialTasks, searchQuery, showUrgentOnly, showInsuranceOnly, contextFilter, selectedCategory]);
    const TypeIcon = ({ type, className }: { type: string, className?: string }) => {
        if (type === 'averia') return <TriangleAlert className={cn("text-amber-600", className)} />;
        if (type === 'preventivo') return <Wrench className={cn("text-blue-500", className)} />;
        return <Lightbulb className={cn("text-yellow-500", className)} />;
    };
    const statusIcon = {
        'pendiente': <TriangleAlert size={20} className="text-amber-500" />,
        'en_proceso': <CirclePlay size={20} className="text-blue-500" />, 
        'bloqueado': <SquarePause size={20} className="text-slate-500" />, 
        'completada': <CircleCheck size={20} className="text-green-500" />, 
        'cancelada': <OctagonX size={20} className="text-red-500" />
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
                    mode='operative'
                    view={view as "active" | "preventive" | "archived" }
                    isPropertyContext={isPropertyContext}
                    backLink={isPropertyContext ? { href: "/properties/"+currentProperty?.slug, label: "Propiedades" } : undefined}
                />
            }
            moduleSettings={
                <MaintenanceMenu
                    mode='settings'
                />
            }
        >
            <div className="p-6 pb-24"> {/* Espacio para el botón flotante si fuera necesario */}
                
                {/* 1. BARRA SUPERIOR DE FILTROS (Refactorizada) */}
                <header className="mb-8 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-2xl">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <Input 
                            placeholder="Buscar incidencias..."
                            className="pl-12 h-12 bg-white rounded-2xl border-slate-200 shadow-sm focus:ring-slate-900"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        {/* 1. SELECTOR DE ÁMBITO (Propiedad/Personal) */}
                        <Select 
                            value={contextFilter} 
                            onValueChange={(v: any) => setContextFilter(v)}
                        >
                            <SelectTrigger className="w-[200px] bg-white h-12 py-6 rounded-2xl shadow-sm border-slate-200 px-4">
                                <div className="flex items-center gap-2 truncate text-[11px] font-bold uppercase tracking-tight">
                                    <SelectValue placeholder="Ámbito" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-slate-200 shadow-xl max-h-[300px]">
                                <SelectItem value="all" className="font-bold text-[11px] uppercase tracking-tighter text-slate-500">
                                    <div className='flex item-center gap-2'>
                                        <Globe size={12} className="text-slate-400" />
                                        Ver todo
                                    </div>
                                </SelectItem>
                                <SelectItem value="personal" className="font-bold text-[11px] uppercase tracking-tighter">
                                    <div className='flex item-center gap-2'>
                                        <User size={12} className="text-slate-400" />
                                        Personal
                                    </div>
                                </SelectItem>
                                
                                {/* Separador visual para las propiedades */}
                                <div className="h-px bg-slate-100 my-1" />
                                <div className="px-2 py-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                    Mis Propiedades
                                </div>

                                {properties?.map(prop => (
                                    <SelectItem 
                                        key={prop.id} 
                                        value={prop.id} // Aquí usamos el ID de la propiedad para filtrar
                                        className="font-bold text-[11px] uppercase tracking-tighter"
                                    >
                                        <div className='flex item-center gap-2'>
                                            <Home size={12} className="text-slate-400" />
                                            {prop.name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* 2. SELECTOR DE CATEGORÍA */}
                        <Select 
                            value={selectedCategory} 
                            onValueChange={(v) => setSelectedCategory(v)}
                        >
                            <SelectTrigger className="w-[220px] bg-white h-12 rounded-2xl shadow-sm border-slate-200 px-4 py-6">
                                <div className="flex items-center gap-2 truncate text-[11px] font-bold uppercase tracking-tight">
                                    <SelectValue placeholder="Categoría" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-slate-200 shadow-xl">
                                <SelectItem value="all" className="font-bold text-[11px] uppercase tracking-tighter text-slate-500">
                                    <div className='flex item-center gap-2'>
                                        <Tag size={12} className="text-slate-400" />
                                        Todas las categorías
                                    </div>
                                </SelectItem>
                                
                                {categories?.map(cat => (
                                    <SelectItem key={cat.id} value={cat.id} className="font-bold text-[11px] uppercase tracking-tighter">
                                        <div className="flex items-center gap-2">
                                            <LoadIcon name={cat.icon || 'default'} className={`h-3.5 w-3.5 text-${cat.color || "slate-400"}`} />
                                            <span>{cat.name}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Filtros rápidos (In-View) */}
                        <div className="flex gap-1 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setShowUrgentOnly(!showUrgentOnly)}
                                className={cn(
                                    "rounded-xl h-9 text-[11px] font-bold uppercase tracking-tight transition-all",
                                    showUrgentOnly 
                                        ? "bg-red-100 text-red-700 hover:bg-red-200" 
                                        : "text-slate-500 hover:bg-red-50 hover:text-red-600"
                                )}
                            >
                                <Siren size={14} className="mr-2" /> Urgentes
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setShowInsuranceOnly(!showInsuranceOnly)}
                                className={cn(
                                    "rounded-xl h-9 text-[11px] font-bold uppercase tracking-tight transition-all",
                                    showInsuranceOnly 
                                        ? "bg-blue-100 text-blue-700 hover:bg-blue-200" 
                                        : "text-slate-500 hover:bg-blue-50 hover:text-blue-600"
                                )}
                            >
                                <ShieldCheck size={14} className="mr-2" /> Parte al seguro
                            </Button>
                        </div>

                        {/* Selector de Vista */}
                        <div className="flex items-center gap-1 bg-slate-100 p-2.5 rounded-xl">
                            <Button 
                                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                                size="icon" 
                                onClick={() => setViewMode('grid')}
                                className={cn("h-8 w-8 rounded-lg", viewMode === 'grid' && "bg-white shadow-sm")}
                            >
                                <LayoutGrid size={16} />
                            </Button>
                            <Button 
                                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                                size="icon" 
                                onClick={() => setViewMode('list')}
                                className={cn("h-8 w-8 rounded-lg", viewMode === 'list' && "bg-white shadow-sm")}
                            >
                                <List size={16} />
                            </Button>
                        </div>
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
                                        <th className="px-6 py-4 text-center">Categoría</th>
                                        <th className="px-6 py-4 text-center">Propiedad</th>
                                        <th className="px-6 py-4 text-center">Ubicación</th>
                                        <th className="px-6 py-4 text-center">Estado</th>
                                        <th className="px-6 py-4 text-center">Seguro</th>
                                        <th className="px-6 py-4 text-center">Responsable</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredTasks.map((task) => {
                                        const locationInfo = getTaskLocationLabel(task);
                                        const taskProperty = properties.find(p => p.id === task.property_id);
                                        return (
                                            <TaskRow key={task.id} task={task} TypeIcon={TypeIcon} statusIcon={statusIcon[task.status]}
                                                property={taskProperty} locationInfo={locationInfo}
                                            />
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )
                )}
                <Sheet open={isNewTaskOpen} onOpenChange={setIsNewTaskOpen}>
                    <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
                        <SheetHeader>
                            <SheetTitle className="text-2xl font-black italic uppercase tracking-tighter">Nueva Incidencia d</SheetTitle>
                        </SheetHeader>
                        <MaintenanceForm 
                            properties={properties} 
                            locations={locations} 
                            inventoryItems={inventoryItems} 
                            users={users} 
                        />
                    </SheetContent>
                </Sheet>

                <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                    <SheetContent side="left" className="w-full sm:max-w-xl">
                        <SheetHeader>
                            <SheetTitle className="text-2xl font-black italic uppercase tracking-tighter">Configuración</SheetTitle>
                        </SheetHeader>
                        {/* Aquí irá el MaintenanceSettingsContent */}
                        <div className="mt-8 p-6 bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-center">
                            <p className="text-slate-400 italic">Editor de maestros en construcción...</p>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        </UnifiedAppSidebar>
    );
}