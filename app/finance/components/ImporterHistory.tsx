// app/finance/components/ImporterHistory.tsx
'use client'

import React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { History, FileText } from "lucide-react"

interface ImporterHistoryProps {
    children: React.ReactNode; // 💡 AHORA SÍ: Declaramos explícitamente que acepta un hijo (el botón del menú)
    history: any[];            // Recibe el array de logs históricos de importaciones
}

export function ImporterHistory({ children, history = [] }: ImporterHistoryProps) {
        return (
        <Dialog>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6 gap-4">
                <DialogHeader className="pb-2 border-b">
                    <DialogTitle className="flex items-center gap-2 text-slate-800 text-lg font-black uppercase tracking-tight">
                        <History className="h-5 w-5 text-indigo-500" />
                        Historial de Importaciones
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto pr-1 space-y-2 mt-2">
                    {history.length === 0 ? (
                        <div className="text-center py-24 text-slate-400 italic bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                            <History className="h-10 w-10 mx-auto mb-3 opacity-20 text-slate-500" />
                            <p className="text-sm font-medium">No hay registros de importación todavía.</p>
                            <p className="text-[11px] text-slate-400 mt-1">Los archivos que importes aparecerán listados aquí.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-3">
                                Registros de auditoría ({history.length})
                            </p>
                            {history.map((log: any) => (
                                <div 
                                    key={log.id} 
                                    className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex items-center justify-between gap-4"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                                            <FileText className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-slate-700 truncate">
                                                {log.name || `Importación #${log.id.slice(0,5)}`}
                                            </p>
                                            <p className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                                <span className="font-medium text-slate-500">
                                                    {log.accounts?.name || 'Cuenta no disponible'}
                                                </span>
                                                • 
                                                <span>
                                                    {new Date(log.created_at).toLocaleDateString(undefined, {
                                                        day: '2-digit',
                                                        month: '2-digit',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                    <Badge 
                                        variant="secondary" 
                                        className="text-[10px] font-black tracking-tight px-2.5 py-1 bg-slate-100 text-slate-600 shrink-0 border border-slate-200"
                                    >
                                        {log.row_count ?? 0} movs
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}