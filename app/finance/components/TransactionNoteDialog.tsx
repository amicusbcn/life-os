// app/finance/components/TransacionNoteDialog.tsx

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { updateTransactionNoteAction } from "../actions"
import { toast } from "sonner"
import { FinanceTransaction } from "@/types/finance"

export function TransactionNoteDialog({ transaction, open, onOpenChange }: { 
    transaction: FinanceTransaction, 
    open: boolean, 
    onOpenChange: (open: boolean) => void 
}) {
    const [note, setNote] = useState(transaction.notes || "");

    const handleSave = async () => {
        const res = await updateTransactionNoteAction(transaction.id, note);
        if (res.success) {
            toast.success("Nota actualizada");
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Editar Nota (Alias)</DialogTitle>
                    <DialogDescription className="text-xs italic text-slate-500">
                        Concepto original: {transaction.concept}
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Input 
                        value={note} 
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Escribe un nombre reconocible..."
                    />
                </div>
                <DialogFooter>
                    <Button onClick={handleSave}>Guardar cambios</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}