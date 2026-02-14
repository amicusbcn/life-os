// app/inventory/components/LoansList.tsx
'use client';

import { History, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LoanNewDialog } from "./LoanNewDialog";
import { LoanReturnButton } from "./LoanReturnButton"; // Tu botón de devolución

interface Props {
    id: string; // ID del Item
    loans: any[];
    onMutation: () => void;
}

export function LoansList({ id, loans = [], onMutation }: Props) {
    return (
        <section className="space-y-4 pb-10">
            {/* Cabecera con Botón para Prestar */}
            <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <History className="h-3.5 w-3.5" /> Historial de Préstamos
                </h3>
                
                {/* Solo permitimos prestar si no hay un préstamo activo (opcional) */}
                {!loans.some(l => !l.return_date) && (
                    <LoanNewDialog itemId={id} onSuccess={onMutation}>
                        <button className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold hover:bg-blue-100 transition-colors border border-blue-100 uppercase tracking-tighter">
                            <Plus className="w-3 h-3" /> Nuevo Préstamo
                        </button>
                    </LoanNewDialog>
                )}
            </div>
            
            <div className="space-y-3">
                {loans?.map((loan) => {
                    const isReturned = !!loan.return_date;
                    return (
                        <Card 
                            key={loan.id} 
                            className={`border-0 shadow-sm rounded-2xl ring-1 transition-all ${
                                isReturned 
                                ? 'ring-slate-100 bg-white opacity-60' 
                                : 'ring-orange-200 bg-orange-50/50'
                            }`}
                        >
                            <CardContent className="p-0 flex min-h-[64px]">
                                {/* ICONO LATERAL */}
                                <div className={`w-14 flex items-center justify-center border-r ${
                                    isReturned 
                                    ? 'border-slate-100 bg-slate-50 text-slate-400' 
                                    : 'border-orange-100 bg-orange-100 text-orange-600'
                                }`}>
                                    <History className="h-5 w-5" />
                                </div>

                                {/* CONTENIDO CENTRAL */}
                                <div className="flex-1 px-4 py-3 flex flex-col justify-center">
                                    <p className={`font-bold text-sm ${isReturned ? 'text-slate-600' : 'text-slate-900'}`}>
                                        {loan.borrower_name}
                                    </p>
                                    <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                                        Desde: {new Date(loan.loan_date).toLocaleDateString('es-ES')} 
                                    </p>
                                </div>

                                {/* ACCIÓN / FECHA DEVOLUCIÓN */}
                                <div className="pr-4 flex items-center">
                                    {!isReturned ? (
                                        <LoanReturnButton 
                                            loanId={loan.id} 
                                            itemId={id} 
                                            onSuccess={onMutation} // Para refrescar al devolver
                                        />
                                    ) : (
                                        <div className="text-right">
                                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                                Devuelto
                                            </div>
                                            <div className="text-[11px] font-bold text-slate-600">
                                                {new Date(loan.return_date).toLocaleDateString('es-ES')}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}

                {(!loans || loans.length === 0) && (
                    <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed rounded-3xl border-slate-100 bg-slate-50/30">
                        <History className="h-8 w-8 text-slate-200 mb-2" />
                        <p className="text-center text-[11px] text-slate-400 italic font-medium">
                            No hay historial de préstamos para este objeto.
                        </p>
                    </div>
                )}
            </div>
        </section>
    );
}