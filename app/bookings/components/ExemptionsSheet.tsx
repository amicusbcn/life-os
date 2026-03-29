// app/booking/components/ExemptionsSheet.tsx
'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Hammer, Star, ChevronDown, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { createExemption } from '../actions';
import { DateRangePicker } from '@/components/layout/DateRangePicker';
import { DateRange } from 'react-day-picker';

export function ExemptionsSheet({ isOpen, onClose, exemptions, propertyId }: any) {
  const [isAdding, setIsAdding] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>();

  // 1. Preparamos la acción con el ID de la propiedad pre-cargado
  const createExemptionWithId = createExemption.bind(null, propertyId);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-md overflow-y-auto p-4 border-l-0 shadow-2xl">
        <SheetHeader className="mb-8">
          <SheetTitle className="text-2xl font-black uppercase tracking-tighter italic">
            Fechas Especiales
          </SheetTitle>
          <SheetDescription>
            Configura periodos exentos de la rueda o bloqueos de la casa.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-8">
          <Collapsible open={isAdding} onOpenChange={setIsAdding} className="bg-slate-50 rounded-3xl border border-slate-200 overflow-hidden">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full h-14 flex justify-between px-6 hover:bg-slate-100">
                <div className="flex items-center gap-2">
                  <Plus size={18} className={isAdding ? "rotate-45 transition-transform" : "transition-transform"} />
                  <span className="font-bold uppercase text-[11px] tracking-widest">
                    {isAdding ? 'Cancelar' : 'Nueva Excepción'}
                  </span>
                </div>
                <ChevronDown size={16} className={isAdding ? "rotate-180 transition-transform" : "transition-transform"} />
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="px-6 pb-6 pt-2 space-y-4">
              {/* 2. Usamos la acción vinculada directamente */}
              <form action={async (formData) => {
                await createExemptionWithId(formData);
                setIsAdding(false); // Cerramos tras guardar
                setRange(undefined); // Limpiamos rango
              }}>
                <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-black text-slate-400 ml-1">Nombre del periodo</Label>
                    <Input 
                      name="name" 
                      required 
                      placeholder="Ej: Navidad 2026" 
                      className="rounded-xl border-slate-200 bg-white" 
                    />
                </div>

                <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-black text-slate-400 ml-1">Fechas del bloqueo</Label>
                    <DateRangePicker onRangeChange={setRange} weekDaysPattern={[0, 0, 0, 1, 0, 0, 0]} />
                    {/* 3. Inputs ocultos sincronizados con el estado del picker */}
                    <input type="hidden" name="start_date" value={range?.from?.toISOString() || ''} />
                    <input type="hidden" name="end_date" value={range?.to?.toISOString() || ''} />
                </div>

                <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-black text-slate-400 ml-1">Tipo de bloqueo</Label>
                    <Select defaultValue="special" name="type">
                      <SelectTrigger className="rounded-xl border-slate-200 h-11 bg-white">
                        <SelectValue placeholder="Selecciona tipo" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="special">Periodo Especial</SelectItem>
                        <SelectItem value="maintenance">Mantenimiento</SelectItem>
                      </SelectContent>
                    </Select>
                </div>

                <Button type="submit" className="w-full bg-slate-900 text-white rounded-xl h-11 font-black uppercase text-[10px] tracking-widest mt-4">
                    Guardar Configuración
                </Button>
              </form>
            </CollapsibleContent>
          </Collapsible>

          {/* Listado (sin cambios significativos, solo asegurar el optional chaining) */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Periodos Configurados</h4>
            <div className="space-y-3">
              {exemptions?.map((ex: any) => (
                <div key={ex.id} className="group flex items-center justify-between p-4 rounded-2xl border bg-white relative overflow-hidden">
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${ex.type === 'maintenance' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                  <div className="pl-2">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-black text-xs uppercase text-slate-800">{ex.name}</span>
                      {ex.type === 'maintenance' ? <Hammer size={12} className="text-rose-500" /> : <Star size={12} className="text-amber-500 fill-amber-500" />}
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase italic">
                      {format(new Date(ex.start_date), "d MMM", { locale: es })} - {format(new Date(ex.end_date), "d MMM yyyy", { locale: es })}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-rose-500">
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}