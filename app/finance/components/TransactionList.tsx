'use client'

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FinanceTransaction, FinanceCategory, FinanceAccount } from '@/types/finance';
import { TransactionRow } from './TransactionRow';
import { TransactionNoteDialog } from './TransactionNoteDialog';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { 
    Search, FilterX, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, 
    Landmark, BookText, Eye, EyeOff, CalendarDays 
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { updateTransactionCategoryAction, unlinkTransactionFromTravelAction } from '../actions';
import { toast } from 'sonner';
import { TransferAssistant } from './TransferAssistant';
import { MagicRuleDialog } from './MagicRuleDialog';
import { TransactionInventoryDialog } from './TransactionInventoryDialog';
import { TransactionTripDialog } from './TransactionTripDialog';
import { UnlinkTripConfirmDialog } from './UnlinkTripConfirmDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const ITEMS_PER_PAGE = 25;

interface TransactionListProps {
    transactions: FinanceTransaction[];
    categories: FinanceCategory[];
    accounts: FinanceAccount[]; 
    accountFilter: string;
    onCategoryChange?: (id: string, catId: string, concept: string) => void;
    isPrivate: boolean;
}

export function TransactionList({ 
    transactions, categories, accounts, accountFilter, onCategoryChange, isPrivate 
}: TransactionListProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // --- ESTADOS DE FILTRADO ---
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [monthFilter, setMonthFilter] = useState('all'); // Filtrado en cliente
    const [showHiddenAccounts, setShowHiddenAccounts] = useState(false);
    const [showOriginalConcepts, setShowOriginalConcepts] = useState(false);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    // Año desde la URL (porque requiere nueva carga de datos)
    const currentYear = parseInt(searchParams.get('year') || '2026');

    // --- ESTADOS PARA DIÁLOGOS ---
    const [selectedTx, setSelectedTx] = useState<FinanceTransaction | null>(null);
    const [selectedTxForTransfer, setSelectedTxForTransfer] = useState<FinanceTransaction | null>(null);
    const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
    const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
    const [showTransferAssistant, setShowTransferAssistant] = useState(false);
    const [showInventoryDialog, setShowInventoryDialog] = useState(false);
    const [showTripDialog, setShowTripDialog] = useState(false);
    const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
    const [pendingUnlink, setPendingUnlink] = useState<{ transaction: FinanceTransaction, newCategoryId: string } | null>(null);
    const [magicRuleData, setMagicRuleData] = useState<{ concept: string; categoryId: string; categoryName: string; } | null>(null);

    // Navegación de años (Router push)
    const changeYear = (delta: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('year', (currentYear + delta).toString());
        router.push(`?${params.toString()}`);
    };

    const toggleRow = (id: string) => {
        const newRows = new Set(expandedRows);
        newRows.has(id) ? newRows.delete(id) : newRows.add(id);
        setExpandedRows(newRows);
    };

    // --- MANEJO DE CATEGORÍAS ---
    const handleCategorySelection = async (transaction: FinanceTransaction, newCategoryId: string) => {
        const TRANSFER_CAT_ID = "10310a6a-5d3b-4e95-a19f-bfef8cd2dd1a";
        const WORK_TRIP_CAT_ID = "ad17366f-06de-4f06-b88e-67aace8f4b21";
        const PERSONAL_TRIP_CAT_ID = "db5e8971-26b9-4d42-adf4-77fa30cd0dba";

        if (newCategoryId === TRANSFER_CAT_ID) {
            setSelectedTxForTransfer({ ...transaction, category_id: newCategoryId });
            setShowTransferAssistant(true);
        } else if (newCategoryId === WORK_TRIP_CAT_ID || newCategoryId === PERSONAL_TRIP_CAT_ID) {
            setSelectedTx(transaction);
            setActiveCategoryId(newCategoryId);
            setShowTripDialog(true);
            await updateTransactionCategoryAction(transaction.id, newCategoryId);
        } else {
            const catName = categories.find(c => c.id === newCategoryId)?.name || "Categoría";
            const res = await updateTransactionCategoryAction(transaction.id, newCategoryId);
            if (res.success) {
                toast.success("Categoría actualizada", {
                    action: { 
                        label: "Crear Regla", 
                        onClick: () => setMagicRuleData({ concept: transaction.concept, categoryId: newCategoryId, categoryName: catName }) 
                    }
                });
            }
        }
    };

    // --- MOTOR DE FILTRADO (CLIENT-SIDE) ---
    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const account = accounts.find(a => a.id === t.account_id);
            if (!showHiddenAccounts && account?.is_active === false) return false;

            // Filtro de Mes (Cliente)
            if (monthFilter !== 'all') {
                const tDate = new Date(t.date);
                const tMonth = (tDate.getMonth() + 1).toString().padStart(2, '0');
                if (tMonth !== monthFilter) return false;
            }

            const matchesSearch = t.concept.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 (t.notes?.toLowerCase().includes(searchTerm.toLowerCase()));
            
            const matchesAccount = accountFilter === 'all' || t.account_id === accountFilter;

            let matchesCategory = false;
            if (categoryFilter === 'all') matchesCategory = true;
            else if (categoryFilter === 'none') {
                matchesCategory = (!t.category_id || t.category_id === 'pending' || t.category_id === '') && !t.is_split;
            } else {
                const cat = categories.find(c => c.id === t.category_id);
                const matchesPrimary = t.category_id === categoryFilter || cat?.parent_id === categoryFilter;
                const matchesSplits = t.is_split && t.splits?.some(s => {
                    const sCat = categories.find(c => c.id === s.category_id);
                    return s.category_id === categoryFilter || sCat?.parent_id === categoryFilter;
                });
                matchesCategory = !!(matchesPrimary || matchesSplits);
            }

            return matchesSearch && matchesAccount && matchesCategory;
        });
    }, [transactions, searchTerm, categoryFilter, accountFilter, showHiddenAccounts, monthFilter, accounts, categories]);

    const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
    const paginatedTransactions = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredTransactions.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredTransactions, currentPage]);

    useEffect(() => { setCurrentPage(1); }, [searchTerm, categoryFilter, monthFilter, accountFilter]);

    const meses = [
        { id: 'all', name: 'Todo el año' },
        { id: '01', name: 'Enero' }, { id: '02', name: 'Febrero' }, { id: '03', name: 'Marzo' },
        { id: '04', name: 'Abril' }, { id: '05', name: 'Mayo' }, { id: '06', name: 'Junio' },
        { id: '07', name: 'Julio' }, { id: '08', name: 'Agosto' }, { id: '09', name: 'Septiembre' },
        { id: '10', name: 'Octubre' }, { id: '11', name: 'Noviembre' }, { id: '12', name: 'Diciembre' }
    ];

    return (
        <div className="flex flex-col bg-white">
            {/* FILA 1: NAVEGADOR DE AÑOS Y FLAGS */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-4">
                    {/* Navegador de años automático */}
                    <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-none border-r hover:bg-slate-50" onClick={() => changeYear(-1)}>
                            <ChevronLeft size={16} />
                        </Button>
                        <div className="px-6 flex flex-col items-center justify-center min-w-[80px]">
                            <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest leading-none">Año</span>
                            <span className="text-sm font-black italic tracking-tighter text-slate-800 leading-none mt-1">{currentYear}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-none border-l hover:bg-slate-50" onClick={() => changeYear(1)}>
                            <ChevronRight size={16} />
                        </Button>
                    </div>
                    
                    {/* Flags de visualización */}
                    <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" onClick={() => setShowOriginalConcepts(!showOriginalConcepts)}
                                        className={cn("h-8 px-3 text-[9px] font-black uppercase gap-2 rounded-lg transition-all", 
                                        showOriginalConcepts ? "bg-amber-100 text-amber-700 shadow-sm" : "text-slate-400")}>
                                        {showOriginalConcepts ? <Landmark size={14} /> : <BookText size={14} className="opacity-50" />}
                                        {showOriginalConcepts ? "Concepto Banco" : "Notas Personales"}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-slate-900 text-white text-[10px] font-bold">Alternar vista de conceptos</TooltipContent>
                            </Tooltip>

                            <div className="w-[1px] h-4 bg-slate-200" />

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" onClick={() => setShowHiddenAccounts(!showHiddenAccounts)}
                                        className={cn("h-8 px-3 text-[9px] font-black uppercase gap-2 rounded-lg transition-all", 
                                        showHiddenAccounts ? "bg-emerald-100 text-emerald-700 shadow-sm" : "text-slate-400")}>
                                        {showHiddenAccounts ? <Eye size={14} /> : <EyeOff size={14} className="opacity-50" />}
                                        {showHiddenAccounts ? "Viendo Ocultas" : "Cuentas Ocultas"}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-slate-900 text-white text-[10px] font-bold">Mostrar/Ocultar cuentas inactivas</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>

                <div className="hidden md:block text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] italic">
                    {filteredTransactions.length} Movimientos cargados
                </div>
            </div>

            {/* FILA 2: FILTROS (INSTANTÁNEOS) */}
            <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-end border-b border-slate-50">
                {/* Selector de Mes (FILTRADO CLIENTE) */}
                <div className="md:col-span-2 space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-1 flex items-center gap-1 italic">
                        <CalendarDays size={10} /> Periodo Mensual
                    </label>
                    <Select value={monthFilter} onValueChange={setMonthFilter}>
                        <SelectTrigger className="h-10 rounded-xl bg-slate-50 border-none font-bold text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[120]">
                            {meses.map(m => (
                                <SelectItem key={m.id} value={m.id} className="text-xs font-bold uppercase italic">{m.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="md:col-span-3 space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-1 italic">Categoría</label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="h-10 rounded-xl bg-slate-50 border-none font-bold text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[120]">
                            <SelectItem value="all" className="text-xs font-bold uppercase">Todas</SelectItem>
                            <SelectItem value="none" className="text-xs font-bold uppercase text-rose-500 italic">⚠️ Sin categorizar</SelectItem>
                            {categories.filter(c => !c.parent_id).map(parent => (
                                <React.Fragment key={parent.id}>
                                    <SelectItem value={parent.id} className="text-xs font-bold uppercase">{parent.name}</SelectItem>
                                    {categories.filter(sub => sub.parent_id === parent.id).map(sub => (
                                        <SelectItem key={sub.id} value={sub.id} className="text-xs pl-6 opacity-70">— {sub.name}</SelectItem>
                                    ))}
                                </React.Fragment>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="md:col-span-5 space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-1 italic">Buscar en concepto o notas</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                        <Input 
                            placeholder="Ej: Amazon, Nómina, Restaurante..." 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            className="h-10 pl-10 bg-slate-50 border-none rounded-xl text-xs font-medium" 
                        />
                    </div>
                </div>

                <div className="md:col-span-2">
                    <Button 
                        variant="ghost" 
                        onClick={() => { setSearchTerm(''); setCategoryFilter('all'); setMonthFilter('all'); }} 
                        className="w-full h-10 text-slate-400 hover:text-rose-500 font-bold text-[10px] uppercase tracking-widest"
                    >
                        <FilterX className="h-4 w-4 mr-2"/> Limpiar Filtros
                    </Button>
                </div>
            </div>

            {/* TABLA DE RESULTADOS */}
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow className="border-b border-slate-100 hover:bg-transparent text-[10px] font-black uppercase text-slate-400 tracking-tighter italic">
                            <TableHead className="py-4 px-6">Fecha</TableHead>
                            <TableHead>Concepto / Notas</TableHead>
                            <TableHead className="text-right">Importe</TableHead>
                            <TableHead className="px-6">Categoría</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedTransactions.length > 0 ? (
                            paginatedTransactions.map((t) => (
                                <TransactionRow 
                                    key={t.id}
                                    transaction={t}
                                    categories={categories}
                                    accounts={accounts}
                                    showOriginalConcepts={showOriginalConcepts}
                                    isExpanded={expandedRows.has(t.id)}
                                    onToggleExpand={toggleRow}
                                    onCategorySelect={handleCategorySelection}
                                    onUnlinkClick={(tx) => { setPendingUnlink({ transaction: tx, newCategoryId: 'pending' }); setShowUnlinkConfirm(true); }}
                                    onEditNote={(tx) => { setSelectedTx(tx); setIsNoteDialogOpen(true); }}
                                    onInventoryClick={(tx) => { setSelectedTx(tx); setShowInventoryDialog(true); }}
                                    isPrivate={isPrivate}
                                />
                            ))
                        ) : (
                            <TableRow>
                                <td colSpan={5} className="py-32 text-center">
                                    <div className="flex flex-col items-center gap-3 text-slate-300">
                                        <div className="p-4 bg-slate-50 rounded-full">
                                            <FilterX size={32} className="opacity-20" />
                                        </div>
                                        <p className="text-[11px] font-black uppercase tracking-widest italic">No hay movimientos registrados</p>
                                    </div>
                                </td>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* PAGINACIÓN */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter italic">Página {currentPage} de {totalPages || 1}</span>
                </div>
                <div className="flex gap-1">
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-lg" disabled={currentPage === 1} onClick={() => setCurrentPage(1)}><ChevronsLeft size={14} /></Button>
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-lg" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}><ChevronLeft size={14} /></Button>
                    <div className="px-4 flex items-center text-[11px] font-black text-slate-600 italic">...</div>
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-lg" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}><ChevronRight size={14} /></Button>
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-lg" disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)}><ChevronsRight size={14} /></Button>
                </div>
            </div>

            {/* DIÁLOGOS DE GESTIÓN */}
            {selectedTx && (
                <TransactionNoteDialog 
                    transaction={selectedTx} 
                    open={isNoteDialogOpen} 
                    onOpenChange={setIsNoteDialogOpen} 
                />
            )}
            {showTransferAssistant && selectedTxForTransfer && (
                <TransferAssistant 
                    transaction={selectedTxForTransfer}
                    accounts={accounts}
                    onClose={() => { setShowTransferAssistant(false); setSelectedTxForTransfer(null); }}
                />
            )}
            {magicRuleData && (
                <MagicRuleDialog
                    concept={magicRuleData.concept}
                    categoryId={magicRuleData.categoryId}
                    categoryName={magicRuleData.categoryName}
                    onClose={() => setMagicRuleData(null)}
                />
            )}
            {showInventoryDialog && selectedTx && (
                <TransactionInventoryDialog 
                    transaction={selectedTx}
                    onClose={() => { setShowInventoryDialog(false); setSelectedTx(null); }}
                />
            )}
            {showTripDialog && selectedTx && (
                <TransactionTripDialog 
                    transaction={{ ...selectedTx, category_id: activeCategoryId }}
                    onClose={async (success) => {
                        setShowTripDialog(false);
                        if (!success) await updateTransactionCategoryAction(selectedTx.id, 'pending');
                        setSelectedTx(null);
                        setActiveCategoryId(null);
                    }}
                />
            )}
            {showUnlinkConfirm && pendingUnlink && (
                <UnlinkTripConfirmDialog
                    open={showUnlinkConfirm}
                    onClose={() => { setShowUnlinkConfirm(false); setPendingUnlink(null); }}
                    onConfirm={async (deleteExpense) => {
                        const { transaction } = pendingUnlink;
                        const res = await unlinkTransactionFromTravelAction(transaction.id, transaction.travel_expense_id!, deleteExpense);
                        if (res.success) toast.success("Desvinculado correctamente");
                        setShowUnlinkConfirm(false);
                        setPendingUnlink(null);
                    }}
                />
            )}
        </div>
    );
}