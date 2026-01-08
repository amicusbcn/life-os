// app/travel/components/dialogs/MileageSettingsDialog.tsx
'use client'

import React, { useState } from "react"
import { useRouter } from 'next/navigation'
import { deleteMileageTemplate, createMileageTemplate } from "@/app/travel/actions" 
import { TravelMileageTemplate } from "@/types/travel"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from 'sonner'
import { cn } from "@/lib/utils"

import { 
    Gauge, Plus, Trash2, X, MapPin, Navigation, Loader2
} from "lucide-react"

// --- FILA DE PLANTILLA (RECORRIDO) ---
function MileageRow({ template }: { template: TravelMileageTemplate }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        if (!confirm('¿Eliminar este recorrido fijo?')) return;
        setLoading(true);
        const res = await deleteMileageTemplate(template.id);
        if (res.success) {
            toast.success('Recorrido eliminado');
            router.refresh();
        } else {
            toast.error(res.error || 'Error al eliminar');
        }
        setLoading(false);
    };

    return (
        <div className="group flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white shadow-sm hover:border-indigo-100 transition-all">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-lg">
                    <Navigation className="h-4 w-4 text-indigo-500" />
                </div>
                <div>
                    <p className="font-bold text-sm text-slate-700">{template.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{template.distance} km</p>
                </div>
            </div>
            <Button 
                size="icon" variant="ghost" 
                onClick={handleDelete}
                disabled={loading}
                className="h-8 w-8 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
            >
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </Button>
        </div>
    );
}

// --- COMPONENTE PRINCIPAL ---
export function MileageSettingsDialog({ initialTemplates = [], children }: { initialTemplates: TravelMileageTemplate[], children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();

    // Clonamos el trigger para activarlo desde cualquier botón (como el del settings menu)
    const child = React.Children.only(children) as React.ReactElement<any>;
    const trigger = React.cloneElement(child, {
        onClick: (e: React.MouseEvent) => {
            e.stopPropagation();
            setOpen(true);
        }
    });

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);
        
        const res = await createMileageTemplate(formData);
        if (res.success) {
            toast.success('Recorrido añadido');
            setShowNew(false);
            router.refresh();
        } else {
            toast.error(res.error || 'Error al crear');
        }
        setIsSubmitting(false);
    };

    return (
        <>
            {trigger}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[450px] max-h-[80vh] flex flex-col bg-slate-50 p-0 overflow-hidden border-none shadow-2xl">
                    <DialogHeader className="p-6 pb-4 bg-white border-b">
                        <DialogTitle className="flex items-center gap-2 uppercase tracking-tighter font-black text-slate-700">
                            <Gauge className="h-5 w-5 text-indigo-500" /> Recorridos Fijos
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 flex flex-col overflow-hidden p-6 pt-0">
                        <Button 
                            variant="outline" 
                            className="w-full mb-6 border-dashed border-slate-300 bg-white hover:bg-slate-50 text-slate-500 gap-2 h-11 font-bold text-xs"
                            onClick={() => setShowNew(!showNew)}
                        >
                            {showNew ? <X className="h-4 w-4"/> : <Plus className="h-4 w-4" />}
                            {showNew ? "Cancelar" : "Nuevo Recorrido"}
                        </Button>

                        {showNew && (
                            <form onSubmit={handleCreate} className="mb-6 p-4 bg-white rounded-xl border border-indigo-100 shadow-sm space-y-4 animate-in slide-in-from-top-2">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400">Nombre del Trayecto</label>
                                    <Input name="name" placeholder="Ej: Oficina - Cliente A" required className="h-9" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400">Distancia (km)</label>
                                    <Input name="distance" type="number" step="0.1" placeholder="0.0" required className="h-9" />
                                </div>
                                <Button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-700 h-9 text-xs font-bold">
                                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Guardar Recorrido"}
                                </Button>
                            </form>
                        )}

                        <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
                            {initialTemplates.length === 0 ? (
                                <div className="text-center py-10 text-slate-400 italic">
                                    <p className="text-xs">No hay recorridos configurados.</p>
                                </div>
                            ) : (
                                initialTemplates.map((t) => (
                                    <MileageRow key={t.id} template={t} />
                                ))
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}