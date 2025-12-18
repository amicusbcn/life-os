'use client'

import React, { useState } from "react"
import { Zap, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { createRule } from "../actions"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export function MagicRuleDialog({ 
    concept: initialConcept, 
    categoryId, 
    categoryName, 
    onClose 
}: { 
    concept: string, 
    categoryId: string, 
    categoryName: string, 
    onClose: () => void 
}) {
    const router = useRouter();
    const [pattern, setPattern] = useState(initialConcept);

    const handleCreateRule = async () => {
        const formData = new FormData();
        formData.append('pattern', pattern.toUpperCase());
        formData.append('category_id', categoryId);

        const res = await createRule({}, formData);
        if (res.success) {
            toast.success("Regla automatizada creada");
            router.refresh();
            onClose();
        }
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] bg-slate-900 text-white border-slate-800">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-indigo-400">
                        <Zap className="h-5 w-5 fill-current" />
                        Crear Automatización
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Cada vez que aparezca este texto, se asignará a <b>{categoryName}</b>.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Patrón de búsqueda (Editable)</label>
                        <Input 
                            value={pattern}
                            onChange={(e) => setPattern(e.target.value)}
                            className="bg-slate-800 border-slate-700 text-white focus:ring-indigo-500"
                            placeholder="Ej: MERCADONA"
                        />
                        <p className="text-[10px] text-slate-500 italic">
                            Consejo: Borra números específicos para que la regla sea más general.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white hover:bg-slate-800">
                        Cancelar
                    </Button>
                    <Button onClick={handleCreateRule} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                        Guardar Regla Mágica
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}