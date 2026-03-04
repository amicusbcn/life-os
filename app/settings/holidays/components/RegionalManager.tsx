// app/settings/holidays/components/RegionalManager.tsx
'use client';

import { useState } from 'react';
import { List, Calendar as CalendarIcon, MapPin, Plus, Globe, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator, SelectLabel, SelectGroup } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HolidayList } from './HolidayList';
import { useRouter } from 'next/navigation'; 
import { HolidaySheet } from './HolidaySheet';
import { HolidayCalendarView } from './HolidayCalendarView';
import { Holiday } from '@/types/calendar';
import { ProfileBase } from '@/types/users';

interface RegionalManagerProps {
    initialLocalities: string[];
    initialHolidays: Holiday[];
    currentYear: number;
    user: ProfileBase
}
export function RegionalManager({ initialLocalities, initialHolidays, currentYear,user}: any) {
    const router = useRouter()
    const [view, setView] = useState<'list' | 'calendar'>('calendar');
    const [selectedLocality, setSelectedLocality] = useState(
        user?.locality?.toLowerCase() || 'all'
    );
    const [isHolidaySheetOpen, setIsHolidaySheetOpen] = useState(false);
    const [editingHoliday, setEditingHoliday] = useState(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    const navigateToYear = (year: number) => {
        router.push(`/settings/holidays/${year}`);
    };
    
    const handleEditRequest = (holiday: any) => {
        setEditingHoliday(holiday);
        setIsHolidaySheetOpen(true);
    };

    const handleDateClick = (date: Date) => {
        setSelectedDate(date);
        setEditingHoliday(null); // Aseguramos modo "Nuevo"
        setIsHolidaySheetOpen(true);
    };

    const handleOpenChange = (open: boolean) => {
        setIsHolidaySheetOpen(open);
        if (!open) {
            // CRÍTICO: Limpiamos el festivo al cerrar para que el 
            // próximo "Añadir" no venga con "herencia"
            setEditingHoliday(null);
        }
    };

    // Filtramos festivos según localidad
    const filteredHolidays = initialHolidays.filter((h: any) => {
        // 1. Si está seleccionado "Todas", no filtramos nada
        if (selectedLocality === 'all') return true;

        // 2. Normalizamos para comparar (todo a minúsculas y sin espacios)
        const holidayLoc = h.locality?.toLowerCase().trim();
        const searchLoc = selectedLocality.toLowerCase().trim();

        // 3. Lógica de visibilidad:
        // Mostramos si es Nacional O si es la localidad buscada O si es Personal
        return (
            h.scope === 'national' || 
            holidayLoc === searchLoc ||
            h.scope === 'personal' // (Opcional: ¿Quieres ver tus vacaciones siempre?)
        );
    });
    return (
        <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4 bg-slate-50/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-200 sticky top-0 z-10">
            
            {/* 1. NAVEGADOR DE AÑOS (Tu nueva pieza clave) */}
            <div className="flex items-center bg-white rounded-xl border border-slate-200 p-1 shadow-sm">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-slate-400 hover:text-indigo-600"
                    onClick={() => navigateToYear(currentYear - 1)}
                >
                    <ChevronLeft size={16} />
                </Button>
                <div className="px-4 text-sm font-black text-slate-900 tabular-nums">
                    {currentYear}
                </div>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-slate-400 hover:text-indigo-600"
                    onClick={() => navigateToYear(currentYear + 1)}
                >
                    <ChevronRight size={16} />
                </Button>
            </div>
                {/* 1. Selector de Localidad */}
                <div className="flex-1 flex items-center gap-2">
                    <MapPin size={16} className="text-slate-400" />
                    <Select value={selectedLocality} onValueChange={(v) => {setSelectedLocality(v);}}>
                        <SelectTrigger className="w-full md:w-[240px] bg-white font-bold text-xs uppercase tracking-tight h-10 rounded-xl">
                            <SelectValue placeholder="Seleccionar Ubicación" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all" className="text-xs font-bold uppercase tracking-tight">Todas las sedes</SelectItem>
                            <SelectSeparator />
                            <SelectItem value="national" className="text-xs font-bold uppercase tracking-tight">
                                    Festivos Nacionales
                                </SelectItem>
                            <SelectSeparator />
                            <SelectGroup title='Localidades'>
                                <SelectLabel>Festivos Locales:</SelectLabel>
                                {initialLocalities.map((loc: any) => (
                                    <SelectItem key={loc} value={loc.toLowerCase()} className="text-xs font-bold uppercase tracking-tight">
                                        {loc}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </div>

                {/* 2. Toggle de Vista */}
                <Tabs value={view} onValueChange={(v: any) => setView(v)} className="bg-white p-1 rounded-xl border border-slate-200">
                    <TabsList className="bg-transparent h-8 gap-1">
                        <TabsTrigger value="list" className="rounded-lg data-[state=active]:bg-slate-100 data-[state=active]:shadow-none">
                            <List size={14} className="mr-2" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Lista</span>
                        </TabsTrigger>
                        <TabsTrigger value="calendar" className="rounded-lg data-[state=active]:bg-slate-100 data-[state=active]:shadow-none">
                            <CalendarIcon size={14} className="mr-2" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Calendario</span>
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                {/* 3. Botón Añadir */}
                <Button 
                    onClick={() => setIsHolidaySheetOpen(true)}
                    className="bg-indigo-700 hover:bg-indigo-800 text-white font-black uppercase text-[10px] tracking-widest px-6 h-10 rounded-xl shadow-lg shadow-indigo-100 gap-2"
                >
                    <Plus size={16} strokeWidth={3} />
                    Añadir Festivo
                </Button>
            </div>

            {/* CONTENIDO PRINCIPAL */}
            <div className="min-h-[400px]">
                {view === 'list' ? (
                    <HolidayList holidays={filteredHolidays} onEdit={handleEditRequest} />
                ) : (
                    <HolidayCalendarView 
                        holidays={filteredHolidays} 
                        year={currentYear}
                        onHolidayClick={handleEditRequest}
                        onDateClick={handleDateClick}
                    />
                )}
            </div>

            {/* MODALES Y SHEETS  */}
            <HolidaySheet 
                open={isHolidaySheetOpen}
                onOpenChange={(open) => {
                    setIsHolidaySheetOpen(open);
                    if(!open) { setEditingHoliday(null); setSelectedDate(null); }
                }}
                holiday={editingHoliday}
                initialDate={selectedDate} // Pasamos la fecha del click
                defaultLocality={selectedLocality} // Pasamos el filtro actual
                localities={initialLocalities}
            />
        </div>
    );
}