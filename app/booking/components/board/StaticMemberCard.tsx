// src/app/(app)/booking/_components/board/StaticMemberCard.tsx
import { cn } from '@/lib/utils';

interface StaticMemberCardProps {
  name: string;
  initials: string;
  isDragging?: boolean;
}

export function StaticMemberCard({ name, initials, isDragging }: StaticMemberCardProps) {
  return (
    <div className={cn(
      "flex items-center gap-2 p-2 bg-white border border-primary/50 shadow-xl rounded-lg w-40 cursor-grabbing",
      isDragging && "rotate-2 scale-105"
    )}>
      <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
        {initials}
      </div>
      <span className="font-bold text-xs truncate text-primary/90">{name}</span>
    </div>
  );
}