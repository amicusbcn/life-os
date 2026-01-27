'use client';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { DraggableMember } from './DraggableMember';
import { BookingProfile } from '@/types/booking'; // Tu tipo Profile
import { X } from 'lucide-react';

interface DroppableSlotProps {
  weekIndex: number;
  slotIndex: number;
  assignedMember?: BookingProfile;
  onRemove: () => void; // Para devolver al banquillo
}

export function DroppableSlot({ weekIndex, slotIndex, assignedMember, onRemove }: DroppableSlotProps) {
  // El ID del slot debe ser único: "week-0-slot-1"
  const slotId = `slot-${weekIndex}-${slotIndex}`;
  
  const { setNodeRef, isOver } = useDroppable({
    id: slotId,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative flex items-center justify-center h-12 w-full rounded-md border-2 border-dashed transition-colors",
        isOver ? "border-primary bg-primary/5 border-solid" : "border-slate-200 bg-slate-50/50",
        assignedMember ? "border-solid border-slate-200 bg-white" : ""
      )}
    >
      {assignedMember ? (
        <div className="group relative w-full h-full">
            {/* Renderizamos una versión estática o interactiva del miembro aquí */}
            <div className="flex items-center gap-2 p-2 w-full h-full">
                 <div className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">
                    {assignedMember.initials}
                </div>
                <span className="text-xs font-medium truncate">{assignedMember.display_name}</span>
            </div>
            
            {/* Botón para quitar ( devolver al banquillo) */}
            <button 
                onClick={onRemove}
                className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
            >
                <X size={12} />
            </button>
        </div>
      ) : (
        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
            Libre
        </span>
      )}
    </div>
  );
}