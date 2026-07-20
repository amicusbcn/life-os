// app/finance/imports/[id]/ImportBatchDetailView.tsx
'use client'

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    ArrowLeft, Calendar, FileText, MoveUp, MoveDown, Save, ArrowUpDown, Clock, Loader2, CheckCircle2 
} from 'lucide-react';
import { toast } from 'sonner';
import { AccountAvatar } from '../../components/AccountAvatar';
import { reorderBatchTransactionsAction, ReorderItem } from '../../actions/importers';

export interface BatchTransactionItem {
    id: string;
    date: string;
    concept: string;
    amount: number;
    bank_balance?: number | null;
    import_sequence: number;
    category_name?: string;
    category_color?: string;
}

export interface BatchDetailLog {
    id: string;
    filename: string;
    row_count: number;
    skipped_count?: number;
    created_at: string;
    import_date?: string;
    account_name: string;
    account_color?: string;
    account_letter?: string;
    oldest_date?: string | null;
    newest_date?: string | null;
}

interface ImportBatchDetailViewProps {
    batch: BatchDetailLog;
    initialTransactions: BatchTransactionItem[];
}

export function ImportBatchDetailView({ batch, initialTransactions }: ImportBatchDetailViewProps) {
    const router = useRouter();
    const [transactions, setTransactions] = useState<BatchTransactionItem[]>(initialTransactions);
    const [isReordering, setIsReordering] = useState<boolean>(false);
    const [saving, setSaving] = useState<boolean>(false);

    // Formateo de fechas
    const formatDate = (dStr: string) => {
        const parts = dStr.split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        return dStr;
    };

    // Mover elemento arriba/abajo
    const moveItem = (index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= transactions.length) return;

        const updated = [...transactions];
        const temp = updated[index];
        updated[index] = updated[targetIndex];
        updated[targetIndex] = temp;

        // Re-asignar import_sequence basado en el nuevo índice
        const resequenced = updated.map((item, idx) => ({
            ...item,
            import_sequence: idx + 1
        }));

        setTransactions(resequenced);
    };

    // Cancelar reordenado y restaurar estado original
    const handleCancelReorder = () => {
        setTransactions(initialTransactions);
        setIsReordering(false);
    };

    // Guardar nuevo orden en BBDD
    const handleSaveReorder = async () => {
        setSaving(true);
        const payload: ReorderItem[] = transactions.map((tx, idx) => ({
            id: tx.id,
            import_sequence: idx + 1
        }));

        const res = await reorderBatchTransactionsAction(batch.id, payload);
        if (res.success) {
            toast.success("Nuevo orden guardado correctamente.");
            setIsReordering(false);
            router.refresh();
        } else {
            toast.error(res.error || "Error al reordenar transacciones.");
        }
        setSaving(false);
    };

    const logDate = batch.import_date || batch.created_at;

    return (
        <div className="space-y-6 pb-20 max-w-6xl mx-auto">
            {/* CABECERA Y NAVEGACIÓN */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-4">
                    <Link href="/finance/imports">
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl text-slate-400 hover:text-slate-700">
                            <ArrowLeft size={18} />
                        </Button>
                    </Link>
                    
                    <AccountAvatar 
                        account={{
                            name: batch.account_name,
                            color_theme: batch.account_color,
                            avatar_letter: batch.account_letter
                        }}
                        className="h-12 w-12 text-sm shrink-0 shadow-sm"
                    />

                    <div>
                        <h1 className="text-xl font-black italic tracking-tighter text-slate-800 uppercase flex items-center gap-2">
                            <FileText className="h-5 w-5 text-indigo-500" /> {batch.filename}
                        </h1>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-medium mt-1">
                            <span className="font-bold text-slate-600 uppercase">{batch.account_name}</span>
                            •
                            <span className="flex items-center gap-1 font-mono">
                                <Clock size={12} className="text-slate-400" />
                                {new Date(logDate).toLocaleDateString('es-ES', {
                                    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                })}
                            </span>
                            •
                            <span className="flex items-center gap-1 font-mono font-bold text-slate-600">
                                <Calendar size={12} className="text-indigo-500" />
                                {batch.oldest_date ? `${formatDate(batch.oldest_date)} → ${formatDate(batch.newest_date || '')}` : 'Sin rango'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* RESUMEN DE FILAS */}
                <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border border-emerald-100 font-mono font-bold px-3 py-1.5 text-xs rounded-xl">
                        <CheckCircle2 size={13} className="mr-1 text-emerald-600" />
                        {batch.row_count} importados
                    </Badge>
                    {(batch.skipped_count ?? 0) > 0 && (
                        <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 font-mono font-bold px-3 py-1.5 text-xs rounded-xl">
                            {batch.skipped_count} omitidos
                        </Badge>
                    )}
                </div>
            </div>

            {/* CONTROLES DE MODO DE REORDENADO */}
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="text-xs font-bold text-slate-500 flex items-center gap-2">
                    <ArrowUpDown size={16} className="text-indigo-500" />
                    <span>
                        {isReordering 
                            ? "Modo Reordenado Activo: Utiliza las flechas para ajustar la secuencia oficial del extracto." 
                            : "Secuencia de importación por defecto (import_sequence)."}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {isReordering ? (
                        <>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={handleCancelReorder}
                                disabled={saving}
                                className="h-9 text-xs font-bold text-slate-500"
                            >
                                Cancelar
                            </Button>
                            <Button 
                                size="sm" 
                                onClick={handleSaveReorder}
                                disabled={saving}
                                className="h-9 text-xs font-bold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
                            >
                                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                Guardar Orden
                            </Button>
                        </>
                    ) : (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setIsReordering(true)}
                            className="h-9 text-xs font-bold gap-1.5 rounded-xl border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                        >
                            <ArrowUpDown size={14} /> Reordenar Lote
                        </Button>
                    )}
                </div>
            </div>

            {/* TABLA DE TRANSACCIONES DEL LOTE */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50/80 border-b border-slate-100 uppercase text-[10px] font-black text-slate-400 tracking-wider">
                            <tr>
                                <th className="p-4 w-12 text-center">#</th>
                                <th className="p-4 w-28">Fecha</th>
                                <th className="p-4">Concepto</th>
                                <th className="p-4 w-40 text-right">Importe</th>
                                <th className="p-4 w-40 text-right">Saldo Banco</th>
                                {isReordering && <th className="p-4 w-24 text-center">Acción</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                            {transactions.map((tx, idx) => (
                                <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="p-4 text-center font-mono font-bold text-slate-400">
                                        {tx.import_sequence || idx + 1}
                                    </td>
                                    <td className="p-4 font-mono font-bold text-slate-600">
                                        {formatDate(tx.date)}
                                    </td>
                                    <td className="p-4 font-bold text-slate-800">
                                        {tx.concept}
                                    </td>
                                    <td className={`p-4 text-right font-mono font-black ${tx.amount < 0 ? 'text-slate-800' : 'text-emerald-600'}`}>
                                        {tx.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                                    </td>
                                    <td className="p-4 text-right font-mono font-bold text-slate-500">
                                        {tx.bank_balance !== null && tx.bank_balance !== undefined 
                                            ? `${tx.bank_balance.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`
                                            : '—'}
                                    </td>
                                    {isReordering && (
                                        <td className="p-4 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <Button 
                                                    size="icon" 
                                                    variant="ghost" 
                                                    disabled={idx === 0}
                                                    onClick={() => moveItem(idx, 'up')}
                                                    className="h-7 w-7 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                                                >
                                                    <MoveUp size={14} />
                                                </Button>
                                                <Button 
                                                    size="icon" 
                                                    variant="ghost" 
                                                    disabled={idx === transactions.length - 1}
                                                    onClick={() => moveItem(idx, 'down')}
                                                    className="h-7 w-7 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                                                >
                                                    <MoveDown size={14} />
                                                </Button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}