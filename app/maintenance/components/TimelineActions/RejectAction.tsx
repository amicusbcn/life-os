// app/maintenance/task/[id]/components/actions/RejectAction.tsx
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Archive } from "lucide-react";

export function RejectAction({ onConfirm }: any) {
  const [reason, setReason] = useState('');

  return (
    <div className="space-y-4">
      <Textarea 
        placeholder="Indica el motivo del archivo (será visible en el historial)..."
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="min-h-[100px] rounded-xl border-slate-100 focus:ring-red-500"
      />
      <div className="flex justify-end">
        <Button 
          disabled={!reason}
          onClick={() => onConfirm(reason)}
          className="bg-red-600 hover:bg-red-700 rounded-xl gap-2"
        >
          <Archive className="h-4 w-4" /> Confirmar Archivo
        </Button>
      </div>
    </div>
  );
}