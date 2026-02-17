// app/maintenance/task/[id]/components/actions/AssignAction.tsx
import { UserPlus } from "lucide-react";

export function AssignAction({ members, onConfirm }: any) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {members.map((member: any) => (
          <button
            key={member.id}
            onClick={() => onConfirm(member.id, member.name)}
            className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all text-left group"
          >
            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-black text-slate-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              {member.name.charAt(0)}
            </div>
            <span className="text-sm font-bold text-slate-700">{member.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}