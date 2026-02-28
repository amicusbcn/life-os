// components/shared/calendar/Calendar.tsx
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CalendarEvent, CalendarProps } from '@/types/calendar';

export function Calendar({ events, renderDetail }: CalendarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Estado para el evento seleccionado (Sheet)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Obtener fecha de la URL o usar hoy
  const monthParam = searchParams.get('month');
  const yearParam = searchParams.get('year');
  const viewDate = (monthParam && yearParam) 
    ? new Date(parseInt(yearParam), parseInt(monthParam)) 
    : new Date();

  // Navegación vía URL
  const navigate = (newDate: Date) => {
    const params = new URLSearchParams(searchParams);
    params.set('month', newDate.getMonth().toString());
    params.set('year', newDate.getFullYear().toString());
    router.push(`${pathname}?${params.toString()}`);
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
          const dayEvents = events.filter(e => isSameDay(new Date(e.date), day));
          return (
            <div key={idx} className="border-r border-b border-slate-100 p-2">
              <span className="text-[10px] font-bold">{format(day, 'd')}</span>
              <div className="mt-2 space-y-1">
                {dayEvents.map(event => (
                  <button
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className={cn(
                      "w-full text-left p-1 rounded-md text-[9px] font-bold truncate",
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
      <Sheet open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <SheetContent className="p-6">
          <SheetHeader>
            <SheetTitle className="uppercase font-black tracking-tighter text-2xl">
              Detalle del Evento
            </SheetTitle>
          </SheetHeader>
          {selectedEvent && renderDetail && renderDetail(selectedEvent)}
        </SheetContent>
      </Sheet>
    </div>
  );
}