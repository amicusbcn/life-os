'use client'

import React, { useState, useMemo } from 'react';
import { FinanceTransaction, FinanceCategory, FinanceAccount } from '@/types/finance';
import { TransactionNoteDialog } from './TransactionNoteDialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { 
    Search, FilterX, ChevronDown, ChevronRight, ChevronLeft, Building2, User, MoreVertical, Pencil, Plane, Package,
    Check, ChevronsUpDown, Tag, EyeOff, Split, ChevronsRight, ChevronsLeft, Link2, Boxes, ArrowRight,
    Import,Eye, BookText, Landmark,
    Link2Off
} from 'lucide-react';
import Link from 'next/link';
import LoadIcon from '@/utils/LoadIcon';
import { cn } from "@/lib/utils";
import { TransactionSplitDialog } from "./TransactionSplitDialog";
import { handleTransferAction, updateTransactionCategoryAction } from '../actions';
import { toast } from 'sonner';
import { TransferAssistant } from './TransferAssistant';
import { MagicRuleDialog } from './MagicRuleDialog';
import { TransactionInventoryDialog } from './TransactionInventoryDialog';
import { AccountAvatar } from './AccountAvatar'; // 🚀 IMPORTACIÓN CLAVE
import { TransactionTripDialog } from './TransactionTripDialog';
import { UnlinkTripConfirmDialog } from './UnlinkTripConfirmDialog'; // Asegúrate de haber creado el archivo
import { unlinkTransactionFromTravelAction } from '../actions'; // La nueva acción en tu archivo de acciones

const ITEMS_PER_PAGE = 25;

interface TransactionListProps {
    transactions: FinanceTransaction[];
    categories: FinanceCategory[];
    accounts: FinanceAccount[]; 
    accountFilter: string;
    onCategoryChange: (id: string, catId: string, concept: string) => void;
    isPrivate: boolean;
}

