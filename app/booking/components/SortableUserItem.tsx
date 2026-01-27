'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SortableUserItemProps {
  id: string;
  name: string;
  initials: string;
  turnNumber: number; // Solo necesitamos el número de orden
}

export function SortableUserItem({ id, name, initials, turnNumber }: SortableUserItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-3 bg-card border rounded-lg mb-2 touch-none select-none transition-all",
        isDragging ? "opacity-50 border-primary ring-2 ring-primary/20 z-10 shadow-xl" : "hover:border-primary/50"
      )}
    >
      {/* GRIPPER */}
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1">
        <GripVertical size={20} />
      </div>
      
      {/* INDICADOR DE SEMANA (Visual Anchor) */}
      <div className="flex flex-col items-center justify-center min-w-[80px] border-r pr-4 mr-2 gap-1">
         <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
            <Calendar className="w-3 h-3" /> TURNO
         </span>
         <span className="text-lg font-mono font-bold text-primary tracking-tight">
            SEM {turnNumber}
         </span>
      </div>

      {/* AVATAR */}
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700 text-xs font-bold shrink-0 border border-slate-200">
        {initials}
      </div>

      {/* NOMBRE */}
      <span className="font-medium text-sm flex-1 truncate text-foreground/90">{name}</span>
    </div>
  );
}