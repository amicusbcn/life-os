// app/finance/components/TransferAssistant.tsx
'use client'

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
    findMirrorCandidatesAction, 
    reconcileTransactionsAction, 
    handleTransferAction 
} from '../actions';
import { FinanceTransaction, FinanceAccount } from '@/types/finance';
import { ArrowRightLeft, Landmark, Search, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';

export function TransferAssistant({ 
    transaction, 
    accounts, 
    onClose 
}: { 
    transaction: FinanceTransaction, 
    accounts: FinanceAccount[], 
    onClose: () => void 
}) {
    const [candidates, setCandidates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Usamos tu función existente para buscar espejos
        findMirrorCandidatesAction(transaction.amount, transaction.date, transaction.id)
            .then(res => {
                if (res.success) setCandidates(res.candidates);
                setLoading(false);
            });
    }, [transaction]);

    // Vincular con un movimiento ya importado
    const handleLinkExisting = async (targetId: string) => {
        const res = await reconcileTransactionsAction(transaction.id, targetId);
        if (res.success) {
            toast.success("Transferencia conciliada correctamente");
            onClose();
        } else {
            toast.error("Error al conciliar: " + res.error);
        }
    };

    // Crear espejo en cuenta manual (Hipoteca, Inversiones, etc.)
    const handleLinkToAccount = async (targetAccountId: string) => {
        const res = await handleTransferAction(transaction.id, targetAccountId);
        if (res.success) {
            toast.success(res.message || "Movimiento espejo creado");
            onClose();
        } else {
            toast.error("Error: " + res.error);
        }
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[450px] bg-slate-900 text-white border-slate-800 shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-amber-400 font-black text-xl tracking-tighter">
                        <ArrowRightLeft className="h-6 w-6" />
                        CONCILIACIÓN INTELIGENTE
                    </DialogTitle>
                    <DialogDescription className="text-slate-400 text-xs">
                        Estás clasificando <strong>{transaction.concept}</strong> ({transaction.amount}€) como transferencia.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-2">
                    {/* OPCIÓN 1: VINCULAR EXISTENTE */}
                    <section className="space-y-3">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                            <Search className="h-3 w-3" /> 
                            Movimientos espejo detectados
                        </div>
                        
                        {loading ? (
                            <div className="p-4 text-center text-xs text-slate-500 animate-pulse">Buscando en otras cuentas...</div>
                        ) : candidates.length > 0 ? (
                            <div className="grid gap-2">
                                {candidates.map(c => (
                                    <button 
                                        key={c.id}
                                        onClick={() => handleLinkExisting(c.id)}
                                        className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-amber-500/50 hover:bg-slate-800 transition-all group"
                                    >
                                        <div className="text-left">
                                            <p className="text-xs font-bold text-slate-200 group-hover:text-white truncate w-40">{c.concept}</p>
                                            <p className="text-[10px] text-slate-500">{c.finance_accounts?.name} • {c.date}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-mono font-bold text-emerald-400">{(c.amount).toFixed(2)}€</p>
                                            <p className="text-[9px] text-amber-500 font-bold uppercase">Vincular</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center">
                                <p className="text-xs text-slate-500 italic">No hay movimientos de {-transaction.amount}€ en fechas cercanas.</p>
                            </div>
                        )}
                    </section>

                    {/* OPCIÓN 2: CREAR EN CUENTA MANUAL */}
                    <section className="space-y-3">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                            <PlusCircle className="h-3 w-3" />
                            Generar movimiento espejo en...
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                            {accounts
                                .filter(a => a.id !== transaction.account_id) // No mostrar la cuenta actual
                                .sort((a, b) => a.name.localeCompare(b.name)) // Ordenar alfabéticamente
                                .map(acc => (
                                    <Button 
                                        key={acc.id} 
                                        variant="ghost" 
                                        onClick={() => handleLinkToAccount(acc.id)}
                                        className="h-auto py-3 px-3 justify-start bg-slate-800/30 hover:bg-indigo-900/40 text-left border border-transparent hover:border-indigo-500/50 transition-all group"
                                    >
                                        <div className="flex flex-col gap-1 w-full">
                                            <div className="flex items-center">
                                                <Landmark className="h-3 w-3 mr-2 text-indigo-400 shrink-0 group-hover:text-indigo-300" />
                                                <span className="text-[11px] font-bold leading-tight truncate">{acc.name}</span>
                                            </div>
                                            {/* Pequeño indicador del tipo de cuenta para ayudarte */}
                                            <span className="text-[8px] uppercase text-slate-500 ml-5 font-black tracking-tighter">
                                                {acc.account_type === 'credit_card' ? 'Tarjeta' : 'Cuenta'}
                                            </span>
                                        </div>
                                    </Button>
                                ))
                            }
                        </div>
                        <p className="text-[9px] text-slate-500 italic mt-2 leading-tight">
                            * Al elegir una cuenta, se creará un movimiento de **{-transaction.amount}€** para que el saldo de ambos lados cuadre perfectamente.
                        </p>
                    </section>
                </div>
            </DialogContent>
        </Dialog>
    );
}