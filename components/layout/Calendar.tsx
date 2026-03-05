// components/shared/calendar/Calendar.tsx
'use client';

import { useState , useEffect} from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek, addMonths, subMonths, getMonth, getDate, isSaturday, isSunday, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CalendarEvent, CalendarProps } from '@/types/calendar';
import { getHolidays } from '@/app/core/data';

export function Calendar({ 
  events, 
  holidays = [], 
  hide_holidays = false, 
  month, 
  year, 
  renderDetail,
  defaultEventId 
}: CalendarProps) {
  const router = useRouter();
  const pathname = usePathname();
  // Estado para el evento seleccionado (Sheet)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Obtener fecha de la URL o usar hoy
  const monthParam = month;
  const yearParam = year;
  const viewDate = (month !== undefined && year !== undefined) 
    ? new Date(year, month, 1) // Añadimos ,1 para forzar siempre el inicio del mes
    : new Date();

  useEffect(() => {
    console.log("🔍 Calendar: Buscando ID ->", defaultEventId);
  console.log("📋 Calendar: Total eventos cargados ->", events.length);
    if (defaultEventId && events.length > 0) {
      // Buscamos el evento por ID (o por el ID de la tarea en el payload)
      const eventToOpen = events.find(e => 
        e.id === defaultEventId || e.payload?.id === defaultEventId
      );

      if (eventToOpen) {
      console.log("✅ Evento encontrado!", eventToOpen.title);
      setSelectedEvent(eventToOpen);
    } else {
      console.warn("❌ No se encontró ningún evento con ese ID en este mes.");
    }
    }
  }, [defaultEventId, events]);

  const isHoliday = (day: Date) => {
    if (hide_holidays) return null;
    
    return holidays.find(h => {
      const hDate = new Date(h.holiday_date);
      if (h.is_annual) {
        // Solo comparamos mes y día
        return getMonth(hDate) === getMonth(day) && getDate(hDate) === getDate(day);
      }
      // Comparación de fecha exacta
      return isSameDay(hDate, day);
    });
  };
  // Navegación vía URL
  const navigate = (newDate: Date) => {
    const year = newDate.getFullYear();
    const month = newDate.getMonth()+1;
    
    // Navegación estructural: /maintenance/calendar/2024/04
    router.push(`/maintenance/calendar/${year}/${month}`);
  };

  // Generar días
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(viewDate), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(viewDate), { weekStartsOn: 1 })
  });
  
  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      {/* HEADER DINÁMICO */}
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <h2 className="text-xl font-black uppercase tracking-tighter text-slate-800">
          {format(viewDate, 'MMMM yyyy', { locale: es })}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate(subMonths(viewDate, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(new Date())} className="font-bold uppercase text-[10px]">
            Hoy
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigate(addMonths(viewDate, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* GRID... (Lógica de renderizado igual a la anterior, pero usando events genéricos) */}
      <div className="grid grid-cols-7 auto-rows-[120px]">
        {days.map((day, idx) => {
          const holiday = isHoliday(day);
          const isWeekend = isSaturday(day) || isSunday(day);
          const dayEvents = events.filter(e => isSameDay(new Date(e.date), day));
          const isToday = isSameDay(day, new Date());
          const isCurrentMonth = isSameMonth(day, viewDate); // Requisito: import { isSameMonth } from 'date-fns'
          return (
            <div 
              key={idx} 
              className={cn(
                "border-r border-b border-slate-100 p-2 transition-colors relative",
                // Fondo diferenciado
                holiday && "bg-rose-50",
                isWeekend && "bg-rose-50",
                !isCurrentMonth && "opacity-50"
              )}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded-md",
                  isToday ? "bg-blue-600 text-white" : 
                  holiday ? "text-rose-600" : 
                  isWeekend ? "text-slate-400" : 
                  !isCurrentMonth ? "text-slate-500" : "text-slate-600"
                )}>
                  {format(day, 'd')}
                </span>

                {holiday && (
                  <span className="text-[7px] font-black uppercase text-rose-500/80 tracking-tighter truncate max-w-[60px] text-right">
                    {holiday.name}
                  </span>
                )}
              </div>
              <div className="mt-2 space-y-1">
                {dayEvents.map(event => (
                  <button
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className={cn(
                      "w-full text-left p-1 rounded-md text-[9px] font-bold truncate cursor-pointer transition-transform hover:scale-105",
                      // ✨ Resaltado visual si es el evento seleccionado por URL
                      selectedEvent?.id === event.id && "ring-2 ring-indigo-600 shadow-lg",
                      event.status === 'completed' ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"
                    )}
                  >
                    {event.title}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* DETALLE (SHEET) */}
      <Sheet open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <SheetContent className="p-0 overflow-y-auto sm:max-w-xl border-l-2 border-l-indigo-600">
          <SheetHeader className="p-8 bg-slate-50 border-b">
            <SheetTitle className="uppercase font-black tracking-tighter text-3xl italic text-slate-900">
              Detalle de Actividad
            </SheetTitle>
          </SheetHeader>
          
          <div className="p-8">
            {selectedEvent && renderDetail && renderDetail(selectedEvent)}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}