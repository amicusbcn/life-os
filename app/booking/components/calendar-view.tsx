'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation'; // Importante: navigation, no router
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isWeekend, getDay, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertTriangle, ChevronLeft, ChevronRight, Construction, Hammer, Home } from 'lucide-react';
import { BookingEvent, BookingHoliday, BookingProperty } from '@/types/booking';
import { cn } from '@/lib/utils';
import { isEventInDay } from "@/utils/range-parser"
import BookingDialog from './BookingDialog';
import { useImpersonation } from './impersonationContext';
import LoadIcon from '@/utils/LoadIcon';

interface CalendarViewProps {
  properties: BookingProperty[];
  events: BookingEvent[];       // Vienen del servidor
  currentProperty: BookingProperty; // Viene de URL
  currentDate: Date;            // Viene de URL
  holidays:BookingHoliday[];
}

export default function CalendarView({ properties, events, currentProperty, currentDate, holidays }: CalendarViewProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const { activeProfile } = useImpersonation();
  // Helpers de navegación (Ahora cambian la URL)
  const changeDate = (newDate: Date) => {
    const dateStr = format(newDate, 'yyyy-MM');
    // Mantenemos la propiedad actual, cambiamos fecha
    router.push(`/booking?prop=${currentProperty.slug}&date=${dateStr}`);
  };

  const changeProperty = (slug: string) => {
    const dateStr = format(currentDate, 'yyyy-MM');
    // Mantenemos fecha, cambiamos propiedad
    router.push(`/booking?prop=${slug}&date=${dateStr}`);
  };

  // Cálculos visuales
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart); 
  const emptyDays = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1; 

  const propColor = currentProperty.color || '#64748b';
  // Helper para ver si hay festivo en X día
  const getHoliday = (day: Date) => {
    // Comparamos strings YYYY-MM-DD para evitar lios de horas
    const dateStr = format(day, 'yyyy-MM-dd');
    return holidays.find(h => h.date === dateStr);
  };

  return (
    <div className="space-y-6">
      {/* 1. SELECTOR DE PROPIEDAD */}
      <div className="flex gap-4 border-b pb-4 overflow-x-auto">
        {properties.map(prop => {
            const isActive = currentProperty.id === prop.id;
            const pColor=prop.color
            return(
          <button
            key={prop.id}
            onClick={() => changeProperty(prop.slug)}
            style={{ 
                backgroundColor: isActive ? pColor : `${pColor}20`, 
                borderColor: isActive ? pColor : `${pColor}40`, 
                color: isActive ? "white" : pColor,
            }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-medium border border-transparent",
              isActive 
                ? "shadow-md transform scale-105" 
                : "hover:opacity-100" // Quitamos el bg-slate del className porque lo controlamos con style
            )}
          >
            <Home size={16} />
            {prop.name}
            <span className="ml-1 text-xs opacity-70">({prop.max_slots} slots)</span>
          </button>
          )}
        )}
      </div>

      {/* 2. CABECERA CALENDARIO */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold capitalize text-slate-800" style={{ color: propColor }}>
            {/* Opcional: He puesto el título del mes también con el color de la propiedad */}
            {currentProperty.name} - {format(currentDate, 'MMMM yyyy', { locale: es })}
        </h2>
        <div className="flex gap-2">
          <button onClick={() => changeDate(subMonths(currentDate, 1))} style={{ backgroundColor: propColor,color:"white" }} className="p-2 hover:bg-slate-100 rounded-full border"><ChevronLeft size={20}/></button>
          <button onClick={() => changeDate(addMonths(currentDate, 1))} style={{ backgroundColor: propColor,color:"white" }} className="p-2 hover:bg-slate-100 rounded-full border"><ChevronRight size={20}/></button>
        </div>
      </div>

      {/* 3. GRID CALENDARIO */}
      <div className="border rounded-xl overflow-hidden shadow-sm bg-white" style={{ borderColor: `${propColor}40` }}>
        {/* Header Días */}
        <div className="grid grid-cols-7 bg-slate-50 border-b divide-x" style={{ 
                backgroundColor: `${propColor}15`, // 15% opacidad (Hex + 15)
                borderColor: `${propColor}20`
            }}>
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider" style={{ color: propColor }}>
              {d}
            </div>
          ))}
        </div>

        {/* Celdas */}
        <div className="grid grid-cols-7 divide-x divide-y">
          {Array.from({ length: emptyDays }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-slate-50/50 min-h-[100px]" />
          ))}

          {daysInMonth.map(day => {
            const isTodayDate = isToday(day);
            const dayOfWeek = getDay(day);
            const holiday = getHoliday(day);
            const isSpecialDay = isWeekend(day) || !!holiday; // Para el fondo
            
            const dayEvents = events.filter(e => isEventInDay(e, day));
            const maintenanceEvent = dayEvents.find(e => e.type === 'maintenance');
            const isMaintenance = !!maintenanceEvent
            const hasConflict = isMaintenance && dayEvents.some(e => e.type !== 'maintenance');
            let freeSlots = currentProperty.max_slots - dayEvents.length;
            if (isMaintenance) freeSlots = 0;
            
            return (
              <div 
                key={day.toISOString()} 
                onClick={() => setSelectedDate(day)} 
                className={cn(
                  "min-h-[120px] p-2 flex flex-col gap-1 transition-colors hover:bg-slate-50 cursor-pointer relative", // relative para posicionar cosas si quieres
                  // Si es festivo o finde, fondo grisáceo (pero menos que el hover)
                  // OJO: Si es 'hoy', el estilo inline de abajo ganará, lo cual es correcto.
                  !isTodayDate && isSpecialDay && "bg-slate-50/60" ,
                  isMaintenance && !hasConflict && "bg-slate-100 italic text-slate-400", // Mantenimiento limpio
                  hasConflict && "bg-amber-50 ring-2 ring-inset ring-amber-200" // Conflicto visual
                )}
                style={{
                    // 1. Si es día especial, aplicamos el fondo
                    ...(isSpecialDay ? { backgroundColor: `${propColor}15`,color:propColor } : {}),

                    // 2. Si es hoy, aplicamos el borde (se suma a lo anterior)
                    ...(isTodayDate ? { 
                        borderColor: propColor, 
                        borderWidth: '3px', 
                        borderStyle: 'solid' 
                    } : {})
                    }}
              >
                <div className="flex justify-between items-start mb-1">
                    
                    {/* Número */}
                    <span 
                        className={cn(
                            "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full transition-colors",
                            !isTodayDate && isSpecialDay && "text-red-500 font-bold", // Finde/Festivo en rojo
                            !isTodayDate && !isSpecialDay && "text-slate-700"
                        )}
                        style={isTodayDate ? { backgroundColor: propColor, color: 'white' } : {}}
                    >
                      {format(day, 'd')}
                    </span>

                    {/* Nombre Festivo (Texto pequeño a la derecha) */}
                    {holiday && (
                        <span className="text-[9px] font-semibold text-red-400 text-right leading-tight max-w-[60px] truncate uppercase">
                            {holiday.name}
                        </span>
                    )}
                </div>

                <div className="flex flex-col gap-1">
                  {/* Si hay conflicto, mostramos aviso gordo */}
                    {hasConflict && (
                        <div className="flex items-center gap-1 text-[9px] font-bold text-amber-700 bg-amber-100 px-1 rounded mb-1">
                            <AlertTriangle size={10} />
                            <span>OBRAS + GENTE</span>
                        </div>
                    )}
                  {dayEvents.map(evt => {
                    if (evt.type === 'maintenance') {
                       return (
                           <div key={evt.id} className="text-xs px-2 py-1 bg-slate-200 text-slate-600 rounded border border-slate-300 flex items-center gap-1">
                               <Hammer size={10} />
                               <span className="truncate">{evt.notes || 'Mantenimiento'}</span>
                           </div>
                       )
                   }
                    // 1. Detectamos si este evento es del usuario actual (real o simulado)
                    const isMe = activeProfile?.id === evt.user_id;

                    return (
                      <div 
                        key={evt.id}
                        className={cn(
                          "text-xs px-2 py-1 rounded border shadow-sm truncate flex items-center gap-1.5 transition-all",
                          // 2. Si soy yo, le damos un borde extra y elevación visual (z-10)
                          isMe ? "ring-1 ring-offset-0 font-bold z-10 shadow-md" : "opacity-90" 
                        )}
                        style={{ 
                          // 3. COLOR DE FONDO:
                          // - Si soy YO: Color sólido del usuario.
                          // - Si es OTRO: Color muy transparente (hex + '25').
                          backgroundColor: isMe 
                              ? (evt.user?.color || '#94a3b8') 
                              : (evt.user?.color ? `${evt.user.color}25` : '#e2e8f0'), 
                              
                          borderColor: evt.user?.color || '#cbd5e1',
                          
                          // 4. TEXTO: Blanco si soy yo (para contrastar con fondo oscuro), negro si no.
                          color: isMe ? 'white' : 'black'
                        }}
                      >
                        {/* BOLITA DE INICIALES */}
                        <span 
                          className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                          style={{ 
                             // 5. INVERSIÓN:
                             // - Si soy yo: Bolita blanca con texto de color (Elegante).
                             // - Si es otro: Bolita de color con texto blanco.
                             backgroundColor: isMe ? 'white' : (evt.user?.color || '#94a3b8'),
                             color: isMe ? (evt.user?.color || 'black') : 'white'
                          }}
                        >
                          {evt.user? (evt.user.initials):(<Construction/>)}
                        </span>
                        {evt.user? (evt.user.display_name):(<Construction/>)}
                      </div>
                    );
                  })}
                  
                  {freeSlots > 0 && dayEvents.length > 0 && (
                    <div className="text-[10px] text-slate-400 pl-1 italic">
                      {freeSlots} libres
                    </div>
                  )}
                  {/* Mostrar "0 libres" o "BLOQUEADO" explícitamente */}
                  {isMaintenance && freeSlots === 0 && (
                    <div className="text-[9px] font-bold text-red-400 text-center mt-auto">
                        BLOQUEADO
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL (Pasa la propiedad actual) */}
      {selectedDate && (
        <BookingDialog 
          isOpen={!!selectedDate}
          onClose={() => setSelectedDate(null)}
          date={selectedDate}
          property={currentProperty}
          events={events.filter(e => isEventInDay(e, selectedDate))}
        />
      )}
    </div>
  );
}