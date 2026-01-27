'use client';

import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { addYears, format, endOfYear, getYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  DndContext, 
  DragOverlay, 
  useSensor, 
  useSensors, 
  PointerSensor, 
  DragStartEvent, 
  DragEndEvent 
} from '@dnd-kit/core';
import { Loader2, CalendarIcon, Plus, Trash2, AlertTriangle, ArrowRight, ArrowLeft, Check } from 'lucide-react';

// UI Components
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Board Components
import { DraggableMember } from './board/DraggableMember';
import { DroppableSlot } from './board/DroppableSlot';
import { StaticMemberCard } from './board/StaticMemberCard';

// Actions & Types
import { generateYearlySchedule } from '../action-generate-schedule';
import { getExistingBlocks } from '../data'; // <--- IMPORTAR NUEVA ACCIÓN
import { WizardExemption, BookingProfile } from '@/types/booking';

interface ScheduleWizardProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  maxSlots: number;
  members: BookingProfile[];
}

export function ScheduleWizard({ isOpen, onClose, propertyId, maxSlots, members }: ScheduleWizardProps) {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isPreloading, setIsPreloading] = useState(false);

  // --- ESTADO 1: CONFIGURACIÓN (Rango Fechas) ---
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(endOfYear(new Date())); // Default: Fin de año actual

  // --- ESTADO 2: BLOQUEOS (Exenciones + Mantenimiento) ---
  const [blocks, setBlocks] = useState<WizardExemption[]>([]);
  
  // Inputs temporales para añadir bloques
  const [tempName, setTempName] = useState("");
  const [tempType, setTempType] = useState<'special' | 'maintenance'>('special');
  const [tempRange, setTempRange] = useState<{ from: Date; to?: Date } | undefined>();
  
  // --- ESTADO 3: BOARD (Asignaciones) ---
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // --- EFECTO: PRECARGA INTELIGENTE ---
  useEffect(() => {
    if (isOpen && step === 1) {
        // Al abrir o cambiar fecha, cargamos lo que ya existe en DB para no perderlo
        const loadBlocks = async () => {
            setIsPreloading(true);
            try {
                const existing = await getExistingBlocks(propertyId, startDate);
                setBlocks(existing);
            } catch (e) {
                console.error("Error precargando bloques", e);
            } finally {
                setIsPreloading(false);
            }
        };
        loadBlocks();
        
        // Actualizar EndDate por defecto al cambiar StartDate (si el usuario no lo ha tocado manualmente)
        setEndDate(endOfYear(startDate));
    }
  }, [isOpen, startDate, propertyId]);


  // --- CÁLCULOS ---
  const weeksNeeded = useMemo(() => {
    const minWeeks = Math.ceil(members.length / maxSlots); 
    return Math.max(minWeeks, 4);
  }, [members.length, maxSlots]);
  const weeksToRender = Array.from({ length: weeksNeeded }, (_, i) => i);


  // --- HANDLERS BOARD ---
  const handleDragStart = (e: DragStartEvent) => setActiveDragId(e.active.id as string);
  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveDragId(null);
    if (!over) return;
    const memberId = active.id as string;
    const slotId = over.id as string; 
    if (slotId.startsWith('slot-')) {
       const newA = { ...assignments };
       Object.keys(newA).forEach(k => { if (newA[k] === memberId) delete newA[k]; }); // Evitar duplicados
       newA[slotId] = memberId;
       setAssignments(newA);
    }
  };
  const removeAssignment = (id: string) => {
    const newA = { ...assignments }; delete newA[id]; setAssignments(newA);
  };

  // --- HANDLERS BLOQUES ---
  const addBlock = () => {
    if (tempRange?.from && tempRange?.to) {
      setBlocks([...blocks, {
          name: tempName || (tempType === 'maintenance' ? 'Cierre Técnico' : 'Periodo Especial'),
          start_date: tempRange.from,
          end_date: tempRange.to,
          type: tempType
      }]);
      setTempRange(undefined); setTempName(""); setTempType('special');
    }
  };

  // --- GENERAR (ACCIÓN FINAL) ---
  const handleGenerate = async () => {
    setIsLoading(true);
    
    const cyclePattern = Object.entries(assignments).map(([key, userId]) => {
        const [, wStr, sStr] = key.split('-');
        return { weekIndex: parseInt(wStr), slotIndex: parseInt(sStr), userId };
    });

    const maxWeekIndex = cyclePattern.reduce((max, curr) => Math.max(max, curr.weekIndex), 0);
    
    const result = await generateYearlySchedule({
      propertyId, 
      startDate, 
      endDate, 
      turnDurationWeeks: 1, // DATO POR SUPUESTO (Como pediste)
      exemptions: blocks,   // Enviamos TODO (Mantenimientos + Exenciones)
      cyclePattern,
      cycleLengthWeeks: maxWeekIndex + 1
    });

    setIsLoading(false);
    if (result.success) {
      toast.success(result.message);
      onClose();
      setStep(1); setAssignments({});
    } else {
      toast.error(result.message);
    }
  };

  // --- RENDER ---
  const renderStepContent = () => {
    switch (step) {
      case 1: // FECHAS
        return (
            <div className="space-y-6 py-4">
                 <div className="grid gap-2">
                    <Label>Fecha Inicio Generación</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {startDate ? format(startDate, "PPP", { locale: es }) : <span>Seleccionar</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" locale={es} selected={startDate} onSelect={(d) => d && setStartDate(d)} initialFocus />
                        </PopoverContent>
                    </Popover>
                 </div>

                 <div className="grid gap-2">
                    <Label>Fecha Fin Generación</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {endDate ? format(endDate, "PPP", { locale: es }) : <span>Seleccionar</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" locale={es} selected={endDate} onSelect={(d) => d && setEndDate(d)} initialFocus />
                        </PopoverContent>
                    </Popover>
                    <p className="text-xs text-muted-foreground">Por defecto: Final del año seleccionado.</p>
                 </div>

                 {isPreloading && <p className="text-xs text-blue-600 animate-pulse">Buscando bloqueos existentes...</p>}
            </div>
        );

      case 2: // BLOQUEOS (Unificado)
        return (
            <div className="space-y-4 py-4">
                 <div className="p-3 border rounded-lg bg-slate-50 space-y-3">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Nuevo Bloqueo</Label>
                    <Input placeholder="Motivo (ej: Obras, Semana Santa...)" value={tempName} onChange={(e) => setTempName(e.target.value)} className="bg-white" />
                    
                    <RadioGroup value={tempType} onValueChange={(v: any) => setTempType(v)} className="flex gap-4">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="special" id="r1" />
                            <Label htmlFor="r1" className="cursor-pointer">Exención (Sorteo)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="maintenance" id="r2" />
                            <Label htmlFor="r2" className="cursor-pointer text-destructive">Mantenimiento (Cierre)</Label>
                        </div>
                    </RadioGroup>

                    <div className="flex gap-2">
                         <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("flex-1 justify-start bg-white", !tempRange && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {tempRange?.from ? (tempRange.to ? `${format(tempRange.from, 'dd/MM')} - ${format(tempRange.to, 'dd/MM')}` : format(tempRange.from, 'dd/MM')) : "Fechas"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="range" selected={tempRange} locale={es} onSelect={(r) => r?.from ? setTempRange({ from: r.from, to: r.to }) : setTempRange(undefined)} numberOfMonths={2} />
                            </PopoverContent>
                        </Popover>
                        <Button onClick={addBlock} disabled={!tempRange?.to} size="icon"><Plus className="h-4 w-4" /></Button>
                    </div>
                 </div>

                 <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                    <Label>Bloqueos Activos ({blocks.length})</Label>
                    {blocks.map((ex, i) => (
                        <div key={i} className={cn("flex justify-between items-center text-sm p-2 border rounded-md shadow-sm", ex.type === 'maintenance' ? "bg-red-50 border-red-100" : "bg-white")}>
                            <div className="flex flex-col">
                                <span className={cn("font-medium", ex.type === 'maintenance' && "text-red-700")}>
                                    {ex.type === 'maintenance' ? '🔧 ' : '📅 '} {ex.name}
                                </span>
                                <span className="text-xs text-muted-foreground">{format(ex.start_date, 'dd MMM')} - {format(ex.end_date, 'dd MMM')}</span>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setBlocks(prev => prev.filter((_, idx) => idx !== i))}><Trash2 className="h-3 w-3 text-slate-400"/></Button>
                        </div>
                    ))}
                 </div>
            </div>
        );

      case 3: // BOARD (Sin cambios mayores, solo visual)
        return (
            <div className="flex flex-col h-[500px] -mx-6 px-6 py-2">
                 <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                    {/* ... (Mismo código de Board que tenías) ... */}
                    {/* ... Asegúrate de incluir DroppableSlot, DraggableMember y StaticMemberCard ... */}
                    {/* ... Por brevedad no lo repito entero si ya lo tienes, pero avísame si lo necesitas ... */}
                    <div className="flex-1 overflow-y-auto pr-2 pb-4 border-b space-y-3">
                        {weeksToRender.map((weekIdx) => (
                            <div key={weekIdx} className="flex items-center gap-3 p-2 bg-slate-50 border rounded-lg">
                                <div className="w-10 text-center border-r border-slate-200 pr-2 shrink-0">
                                    <span className="block text-[9px] uppercase text-slate-400 font-bold">SEM</span>
                                    <span className="text-lg font-bold text-slate-600">{weekIdx + 1}</span>
                                </div>
                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {Array.from({ length: maxSlots }).map((_, slotIdx) => {
                                        const slotId = `slot-${weekIdx}-${slotIdx}`;
                                        const assignedUserId = assignments[slotId];
                                        const assignedMember = members.find(m => m.id === assignedUserId);
                                        return <DroppableSlot key={slotId} weekIndex={weekIdx} slotIndex={slotIdx} assignedMember={assignedMember} onRemove={() => removeAssignment(slotId)}/>
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="h-[140px] pt-3 shrink-0 bg-white z-10 shadow-sm">
                        <Label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Miembros ({members.filter(m => !Object.values(assignments).includes(m.id)).length})</Label>
                        <div className="flex flex-wrap gap-2 overflow-y-auto max-h-[100px] content-start pb-2">
                            {members.map(member => (
                                <DraggableMember key={member.id} id={member.id} name={member.display_name} initials={member.initials} isAssigned={Object.values(assignments).includes(member.id)}/>
                            ))}
                        </div>
                    </div>
                    {typeof document !== 'undefined' && createPortal(
                        <DragOverlay dropAnimation={null} zIndex={9999}> 
                            {activeDragId ? <StaticMemberCard name={members.find(m => m.id === activeDragId)?.display_name || ''} initials={members.find(m => m.id === activeDragId)?.initials || ''} isDragging /> : null}
                        </DragOverlay>, document.body
                    )}
                </DndContext>
            </div>
        );

      case 4: // CONFIRMACIÓN
        return (
             <div className="py-6 space-y-4 text-center">
                 <div className="bg-red-50 text-red-900 p-6 rounded-lg border border-red-200">
                    <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-red-600" />
                    <h3 className="font-bold text-lg">Gran Reset Confirmado</h3>
                    <p className="text-sm mt-2 opacity-90">
                        Se <strong>ELIMINARÁ TODO</strong> (Turnos, Mantenimientos antiguos, Exenciones) entre el <br/>
                        <strong>{format(startDate, 'dd/MM/yyyy')}</strong> y el <strong>{format(endDate, 'dd/MM/yyyy')}</strong>.
                    </p>
                    <p className="text-sm mt-2 font-semibold">
                        Se regenerará el calendario usando EXCLUSIVAMENTE los bloqueos y patrones definidos aquí.
                    </p>
                 </div>
            </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px] max-h-[95vh] flex flex-col p-0 gap-0 overflow-hidden">
            <DialogHeader className="p-6 pb-2">
                <DialogTitle>Asistente de Planificación Anual</DialogTitle>
                <DialogDescription>Paso {step} de 4</DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 py-2">{renderStepContent()}</div>
            <DialogFooter className="p-6 pt-2 bg-slate-50 border-t mt-auto">
                {step > 1 && <Button variant="outline" onClick={() => setStep(step - 1)} disabled={isLoading}><ArrowLeft className="mr-2 h-4 w-4"/> Atrás</Button>}
                {step < 4 ? 
                    <Button onClick={() => setStep(step + 1)}>Siguiente <ArrowRight className="ml-2 h-4 w-4"/></Button> : 
                    <Button onClick={handleGenerate} disabled={isLoading} variant="destructive">
                        {isLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Check className="mr-2 h-4 w-4"/>} 
                        Ejecutar Reset y Generar
                    </Button>
                }
            </DialogFooter>
        </DialogContent>
    </Dialog>
  );
}