export function TransactionList({ 
    transactions, 
    categories, 
    accounts, 
    accountFilter, 
    onCategoryChange, 
    isPrivate 
}: TransactionListProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
    const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
    const [pendingUnlink, setPendingUnlink] = useState<{ 
        transaction: FinanceTransaction, 
        newCategoryId: string 
    } | null>(null);
    const [transferTargetTx, setTransferTargetTx] = useState<string | null>(null);
    const [showOriginalConcepts, setShowOriginalConcepts] = useState(false);
    const [selectedTx, setSelectedTx] = useState<FinanceTransaction | null>(null);
    const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
    const [showTransferAssistant, setShowTransferAssistant] = useState(false);
    const [selectedTxForTransfer, setSelectedTxForTransfer] = useState<FinanceTransaction | null>(null);
    const [magicRuleData, setMagicRuleData] = useState<{
        concept: string;
        categoryId: string;
        categoryName: string;
    } | null>(null);
    const [showInventoryDialog, setShowInventoryDialog] = useState(false);
    const [showTripDialog, setShowTripDialog] = useState(false);
    const [showHiddenAccounts, setShowHiddenAccounts] = useState(false);
    const toggleRow = (id: string) => {
        const newRows = new Set(expandedRows);
        if (newRows.has(id)) newRows.delete(id);
        else newRows.add(id);
        setExpandedRows(newRows);
    };

    const handleCategorySelection = async (transaction: FinanceTransaction, newCategoryId: string) => {
        const TRANSFER_CAT_ID = "10310a6a-5d3b-4e95-a19f-bfef8cd2dd1a";
        const WORK_TRIP_CAT_ID = "ad17366f-06de-4f06-b88e-67aace8f4b21"; // 💼
        const PERSONAL_TRIP_CAT_ID = "db5e8971-26b9-4d42-adf4-77fa30cd0dba"; // ✈️
        if (newCategoryId === TRANSFER_CAT_ID) {
            setSelectedTxForTransfer({ ...transaction, category_id: newCategoryId });
            setShowTransferAssistant(true);
        } else if (newCategoryId === WORK_TRIP_CAT_ID || newCategoryId === PERSONAL_TRIP_CAT_ID) {
            setSelectedTx(transaction);
            setActiveCategoryId(newCategoryId); // ✨ Guardamos la categoría que acabamos de elegir
            setShowTripDialog(true); 
            
            await updateTransactionCategoryAction(transaction.id, newCategoryId);
        }else {
            const catName = categories.find(c => c.id === newCategoryId)?.name || "Categoría";
            const res = await updateTransactionCategoryAction(transaction.id, newCategoryId);
            if (res.success) {
                toast.success("Categoría actualizada", {
                    description: "¿Quieres automatizar este movimiento?",
                    duration: 5000,
                    action: {
                        label: "Crear Regla",
                        onClick: () => {
                            setMagicRuleData({
                                concept: transaction.concept,
                                categoryId: newCategoryId,
                                categoryName: catName
                            });
                        }
                    }
                });
            } else {
                toast.error("Error al actualizar");
            }
        }
    };
    
    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            // 1. Lógica de Cuentas Ocultas
            // Buscamos la cuenta a la que pertenece la transacción
            const account = accounts.find(a => a.id === t.account_id);
            const isAccountHidden = account?.is_active === false;

            // Si el switch está OFF y la cuenta es oculta, la descartamos de inmediato
            if (!showHiddenAccounts && isAccountHidden) {
                return false;
            }

            // 2. Filtros de búsqueda y cuenta seleccionada
            const matchesSearch = t.concept.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesAccount = accountFilter === 'all' || t.account_id === accountFilter;
            
            // 3. Filtros de fecha
            const tDate = new Date(t.date).setHours(0,0,0,0);
            const start = startDate ? new Date(startDate).setHours(0,0,0,0) : null;
            const end = endDate ? new Date(endDate).setHours(0,0,0,0) : null;
            const matchesStart = !start || tDate >= start;
            const matchesEnd = !end || tDate <= end;
            
            // 4. Filtro de Categoría (incluyendo la corrección de splits y nulos)
            let matchesCategory = false;
            if (categoryFilter === 'all') {
                matchesCategory = true;
            } else if (categoryFilter === 'none') {
                // "Sin categoría" si no tiene ID, es 'pending' o string vacío, 
                // siempre que no sea un desglose (split)
                matchesCategory = (!t.category_id || t.category_id === 'pending' || t.category_id === '') && !t.is_split;
            } else {
                const transactionCat = categories.find(c => c.id === t.category_id);
                const isMatchPrimary = t.category_id === categoryFilter || transactionCat?.parent_id === categoryFilter;
                const isMatchInSplits = t.is_split && t.splits?.some(s => {
                    const splitCat = categories.find(c => c.id === s.category_id);
                    return s.category_id === categoryFilter || splitCat?.parent_id === categoryFilter;
                });
                matchesCategory = !!(isMatchPrimary || isMatchInSplits);
            }

            // Devolvemos true solo si cumple todas las condiciones
            return matchesSearch && matchesAccount && matchesStart && matchesEnd && matchesCategory;
        });
        // Añadimos las nuevas dependencias para que React recalcule el filtro
    }, [transactions, searchTerm, categoryFilter, accountFilter, categories, startDate, endDate, showHiddenAccounts, accounts]);

    const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);

    const paginatedTransactions = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredTransactions.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredTransactions, currentPage]);

    const resetFilters = () => {
        setSearchTerm(''); 
        setCategoryFilter('all'); 
        setStartDate(''); 
        setEndDate(''); 
        setCurrentPage(1);
        // Opcional: ¿Quieres que el botón de ocultas se resetee también? 
        // Si es así: setShowHiddenAccounts(false);
    };

    return (
        <div className="space-y-4">
            {/* PANEL DE FILTROS */}
            <div className="flex flex-col gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                
                {/* FILA 1: FILTROS PRINCIPALES (Fecha, Categoría, Buscador) */}
                <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase ml-1">Desde</span>
                        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 text-xs" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase ml-1">Hasta</span>
                        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9 text-xs" />
                    </div>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="bg-white"><SelectValue placeholder="Categoría" /></SelectTrigger>
                        <SelectContent className="z-[110]">
                            <SelectItem value="all">Todas</SelectItem>
                            <SelectItem value="none">⚠️ Sin categoría</SelectItem>
                            <hr className="my-1 border-slate-100" />
                            {categories.filter(c => !c.parent_id).map(parent => (
                                <React.Fragment key={parent.id}>
                                    <SelectItem value={parent.id} className="font-bold text-indigo-600">{parent.name.toUpperCase()}</SelectItem>
                                    {categories.filter(sub => sub.parent_id === parent.id).map(sub => (
                                        <SelectItem key={sub.id} value={sub.id} className="pl-6">{sub.name}</SelectItem>
                                    ))}
                                </React.Fragment>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="md:col-span-2 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-white" />
                    </div>
                    
                    {/* BOTÓN LIMPIAR (Ocupa la última columna si hay filtros) */}
                    <div className="flex justify-end">
                        {(searchTerm || categoryFilter !== 'all' || startDate || endDate) && (
                            <Button variant="ghost" onClick={resetFilters} className="text-slate-500 hover:bg-slate-100 h-9 w-full md:w-auto">
                                <FilterX className="mr-2 h-4 w-4"/> Limpiar
                            </Button>
                        )}
                    </div>
                </div>

                {/* FILA 2: AJUSTES DE VISTA (Interruptores) */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200/60">
                    
                    <div className="flex items-center gap-2 bg-slate-200/40 p-1 rounded-xl border border-slate-200">
                        {/* TOGGLE: CONCEPTOS */}
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setShowOriginalConcepts(!showOriginalConcepts)}
                            className={cn(
                                "h-8 px-3 text-[10px] font-black uppercase tracking-wider transition-all gap-2 rounded-lg",
                                showOriginalConcepts 
                                    ? "bg-amber-100 text-amber-700 shadow-sm" 
                                    : "bg-transparent text-slate-400"
                            )}
                        >
                            {showOriginalConcepts ? <Landmark className="h-3.5 w-3.5" /> : <BookText className="h-3.5 w-3.5 opacity-50" />}
                            {showOriginalConcepts ? "Concepto Banco" : "Notas Personales"}
                        </Button>

                        <div className="w-[1px] h-4 bg-slate-300 mx-0.5" />

                        {/* TOGGLE: CUENTAS OCULTAS */}
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setShowHiddenAccounts(!showHiddenAccounts)}
                            className={cn(
                                "h-8 px-3 text-[10px] font-black uppercase tracking-wider transition-all gap-2 rounded-lg",
                                showHiddenAccounts 
                                    ? "bg-emerald-100 text-emerald-700 shadow-sm" 
                                    : "bg-transparent text-slate-400"
                            )}
                        >
                            {showHiddenAccounts ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5 opacity-50" />}
                            {showHiddenAccounts ? "Viendo Ocultas" : "Cuentas Ocultas"}
                        </Button>
                    </div>

                    {/* Info de resultados rápida */}
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">
                        Mostrando {filteredTransactions.length} movimientos
                    </span>
                </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50/80">
                        <TableRow>
                            <TableHead className="w-[100px]">Fecha</TableHead>
                            <TableHead>Concepto</TableHead>
                            <TableHead className="text-right w-[140px]">Importe</TableHead>
                            <TableHead className="w-[180px]">Categoría</TableHead>
                            <TableHead className="w-[60px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                    {paginatedTransactions.map((t) => {
                        const cat = categories.find((c) => c.id === t.category_id);
                        const parentCat = cat?.parent_id ? categories.find((pc) => pc.id === cat.parent_id) : null;
                        const displayColor = parentCat?.color || cat?.color || "#94a3b8";
                        
                        // 🚀 BUSCAMOS LA CUENTA PARA EL AVATAR
                        const account = accounts.find(a => a.id === t.account_id);

                        return (
                        <React.Fragment key={t.id}>
                            <TableRow className="group hover:bg-slate-50/50">
                            <TableCell className="text-xs text-slate-500 font-medium">
                                {new Date(t.date).toLocaleDateString("es-ES", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "2-digit",
                                })}
                            </TableCell>
                            <TableCell className="font-medium" onClick={() => t.is_split && toggleRow(t.id)}>
                                <div className="flex items-center gap-3 truncate max-w-[400px]">
                                    
                                    {/* 🚀 AVATAR DE LA CUENTA */}
                                    {account && (
                                        <AccountAvatar 
                                            account={account} 
                                            className="h-6 w-6 text-[9px] shadow-none border-slate-200" 
                                        />
                                    )}

                                    <div className="flex flex-col min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className={cn(
                                                "text-sm block truncate",
                                                !showOriginalConcepts && t.notes ? "font-bold text-slate-900" : "font-medium text-slate-600"
                                            )}>
                                                {showOriginalConcepts ? t.concept : (t.notes || t.concept)}
                                            </span>
                                            {t.transfer_id && (
                                                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 shadow-sm">
                                                    <Link2 className="h-2.5 w-2.5" />
                                                    <span className="text-[8px] font-black uppercase">VINCULADA</span>
                                                </div>
                                            )}
                                            {t.inventory_item_id && (
                                                <Link 
                                                    href={`/inventory/${t.inventory_item_id}`} 
                                                    target="_blank" 
                                                    className="group/link"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm transition-all hover:bg-emerald-200">
                                                        <Boxes className="h-2.5 w-2.5" />
                                                        <span className="text-[8px] font-black uppercase tracking-tighter">INVENTARIO</span>
                                                        <ArrowRight className="h-2 w-2 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                                                    </div>
                                                </Link>
                                            )}
                                            {/* ✈️ Pill de Viaje / Gasto de Viaje */}
                                            {t.travel_expense_id && (
                                                <Link 
                                                    href={`/travel/${t.trip_id || ''}`} // Ajusta la ruta a tu módulo de viajes
                                                    target="_blank" 
                                                    className="group/trip"
                                                    onClick={(e) => e.stopPropagation()} 
                                                >
                                                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm transition-all hover:bg-indigo-500/20 hover:border-indigo-500/40 animate-in fade-in zoom-in">
                                                        <Plane className="h-2.5 w-2.5" />
                                                        <span className="text-[8px] font-black uppercase tracking-tighter">CONCILIADO</span>
                                                        <ArrowRight className="h-2 w-2 opacity-0 group-hover/trip:opacity-100 transition-opacity" />
                                                    </div>
                                                </Link>
                                            )}
                                            {t.is_split && (
                                                <Badge variant="secondary" className="text-[9px] bg-indigo-50 text-indigo-600 border-indigo-100">
                                                    SPLIT
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className={cn("text-right font-mono font-bold", t.amount >= 0 ? "text-green-600" : "text-slate-900")}>
                                {t.amount.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €
                            </TableCell>

                            <TableCell>
                                {!t.is_split ? (
                                <Popover onOpenChange={(open) => { if (!open) setTransferTargetTx(null); }}>
                                    <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 w-full justify-between text-xs font-bold border-transparent transition-all"
                                        style={{
                                        backgroundColor: displayColor + "15",
                                        color: displayColor,
                                        borderLeft: `3px solid ${displayColor}`,
                                        }}
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                        <LoadIcon name={cat?.icon_name || "Tag"} size={14} />
                                        <span className="truncate">{cat?.name || "Pendiente"}</span>
                                        </div>
                                        <ChevronsUpDown className="h-3 w-3 opacity-50 shrink-0" />
                                    </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[280px] p-0 border-slate-700 bg-slate-900 shadow-2xl z-[100]">
                                        {t.travel_expense_id ? (
                                            /* 🛡️ VISTA BLOQUEADA POR VÍNCULO */
                                            <div className="p-3 space-y-3">
                                                <div className="flex items-center gap-2 px-2 py-1 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                                                    <Plane className="h-4 w-4 text-indigo-400" />
                                                    <span className="text-[10px] font-black text-indigo-300 uppercase tracking-tighter">
                                                        Vinculado a Viaje
                                                    </span>
                                                </div>
                                                
                                                <p className="px-2 text-[11px] text-slate-400 leading-tight italic">
                                                    Para cambiar la categoría de este movimiento, primero debes desvincularlo del viaje.
                                                </p>

                                                <div className="flex flex-col gap-1">
                                                    <Button 
                                                        variant="ghost" 
                                                        onClick={() => {
                                                            setPendingUnlink({ transaction: t, newCategoryId: 'pending' });
                                                            setShowUnlinkConfirm(true); // Abrimos el diálogo de las 3 opciones
                                                        }}
                                                        className="w-full justify-start text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 h-10"
                                                    >
                                                        <Link2Off className="mr-2 h-4 w-4" /> Desvincular de Viaje
                                                    </Button>
                                                    
                                                    <Button 
                                                        variant="ghost" 
                                                        className="w-full justify-start text-xs text-slate-400 h-10"
                                                        onClick={() => { /* Solo cerrar el popover */ }}
                                                    >
                                                        <Check className="mr-2 h-4 w-4 text-indigo-400" /> Mantener Categoría
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <Command className="bg-slate-900 border-none">
                                            <CommandInput 
                                                placeholder="Buscar categoría..." 
                                                className="text-slate-100 border-none focus:ring-0 placeholder:text-slate-500"
                                            />
                                            <CommandList className="max-h-[350px]">
                                                <CommandEmpty className="py-4 text-center text-xs text-slate-500 font-medium">
                                                    No se han encontrado categorías
                                                </CommandEmpty>
                                                {categories.filter((c) => !c.parent_id).map((parent) => {
                                                const subCats = categories.filter((sub) => sub.parent_id === parent.id);
                                                return (
                                                    <CommandGroup 
                                                    key={parent.id} 
                                                    heading={<span className="px-2 text-[10px] font-black uppercase tracking-widest text-indigo-400/80">{parent.name}</span>}
                                                    className="px-1"
                                                    >
                                                    {subCats.length === 0 && (
                                                        <CommandItem
                                                        onSelect={() => {handleCategorySelection(t, parent.id);}}
                                                        className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-slate-200 aria-selected:bg-slate-800 aria-selected:text-white cursor-pointer"
                                                        >
                                                        <Check className={cn("h-3.5 w-3.5 shrink-0", t.category_id === parent.id ? "text-indigo-400 opacity-100" : "opacity-0")} />
                                                        <span className="truncate">{parent.name}</span>
                                                        </CommandItem>
                                                    )}
                                                    {subCats.map((sub) => (
                                                        <CommandItem
                                                        key={sub.id}
                                                        onSelect={() => {handleCategorySelection(t, sub.id);}}
                                                        className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-slate-300 aria-selected:bg-slate-800 aria-selected:text-white cursor-pointer"
                                                        >
                                                        <Check className={cn("h-3.5 w-3.5 shrink-0", t.category_id === sub.id ? "text-indigo-400 opacity-100" : "opacity-0")} />
                                                        <span className="truncate">{sub.name}</span>
                                                        </CommandItem>
                                                    ))}
                                                    </CommandGroup>
                                                );
                                                })}
                                            </CommandList>
                                            </Command>
                                        )}
                                       </PopoverContent>
                                </Popover>
                                ) : (
                                <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-100 text-slate-400 text-[10px] font-black uppercase italic tracking-tighter w-full justify-center">
                                    <Split className="h-3 w-3" /> Ver desglose
                                </div>
                                )}
                            </TableCell>

                            <TableCell className="text-right">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-slate-100 rounded-full">
                                            <MoreVertical className="h-4 w-4 text-slate-500" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-52 p-2 bg-slate-900 border-slate-800 shadow-2xl" align="end">
                                        <div className="flex flex-col gap-1">
                                            <p className="px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500">Opciones</p>
                                            <Button 
                                                variant="ghost" 
                                                className="w-full justify-start text-xs text-slate-200 hover:bg-slate-800 h-9"
                                                onClick={() => { setSelectedTx(t); setIsNoteDialogOpen(true); }}
                                            >
                                                <Pencil className="mr-2 h-4 w-4 text-indigo-400" /> Editar nota (Alias)
                                            </Button>
                                            <div className="group w-full">
                                                <TransactionSplitDialog transaction={t} categories={categories} accounts={accounts} />
                                            </div>
                                            <div className="h-[1px] bg-slate-800 my-1" />
                                            <Button variant="ghost" disabled className="w-full justify-start text-xs text-slate-500 opacity-50 h-9">
                                                <Plane className="mr-2 h-4 w-4" /> Vincular a viaje
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                className="w-full justify-start text-xs text-slate-200 hover:bg-slate-800 h-9"
                                                onClick={() => { setSelectedTx(t); setShowInventoryDialog(true); }}
                                            >
                                                <Package className="mr-2 h-4 w-4 text-emerald-400" /> Subir al inventario
                                            </Button>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </TableCell>
                            </TableRow>

                            {/* DESGLOSE */}
                            {t.is_split && expandedRows.has(t.id) && t.splits?.map((s) => {
                                const sCat = categories.find((c) => c.id === s.category_id);
                                const sParent = sCat?.parent_id ? categories.find((pc) => pc.id === sCat.parent_id) : null;
                                const sColor = sParent?.color || sCat?.color || "#94a3b8";

                                return (
                                    <TableRow key={s.id} className="bg-slate-50/40 border-l-4 border-l-indigo-200">
                                    <TableCell></TableCell>
                                    <TableCell className="text-[11px] pl-8 text-slate-500 italic font-medium">{s.notes || "Sub-movimiento"}</TableCell>
                                    <TableCell className="text-right text-xs font-mono font-bold text-slate-500">
                                        {isPrivate ? "••" : `${s.amount.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €`}
                                    </TableCell>
                                    <TableCell>
                                        <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-md text-[9px] font-black uppercase border"
                                        style={{ backgroundColor: sColor + "10", color: sColor, borderColor: sColor + "30" }}>
                                        <LoadIcon name={sCat?.icon_name || "Tag"} size={12} />
                                        {sCat?.name}
                                        </div>
                                    </TableCell>
                                    <TableCell></TableCell>
                                    </TableRow>
                                );
                            })}
                        </React.Fragment>
                        );
                    })}
                    </TableBody>
                </Table>
                
                {/* PAGINACIÓN */}
                <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex flex-col">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Página {currentPage} de {totalPages || 1}</p>
                        <p className="text-[9px] text-slate-400 italic">{filteredTransactions.length} movimientos encontrados</p>
                    </div>
                    <div className="flex gap-1">
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-white" disabled={currentPage === 1} onClick={() => setCurrentPage(1)}><ChevronsLeft className="h-4 w-4" /></Button>
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-white" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}><ChevronLeft className="h-4 w-4" /></Button>
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-white" disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}><ChevronRight className="h-4 w-4" /></Button>
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-white" disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(totalPages)}><ChevronsRight className="h-4 w-4" /></Button>
                    </div>
                </div>
            </div>

            {/* DIÁLOGOS EXTRA */}
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
                    transaction={{
                        ...selectedTx,
                        category_id: activeCategoryId // ✨ Forzamos la categoría recién elegida
                    }}
                    onClose={async (success) => {
                        setShowTripDialog(false);
                        if (!success) {
                            await updateTransactionCategoryAction(selectedTx.id, 'pending');
                        }
                        setSelectedTx(null);
                        setActiveCategoryId(null); // Limpiamos
                    }}
                />
            )}
            {showUnlinkConfirm && pendingUnlink && (
                <UnlinkTripConfirmDialog
                    open={showUnlinkConfirm}
                    onClose={() => {
                        setShowUnlinkConfirm(false);
                        setPendingUnlink(null);
                    }}
                    onConfirm={async (deleteExpense) => {
                        const { transaction } = pendingUnlink;
                        const res = await unlinkTransactionFromTravelAction(
                            transaction.id, 
                            transaction.travel_expense_id!, 
                            deleteExpense
                        );
                        
                        if (res.success) {
                            toast.success(deleteExpense ? "Gasto eliminado y desvinculado" : "Desvinculado correctamente");
                        }
                        setShowUnlinkConfirm(false);
                        setPendingUnlink(null);
                    }}
                />
            )}
        </div>
    );
}