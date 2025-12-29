// app/finance/components/MagicRuleDialog.tsx
'use client'

import React, { useState } from "react"
import { Zap, Check, X, Rocket } from "lucide-react" // Añadimos Rocket para el estilo
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { createRule, applyRuleRetroactively } from "../actions" // Importamos la función retroactiva
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

        // Tipamos la respuesta para que TS no se queje del .data
    const res = await createRule({}, formData) as { success: boolean, data?: any, error?: string };
    
    if (res.success && res.data) {
        const newRuleId = res.data.id; // Ahora sí existe

        toast.success("Regla automatizada creada", {
            description: `¿Quieres aplicarla a los movimientos antiguos de "${pattern}"?`,
            duration: 8000,
            action: {
                label: "🚀 Ejecutar ahora",
                onClick: async () => {
                    const toastId = toast.loading("Limpiando el pasado...");
                    const retroRes = await applyRuleRetroactively(newRuleId);
                    
                    if (retroRes.success) {
                        toast.success(`¡Hecho! ${retroRes.count} movimientos organizados.`, {
                            id: toastId,
                        });
                    } else {
                        toast.error("No se pudo aplicar al historial", { id: toastId });
                    }
                }
            }
        });

        router.refresh();
        onClose();
    } else if (res.error) {
        toast.error("Error al crear la regla: " + res.error);
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