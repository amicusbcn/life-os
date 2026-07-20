// app/finance/imports/ImporterLogsView.tsx
'use client'

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FinanceAccount } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
    FileText, Eye, Trash2, History, Filter, ArrowLeft, Calendar, Loader2, Pencil, Check, X 
} from 'lucide-react';
import { toast } from 'sonner';
import { deleteImportBatchAction, renameImportBatchAction } from '../actions/importers';
import { AccountAvatar } from '../components/AccountAvatar';

export interface ImportLogItem {
    id: string;
    created_at: string;
    filename: string;
    row_count: number;
    import_date?: string;
    account_id: string;
    account_name?: string;
    account_color?: string;
    account_letter?: string;
    oldest_date?: string | null;
    newest_date?: string | null;
}

interface ImporterLogsViewProps {
    initialLogs: ImportLogItem[];
    accounts: FinanceAccount[];
}

export function ImporterLogsView({ initialLogs, accounts }: ImporterLogsViewProps) {
    const router = useRouter();
    const [selectedAccount, setSelectedAccount] = useState<string>('ALL');
    const [selectedYear, setSelectedYear] = useState<string>('ALL');
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Estado para edición de nombre
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState<string>('');
    const [renamingLoading, setRenamingLoading] = useState<boolean>(false);

    // Helper de rango de fechas
    const formatDateRange = (oldest?: string | null, newest?: string | null) => {
        if (!oldest || !newest) return "Sin fechas";
        const format = (dStr: string) => {
            const p = dStr.split('-');
            if (p.length === 3) return `${p[2]}/${p[1]}/${p[0].slice(2)}`;
            return dStr;
        };
        if (oldest === newest) return format(oldest);
        return `${format(oldest)} → ${format(newest)}`;
    };

    // Extraer lista única de años
    const availableYears = useMemo(() => {
        const yearsSet = new Set<string>();
        initialLogs.forEach(log => {
            const dateStr = log.oldest_date || log.created_at;
            if (dateStr) {
                const year = new Date(dateStr).getFullYear().toString();
                yearsSet.add(year);
            }
        });
        return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
    }, [initialLogs]);

    // Filtrado dinámico
    const filteredLogs = useMemo(() => {
        return initialLogs.filter(log => {
            const matchAccount = selectedAccount === 'ALL' || log.account_id === selectedAccount;
            
            const dateStr = log.oldest_date || log.created_at;
            const logYear = dateStr ? new Date(dateStr).getFullYear().toString() : '';
            const matchYear = selectedYear === 'ALL' || logYear === selectedYear;

            return matchAccount && matchYear;
        });
    }, [initialLogs, selectedAccount, selectedYear]);

    // Handler de Renombrado
    const handleStartRename = (log: ImportLogItem) => {
        setEditingId(log.id);
        setEditName(log.filename);
    };

    const handleSaveRename = async (id: string) => {
        if (!editName.trim()) return;
        setRenamingLoading(true);
        const res = await renameImportBatchAction(id, editName);
        if (res.success) {
            toast.success("Nombre actualizado");
            setEditingId(null);
            router.refresh();
        } else {
            toast.error(res.error || "Error al renombrar");
        }
        setRenamingLoading(false);
    };

    // Handler de Rollback
    const handleDeleteBatch = async (log: ImportLogItem) => {
        const confirmed = window.confirm(
            `⚠️ ¡ATENCIÓN!\n\n¿Estás seguro de deshacer la importación de "${log.filename}"?\n\nSe eliminarán PERMANENTEMENTE los ${log.row_count} movimientos creados en esa carga.`
        );

        if (!confirmed) return;

        setDeletingId(log.id);
        const toastId = toast.loading("Eliminando lote de importación...");

        try {
            const res = await deleteImportBatchAction(log.id);
            if (res.success) {
                toast.success(res.message, { id: toastId });
                router.refresh();
            } else {
                toast.error(res.error, { id: toastId });
            }
        } catch (err) {
            toast.error("Error al procesar la eliminación", { id: toastId });
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="space-y-6 pb-20 max-w-6xl mx-auto">
            {/* CABECERA */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3">
                    <Link href="/finance">
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl text-slate-400 hover:text-slate-700">
                            <ArrowLeft size={18} />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-xl font-black italic tracking-tighter text-slate-800 uppercase flex items-center gap-2">
                            <History className="h-5 w-5 text-indigo-500" /> Auditoría de Importaciones
                        </h1>
                        <p className="text-xs text-slate-400 font-medium">
                            Histórico de cargas CSV, consulta de lotes y rollback de seguridad.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                    <span>Lotes mostrados:</span>
                    <span className="font-mono font-black text-indigo-600">{filteredLogs.length}</span>
                </div>
            </div>

            {/* BARRA DE FILTROS */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-4">
                <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-400 tracking-wider shrink-0">
                    <Filter size={14} className="text-indigo-500" /> Filtros:
                </div>

                <div className="w-full md:w-64">
                    <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                        <SelectTrigger className="h-10 text-xs border-slate-200 rounded-xl">
                            <SelectValue placeholder="Todas las cuentas" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL" className="text-xs font-bold">Todas las cuentas</SelectItem>
                            {accounts.map(acc => (
                                <SelectItem key={acc.id} value={acc.id} className="text-xs">
                                    {acc.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="w-full md:w-44">
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="h-10 text-xs border-slate-200 rounded-xl">
                            <SelectValue placeholder="Todos los años" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL" className="text-xs font-bold">Todos los años</SelectItem>
                            {availableYears.map(yr => (
                                <SelectItem key={yr} value={yr} className="text-xs">Año {yr}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {(selectedAccount !== 'ALL' || selectedYear !== 'ALL') && (
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => { setSelectedAccount('ALL'); setSelectedYear('ALL'); }}
                        className="text-[11px] font-bold text-slate-400 hover:text-slate-700 h-8"
                    >
                        Limpiar filtros
                    </Button>
                )}
            </div>

            {/* TABLA DE AUDITORÍA */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                {filteredLogs.length === 0 ? (
                    <div className="text-center py-20 text-slate-400 italic">
                        <History className="h-12 w-12 mx-auto mb-3 opacity-20 text-slate-500" />
                        <p className="text-sm font-bold">No se encontraron lotes con los filtros seleccionados.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filteredLogs.map(log => {
                            const isDeleting = deletingId === log.id;
                            const isEditing = editingId === log.id;

                            return (
                                <div 
                                    key={log.id} 
                                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
                                >
                                    {/* IDENTIFICACIÓN: AVATAR DE LA CUENTA + NOMBRE Y PERIODO */}
                                    <div className="flex items-center gap-4 min-w-0 flex-1">
                                        {/* Avatar de la Cuenta */}
                                        <AccountAvatar 
                                            account={{
                                                name: log.account_name || 'Cuenta',
                                                color_theme: log.account_color,
                                                avatar_letter: log.account_letter
                                            }} 
                                            className="h-10 w-10 text-xs shrink-0 shadow-sm"
                                        />

                                        <div className="min-w-0 space-y-1 flex-1">
                                            {/* EDICIÓN INLINE DEL NOMBRE */}
                                            {isEditing ? (
                                                <div className="flex items-center gap-2 max-w-sm">
                                                    <Input 
                                                        value={editName}
                                                        onChange={(e) => setEditName(e.target.value)}
                                                        className="h-8 text-xs font-bold"
                                                        autoFocus
                                                    />
                                                    <Button 
                                                        size="icon" 
                                                        variant="ghost" 
                                                        onClick={() => handleSaveRename(log.id)}
                                                        disabled={renamingLoading}
                                                        className="h-8 w-8 text-emerald-600 bg-emerald-50 shrink-0"
                                                    >
                                                        {renamingLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                                    </Button>
                                                    <Button 
                                                        size="icon" 
                                                        variant="ghost" 
                                                        onClick={() => setEditingId(null)}
                                                        className="h-8 w-8 text-slate-400 bg-slate-100 shrink-0"
                                                    >
                                                        <X size={14} />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-black text-slate-800 truncate tracking-tight">
                                                        {log.filename}
                                                    </p>
                                                    <button 
                                                        onClick={() => handleStartRename(log)}
                                                        className="text-slate-300 hover:text-indigo-600 transition-colors p-1"
                                                        title="Renombrar lote"
                                                    >
                                                        <Pencil size={12} />
                                                    </button>
                                                </div>
                                            )}

                                            {/* CUENTA Y PERIODO DENTRO DEL LOTE */}
                                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                                                <span className="font-bold uppercase tracking-wider text-[10px] text-slate-600">
                                                    {log.account_name}
                                                </span>
                                                •
                                                {/* Insignia del Periodo Importado */}
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-100 rounded-full text-slate-600 text-[10px] font-mono font-bold">
                                                    <Calendar size={10} className="text-indigo-500" />
                                                    <span>{formatDateRange(log.oldest_date, log.newest_date)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* MÉTRICAS Y ACCIONES */}
                                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                                        <Badge 
                                            variant="secondary" 
                                            className="bg-slate-100 text-slate-700 font-mono font-bold text-[11px] px-3 py-1 rounded-xl"
                                        >
                                            {log.row_count} movimientos
                                        </Badge>

                                        <div className="flex items-center gap-1.5">
                                            <Link href={`/finance/imports/${log.id}`}>
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="h-9 text-xs font-bold gap-1.5 rounded-xl border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                                                >
                                                    <Eye size={14} /> Ver Lote
                                                </Button>
                                            </Link>

                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={() => handleDeleteBatch(log)}
                                                disabled={isDeleting}
                                                className="h-9 w-9 p-0 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                                title="Deshacer importación (Rollback)"
                                            >
                                                {isDeleting ? <Loader2 size={16} className="animate-spin text-rose-600" /> : <Trash2 size={16} />}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}