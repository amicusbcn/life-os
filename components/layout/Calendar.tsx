'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, 
  startOfWeek, endOfWeek, addMonths, subMonths, isSaturday, isSunday, isSameMonth, getDay 
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CalendarEvent, CalendarProps } from '@/types/calendar';

interface EnhancedCalendarProps extends CalendarProps {
  accentColor?: string;
}

export function Calendar({ 
  events, 
  holidays = [], 
  hide_holidays = false, 
  month, 
  year, 
  renderDetail,
  baseUrl,
  accentColor = "#3b82f6" 
}: EnhancedCalendarProps) {
  const router = useRouter();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const viewDate = (month !== undefined && year !== undefined) 
    ? new Date(year, month, 1) 
    : new Date();

  const navigate = (newDate: Date) => {
    const y = newDate.getFullYear();
    const m = newDate.getMonth() + 1;
    router.push(`${baseUrl}/${y}/${m}`);
  };

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(viewDate), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(viewDate), { weekStartsOn: 1 })
  });

  const isHoliday = (day: Date) => {
    if (hide_holidays) return null;
    return holidays.find(h => isSameDay(new Date(h.holiday_date), day));
  };

  return (
    <div className="space-y-4 w-full">
      {/* 1. CABECERA (Igual que la tenías) */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ backgroundColor: `${accentColor}20`, color: accentColor }}>
            <CalendarIcon size={20} />
          </div>
          <h2 className="text-xl font-bold capitalize text-slate-800">
            {format(viewDate, 'MMMM yyyy', { locale: es })}
          </h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate(subMonths(viewDate, 1))} style={{ borderColor: `${accentColor}40`, color: accentColor }} className="rounded-full hover:bg-slate-50">
            <ChevronLeft size={20} />
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(new Date())} style={{ color: accentColor, fontWeight: 'bold' }} className="uppercase text-[10px] tracking-widest px-4">
            Hoy
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigate(addMonths(viewDate, 1))} style={{ borderColor: `${accentColor}40`, color: accentColor }} className="rounded-full hover:bg-slate-50">
            <ChevronRight size={20} />
          </Button>
        </div>
      </div>

      {/* 2. GRID CALENDARIO */}
      <div className="border rounded-2xl overflow-hidden shadow-md bg-white" style={{ borderColor: `${accentColor}30` }}>
        <div className="grid grid-cols-7 border-b divide-x" style={{ backgroundColor: `${accentColor}10`, borderColor: `${accentColor}20` }}>
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
            <div key={d} className="py-2 text-center text-[10px] font-black uppercase tracking-widest" style={{ color: accentColor }}>{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 divide-x divide-y" style={{ borderColor: `${accentColor}10` }}>
          {days.map((day, idx) => {
            const holiday = isHoliday(day);
            const isWeekend = isSaturday(day) || isSunday(day);
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, viewDate);
            const isSpecialDay = isWeekend || !!holiday;

            // --- LÓGICA DE FILTRADO HÍBRIDA ---
            // Buscamos si el día coincide con una fecha fija O está dentro de un rango
            const dayEvents = events.filter(e => {
              if (e.date) return isSameDay(new Date(e.date), day);
              if (e.range) {
                const start = new Date(e.range.start);
                const end = new Date(e.range.end);
                return day >= start && day <= end;
              }
              return false;
            });

            return (
              <div 
                key={idx} 
                className={cn(
                  "min-h-[140px] p-2 flex flex-col gap-1 transition-all relative group",
                  !isCurrentMonth && "opacity-30 grayscale-[0.5]",
                  isCurrentMonth && "hover:bg-slate-50/50"
                )}
                style={{
                  ...(isSpecialDay && isCurrentMonth ? { backgroundColor: `${accentColor}05` } : {}),
                  ...(isToday ? { boxShadow: `inset 0 0 0 2px ${accentColor}`, zIndex: 10 } : {})
                }}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={cn("text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full", isToday ? "shadow-md" : (holiday || isWeekend ? "text-rose-500" : "text-slate-600"))} style={isToday ? { backgroundColor: accentColor, color: 'white' } : {}}>
                    {format(day, 'd')}
                  </span>
                  {holiday && isCurrentMonth && <span className="text-[8px] font-black uppercase text-rose-500 text-right max-w-[70%] truncate leading-tight">{holiday.name}</span>}
                </div>

                {/* --- RENDERIZADO DE EVENTOS --- */}
                <div className="flex flex-col gap-1.5 mt-1">
                  {dayEvents.map(event => {
                    const isRange = !!event.range;
                    const isStart = isRange ? isSameDay(day, new Date(event.range!.start)) : true;
                    const isEnd = isRange ? isSameDay(day, new Date(event.range!.end)) : true;
                    const isMonday = getDay(day) === 1;

                    return (
                      <button
                        key={`${event.id}-${day.getTime()}`}
                        onClick={() => setSelectedEvent(event)}
                        className={cn(
                          "w-full text-left text-[10px] font-bold truncate transition-all relative flex items-center h-7",
                          isRange ? (
                            cn(
                              "border-y shadow-none",
                              isStart ? "rounded-l-lg ml-1 border-l" : "-ml-3 w-[calc(100%+24px)] border-l-0",
                              isEnd ? "rounded-r-lg mr-1 border-r" : "-mr-3 border-r-0",
                              // Si no es el inicio ni el fin, quitamos los bordes laterales
                              !isStart && !isEnd && "border-x-0"
                            )
                          ) : (
                            "rounded-lg border shadow-sm px-2 bg-white" // Estilo Tarjeta (Puntual)
                          )
                        )}
                        style={{ 
                          backgroundColor: isRange ? `${event.color || accentColor}15` : 'white',
                          borderColor: event.color || accentColor,
                          color: isRange ? (event.color || accentColor) : '#334155',
                          borderLeftWidth: isRange ? (isStart ? '4px' : '0px') : '6px',
                          zIndex: isStart ? 20 : 10
                        }}
                      >
                        {/* El título solo aparece al inicio del rango o los lunes (para que no se pierda en semanas largas) */}
                        {(!isRange || isStart || isMonday) && (
                          <span className="truncate px-1 sticky left-0 font-black uppercase tracking-tighter">
                            {event.title}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. DETALLE (SHEET) */}
      <Sheet open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <SheetContent className="p-0 sm:max-w-xl border-l-4" style={{ borderLeftColor: accentColor }}>
          <SheetHeader className="p-8 bg-slate-50 border-b">
            <SheetTitle className="uppercase font-black tracking-tighter text-3xl italic text-slate-900 flex items-center gap-3">
              <div className="w-2 h-8" style={{ backgroundColor: accentColor }} />
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