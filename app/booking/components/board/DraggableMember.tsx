'use client';
import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

interface DraggableMemberProps {
  id: string;
  name: string;
  initials: string;
  isAssigned?: boolean; // Si ya está en la parrilla, quizás cambia de estilo
}

export function DraggableMember({ id, name, initials, isAssigned }: DraggableMemberProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: id,
    data: { name, initials } // Pasamos datos para pintarlo mientras se arrastra
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  // Si ya está asignado en otro lado (y lo estamos pintando en el banquillo), lo ocultamos o desactivamos visualmente
  if (isAssigned && !isDragging) {
      return (
        <div className="flex items-center gap-2 p-2 rounded-lg border border-dashed bg-slate-50 opacity-40 grayscale cursor-not-allowed">
            <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px]">{initials}</div>
            <span className="text-xs font-medium text-slate-400 line-through">{name}</span>
        </div>
      )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "flex items-center gap-2 p-2 bg-white border shadow-sm rounded-lg cursor-grab hover:border-primary/50 touch-none active:cursor-grabbing",
        isDragging && "opacity-80 z-50 ring-2 ring-primary scale-105 rotate-2"
      )}
    >
      <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
        {initials}
      </div>
      <span className="text-xs font-medium truncate max-w-[100px]">{name}</span>
    </div>
  );
}