// app/finance/components/UnlinkTripConfirmDialog.tsx
'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2, Unlink, X } from "lucide-react";

interface Props {
    open: boolean;
    onClose: () => void;
    onConfirm: (deleteExpense: boolean) => void;
}

export function UnlinkTripConfirmDialog({ open, onClose, onConfirm }: Props) {
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[400px] bg-slate-900 text-white border-slate-800 shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-amber-500 uppercase tracking-tighter font-black">
                        <AlertTriangle className="h-5 w-5" /> Atención: Transacción Vinculada
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <p className="text-sm text-slate-400">
                        Este movimiento está conectado a un gasto en tu App de Viajes. Si cambias la categoría, el vínculo se romperá. ¿Qué prefieres hacer?
                    </p>

                    <div className="grid gap-3">
                        {/* OPCIÓN 2: Desvincular pero mantener el gasto en viajes */}
                        <Button 
                            variant="outline" 
                            onClick={() => onConfirm(false)}
                            className="bg-slate-800 border-slate-700 hover:bg-slate-700 hover:text-white justify-start h-auto py-3 px-4"
                        >
                            <Unlink className="mr-3 h-5 w-5 text-indigo-400" />
                            <div className="text-left">
                                <p className="text-sm font-bold">Desvincular solamente</p>
                                <p className="text-[10px] text-slate-500 uppercase font-black">El gasto se queda en el viaje (y los ajustes virtuales)</p>
                            </div>
                        </Button>

                        {/* OPCIÓN 3: Borrar todo rastro */}
                        <Button 
                            variant="destructive" 
                            onClick={() => onConfirm(true)}
                            className="justify-start h-auto py-3 px-4"
                        >
                            <Trash2 className="mr-3 h-5 w-5" />
                            <div className="text-left">
                                <p className="text-sm font-bold">Borrar gasto del viaje</p>
                                <p className="text-[10px] text-rose-200 uppercase font-black">Elimina el gasto y cualquier ajuste de cuenta virtual</p>
                            </div>
                        </Button>
                    </div>

                    <Button variant="ghost" onClick={onClose} className="w-full text-slate-500 hover:text-white mt-2">
                        <X className="mr-2 h-4 w-4" /> Cancelar (Mantener como viaje)
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}