// app/settings/holidays/components/HolidayCalendarView.tsx
'use client';

import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  isSameDay, isWeekend, getDay, isToday 
} from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function HolidayCalendarView({ holidays, year, onDateClick, onHolidayClick, selectedLocality }: any) {
  
  // 1. Convertimos la lista en un Mapa para búsqueda O(1)
  // Formato: { "2026-03-19": holidayObject }
  const holidayMap = new Map();

  holidays.forEach((h: any) => {
    const d = new Date(h.holiday_date);
    let dateKey;

    if (h.is_annual) {
      // PROYECCIÓN: Forzamos el mes y día al año que estamos visualizando
      // Usamos el formato 'MM-dd' para construir la clave del año actual
      const month = d.getMonth();
      const day = d.getDate();
      const projectedDate = new Date(year, month, day);
      dateKey = format(projectedDate, 'yyyy-MM-dd');
    } else {
      // Si no es anual, solo lo mostramos si coincide el año exacto
      dateKey = format(d, 'yyyy-MM-dd');
    }

    // Siguiendo tu regla de "No Solapamiento":
    // El mapa guardará el último que encuentre, pero como ya controlamos
    // que no haya duplicados, esto es seguro.
    holidayMap.set(dateKey, h);
  });

  const months = Array.from({ length: 12 }, (_, i) => i);

  return (
    <TooltipProvider delayDuration={0}> {/** delay 0 para que sea instantáneo al pasar el ratón **/}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 p-4 bg-white rounded-3xl border shadow-sm">
        {months.map(month => (
            <MiniMonth 
            key={month}
            month={month}
            year={year}
            holidayMap={holidayMap}
            onDateClick={onDateClick}
            onHolidayClick={onHolidayClick}
            />
        ))}
        </div>
    </TooltipProvider>
  );
}

function MiniMonth({ month, year, holidayMap, onDateClick, onHolidayClick }: any) {
  const monthDate = new Date(year, month, 1);
  const days = eachDayOfInterval({
    start: startOfMonth(monthDate),
    end: endOfMonth(monthDate)
  });

  // Ajuste para que la semana empiece en Lunes (0: Dom, 1: Lun...)
  const firstDayIndex = (getDay(days[0]) + 6) % 7;

  return (
    <div className="flex flex-col gap-2">
        <h3 className="text-sm font-black uppercase tracking-tighter text-slate-400 px-1">
            {format(monthDate, 'MMMM', { locale: es })}
        </h3>
        
        <div className="grid grid-cols-7 gap-px bg-slate-100 border border-slate-100 rounded-lg overflow-hidden">
            {/* Cabecera días semana */}
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
            <div key={d} className="bg-white text-[9px] font-bold text-slate-300 text-center py-1">
                {d}
            </div>
            ))}

            {/* Huecos inicio de mes */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-white aspect-square" />
            ))}

            {/* Días del mes */}
            {days.map(day => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const holiday = holidayMap.get(dateKey);
                const isWknd = isWeekend(day);
                const isTdy = isToday(day);

                // 1. Definimos el contenido base del día para no repetirlo
                const DayContent = (
                    <div
                        onClick={() => holiday ? onHolidayClick(holiday) : onDateClick(day)}
                        className={cn(
                            "relative bg-white aspect-square flex items-center justify-center text-[12px] font-medium cursor-pointer transition-all hover:z-10 hover:scale-110 hover:shadow-md group",
                            isWknd && "bg-slate-50 text-slate-400",
                            isTdy && "ring-1 ring-inset ring-indigo-500 font-black text-indigo-600 z-10"
                        )}
                    >
                        <span className={cn(holiday && "opacity-30")}>{format(day, 'd')}</span>
                        
                        {holiday && (
                            <div className={cn(
                                "absolute inset-0 flex items-center justify-center",
                                holiday.scope === 'national' && "bg-rose-500/10",
                                holiday.scope === 'local' && "bg-blue-500/10",
                                holiday.scope === 'personal' && "bg-purple-500/10"
                            )}>
                                <div className={cn(
                                    "w-5 h-5 rounded-full shadow-sm flex items-center justify-center",
                                    holiday.scope === 'national' && "bg-rose-500 ring-4 ring-rose-500/20",
                                    holiday.scope === 'local' && "bg-blue-500 ring-4 ring-blue-500/20",
                                    holiday.scope === 'personal' && "bg-purple-500 ring-4 ring-purple-500/20"
                                )}>
                                    <span className="text-white text-[9px] font-bold">{format(day, 'd')}</span>
                                </div>
                            </div>
                        )}
                    </div>
                );

                // 2. Si NO hay festivo, devolvemos el contenido a pelo (sin Tooltip)
                if (!holiday) return <div key={dateKey}>{DayContent}</div>;

                // 3. Si HAY festivo, lo envolvemos con su Tooltip personalizado
                return (
                    <Tooltip key={dateKey} delayDuration={0}>
                        <TooltipTrigger asChild>
                            {DayContent}
                        </TooltipTrigger>

                        <TooltipContent 
                            side="top" 
                            className={cn(
                                "border-none rounded-xl px-3 py-2 shadow-2xl z-[100] min-w-[140px]",
                                holiday.scope === 'national' && "bg-rose-950 text-rose-50 border border-rose-800/50",
                                holiday.scope === 'local' && "bg-blue-950 text-blue-50 border border-blue-800/50",
                                holiday.scope === 'personal' && "bg-purple-950 text-purple-50 border border-purple-800/50"
                            )}
                        >
                            <div className="flex flex-col gap-0.5">
                                <p className={cn(
                                    "text-[9px] font-black uppercase tracking-[0.15em]",
                                    holiday.scope === 'national' && "text-rose-400",
                                    holiday.scope === 'local' && "text-blue-400",
                                    holiday.scope === 'personal' && "text-purple-400"
                                )}>
                                    Festivo {holiday.scope}
                                </p>
                                <p className="text-[13px] font-bold leading-tight">
                                    {holiday.name}
                                </p>
                                {holiday.locality && (
                                    <p className={cn(
                                        "text-[10px] font-semibold uppercase mt-1 flex items-center gap-1.5",
                                        holiday.scope === 'local' ? "text-blue-300" : "text-slate-400"
                                    )}>
                                    <span className={cn(
                                        "w-1 h-1 rounded-full",
                                        holiday.scope === 'local' ? "bg-blue-400" : "bg-slate-500"
                                    )} /> 
                                    {holiday.locality}
                                    </p>
                                )}
                            </div>
                        </TooltipContent>
                    </Tooltip>
                );
            })}
        </div>
    </div>
  );
}