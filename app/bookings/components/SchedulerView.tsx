// app/properties/[slug]/booking/scheduler/SchedulerView.tsx
'use client';

import { useState } from 'react';
import { DndContext, useDraggable, useDroppable, DragEndEvent } from '@dnd-kit/core';
import { saveAndSyncSchedule } from '@/app/bookings/actions';
import { Button } from '@/components/ui/button';
import { CalendarDays, Save, X, GripVertical } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { checkExistingRotation } from '../actions';

// --- COMPONENTE DRAGGABLE (MIEMBRO) ---
function DraggableMember({ member }: any) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `member-${member.id}`,
    data: member
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 50
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`p-4 rounded-2xl border bg-white flex items-center gap-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${isDragging ? 'opacity-50 ring-2 ring-indigo-500' : ''}`}
    >
      <GripVertical size={14} className="text-slate-300" />
      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: member.color }} />
      <span className="font-bold text-sm">{member.name}</span>
    </div>
  );
}

// --- COMPONENTE DROPPABLE (SLOT) ---
function DroppableSlot({ weekNum, slotIndex, memberId, members, onRemove }: any) {
  const { isOver, setNodeRef } = useDroppable({
    id: `slot-${weekNum}-${slotIndex}`,
  });

  const member = members.find((m: any) => m.id === memberId);

  return (
    <div
      ref={setNodeRef}
      className={`h-20 rounded-3xl border-2 border-dashed flex items-center justify-center relative overflow-hidden transition-all
        ${isOver ? 'border-indigo-500 bg-indigo-50 scale-[1.02]' : 'border-slate-200 bg-white'}
        ${member ? 'border-solid border-slate-200' : ''}`}
    >
      {member ? (
        <div className="w-full h-full p-4 flex items-center gap-3 bg-slate-50">
          <div className="w-2 h-8 rounded-full" style={{ backgroundColor: member.color }} />
          <span className="font-bold text-xs truncate">{member.name}</span>
          <button 
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="ml-auto p-1 hover:bg-rose-100 text-rose-500 rounded-lg transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <span className="text-[9px] font-black text-slate-300 uppercase italic">
          {isOver ? '¡Suelta aquí!' : `Slot ${slotIndex + 1}`}
        </span>
      )}
    </div>
  );
}

// --- COMPONENTE PRINCIPAL ---
export function SchedulerView({ property, members, initialSettings }: any) {
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-12-31');
  const [template, setTemplate] = useState(initialSettings?.template || {
    1: Array(property.max_slots).fill(null),
    2: Array(property.max_slots).fill(null),
    3: Array(property.max_slots).fill(null),
    4: Array(property.max_slots).fill(null),
    5: Array(property.max_slots).fill(null),
  });
  const [loading, setLoading] = useState(false);

  // MANEJADOR DEL FIN DEL ARRASTRE
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    // Extraer datos del origen (active) y destino (over)
    const memberId = active.id.toString().replace('member-', '');
    const [_, weekNum, slotIndex] = over.id.toString().split('-');

    // Actualizar el template
    setTemplate((prev: any) => {
      const newWeek = [...prev[weekNum]];
      newWeek[parseInt(slotIndex)] = memberId;
      return { ...prev, [weekNum]: newWeek };
    });
  }

  const removeMemberFromSlot = (weekNum: number, slotIndex: number) => {
    setTemplate((prev: any) => {
      const newWeek = [...prev[weekNum]];
      newWeek[slotIndex] = null;
      return { ...prev, [weekNum]: newWeek };
    });
  };

  const handleSync = async () => {
    if (!startDate || !endDate) {
      toast.error("Selecciona un rango válido");
      return;
    }

    setLoading(true);

    try {
      // 1. COMPROBACIÓN PREVIA
      const { count } = await checkExistingRotation(property.id, { start: startDate, end: endDate });

      if (count > 0) {
        // Lanzamos el aviso. Podrías usar un modal de Shadcn aquí.
        const confirmOverwrite = window.confirm(
          `Atención: Ya existen ${count} turnos de rueda generados en este periodo. \n\n` +
          `Si continúas, se borrarán permanentemente y se aplicará el nuevo patrón de 5 semanas. \n\n` +
          `¿Deseas proceder?`
        );

        if (!confirmOverwrite) {
          setLoading(false);
          return; 
        }
      }

      // 2. EJECUCIÓN (Si el usuario acepta o si no había nada)
      await saveAndSyncSchedule(property.id, template, members, {
        start: startDate,
        end: endDate
      });

      toast.success("Calendario actualizado correctamente");
    } catch (error) {
      console.error(error);
      toast.error("Error al sincronizar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-screen bg-slate-50">
        <header className="h-24 bg-white border-b flex items-center justify-between px-8 shadow-sm">
          {/* Tu código del Header se mantiene igual... */}
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 p-3 rounded-2xl text-white">
              <CalendarDays size={24} />
            </div>
            <div>
              <h1 className="font-black text-xl tracking-tighter uppercase italic leading-none">Planificador Maestro</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                Propiedad: <span className="text-slate-900">{property.name}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 bg-slate-50 p-2 rounded-2xl border">
            <div className="flex items-center gap-3 px-3">
              <div className="flex flex-col">
                <Label className="text-[9px] font-black uppercase text-slate-400 mb-1 ml-1">Desde</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 bg-white border-0 shadow-sm rounded-xl text-xs font-bold w-36" />
              </div>
              <div className="flex flex-col">
                <Label className="text-[9px] font-black uppercase text-slate-400 mb-1 ml-1">Hasta</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9 bg-white border-0 shadow-sm rounded-xl text-xs font-bold w-36" />
              </div>
            </div>
            <Button onClick={handleSync} disabled={loading} className="bg-slate-900 hover:bg-indigo-600 text-white font-black uppercase text-[10px] tracking-widest h-14 px-8 rounded-xl transition-all">
              {loading ? "Sincronizando..." : "Guardar y Sincronizar"}
            </Button>
          </div>
        </header>

        <main className="flex-1 flex overflow-hidden">
          <div className="flex-1 p-8 overflow-x-auto">
            <div className="grid grid-cols-5 gap-6 min-w-[1000px]">
              {[1, 2, 3, 4, 5].map((weekNum) => (
                <div key={weekNum} className="space-y-4">
                  <div className={`text-center p-3 rounded-2xl font-black uppercase text-[10px] tracking-widest ${weekNum === 5 ? 'bg-amber-100 text-amber-700' : 'bg-slate-900 text-white'}`}>
                    Semana {weekNum}
                  </div>
                  <div className="space-y-3">
                    {template[weekNum].map((memberId: any, slotIndex: number) => (
                      <DroppableSlot 
                        key={`${weekNum}-${slotIndex}`}
                        weekNum={weekNum}
                        slotIndex={slotIndex}
                        memberId={memberId}
                        members={members}
                        onRemove={() => removeMemberFromSlot(weekNum, slotIndex)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="w-80 bg-white border-l p-6 shadow-2xl">
            <h3 className="font-black text-[10px] uppercase text-slate-400 tracking-widest mb-6">El Banquillo</h3>
            <div className="space-y-3">
              {members.map((m: any) => (
                <DraggableMember key={m.id} member={m} />
              ))}
            </div>
          </div>
        </main>
      </div>
    </DndContext>
  );
}