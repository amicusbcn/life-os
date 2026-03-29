// app/booking/components/DateRangePicker.tsx
'use client';

import * as React from "react";
import { format, getDay } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon, RotateCcw, Check } from "lucide-react";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function DateRangePicker({ className, onRangeChange, weekDaysPattern }: any) {
  const [date, setDate] = React.useState<DateRange | undefined>(undefined);
  const [open, setOpen] = React.useState(false);

  const isDayDisabled = (day: Date) => {
    if (!weekDaysPattern) return false;
    return weekDaysPattern[getDay(day)] === 0;
  };

  const handleConfirm = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(false); // Cerramos solo al pulsar el botón
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal rounded-xl h-11 border-slate-200 bg-white",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-indigo-500" />
            {date?.from ? (
              date.to ? (
                <span className="font-bold text-slate-700">
                  {format(date.from, "dd MMM", { locale: es })} - {format(date.to, "dd MMM, y", { locale: es })}
                </span>
              ) : (
                <span className="font-bold text-slate-700">{format(date.from, "dd MMM, y", { locale: es })}</span>
              )
            ) : (
              <span>Seleccionar periodo</span>
            )}
          </Button>
        </PopoverTrigger>
        
        <PopoverContent 
          className="w-auto p-0 rounded-2xl shadow-2xl border-slate-200 z-[100]" 
          align="start"
          // Bloqueamos cualquier intento de cierre externo por foco
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <div className="p-3 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic px-2">
              {!date?.from ? "1. Inicio (Mie)" : !date?.to ? "2. Fin (Mar)" : "Periodo Seleccionado"}
            </span>
            {date?.from && (
              <Button 
                type="button"
                variant="ghost" 
                size="sm" 
                className="h-6 px-2 text-[9px] font-black uppercase hover:bg-rose-50"
                onClick={(e) => {
                  e.stopPropagation();
                  setDate(undefined);
                  onRangeChange(undefined);
                }}
              >
                <RotateCcw className="h-3 w-3 mr-1" /> Reiniciar
              </Button>
            )}
          </div>

          <Calendar
            mode="range"
            selected={date}
            onSelect={(newRange) => {
              setDate(newRange);
              onRangeChange(newRange);
            }}
            disabled={isDayDisabled}
            numberOfMonths={2}
            locale={es}
            classNames={{
              day_range_middle: "bg-indigo-50 text-indigo-900 opacity-100",
              day_disabled: "text-slate-200 opacity-20",
              day_range_end: "bg-indigo-600 text-white !opacity-100",
              day_range_start: "bg-indigo-600 text-white !opacity-100",
            }}
          />

          <div className="p-3 border-t border-slate-50 bg-white rounded-b-2xl">
            <Button 
              type="button"
              disabled={!date?.from || !date?.to} // Solo confirmas si el rango es válido
              onClick={handleConfirm}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-10 font-black uppercase text-[10px] tracking-widest gap-2"
            >
              <Check size={14} />
              Confirmar Rango
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}