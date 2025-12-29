// app/finance/components/TransactionList.tsx
'use client'

import React, { useState, useMemo } from 'react';
import { FinanceTransaction, FinanceCategory,FinanceAccount } from '@/types/finance';
import { TransactionNoteDialog } from './TransactionNoteDialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { 
    Search, FilterX, ChevronDown, ChevronRight, ChevronLeft, Building2, User, MoreVertical,Pencil,Plane,Package,
    Check, ChevronsUpDown, Tag, EyeOff, Split, ChevronsRight,ChevronsLeft,Link2
} from 'lucide-react';
import LoadIcon from '@/utils/LoadIcon';
import { cn } from "@/lib/utils";
import { TransactionSplitDialog } from "./TransactionSplitDialog";
import { handleTransferAction, updateTransactionCategoryAction } from '../actions';
import { toast } from 'sonner';
import { TransferAssistant } from './TransferAssistant';
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
    const [transferTargetTx, setTransferTargetTx] = useState<string | null>(null);
    const [showOriginalConcepts, setShowOriginalConcepts] = useState(false);
    const [selectedTx, setSelectedTx] = useState<FinanceTransaction | null>(null);
    const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
    const [showTransferAssistant, setShowTransferAssistant] = useState(false);
    const [selectedTxForTransfer, setSelectedTxForTransfer] = useState<FinanceTransaction | null>(null);

    const toggleRow = (id: string) => {
        const newRows = new Set(expandedRows);
        if (newRows.has(id)) newRows.delete(id);
        else newRows.add(id);
        setExpandedRows(newRows);
    };

    const handleCategorySelection = async (transaction: FinanceTransaction, newCategoryId: string) => {
        const TRANSFER_CAT_ID = "10310a6a-5d3b-4e95-a19f-bfef8cd2dd1a";

        if (newCategoryId === TRANSFER_CAT_ID) {
            // En lugar de guardar, abrimos el asistente
            setSelectedTxForTransfer(transaction);
            setShowTransferAssistant(true);
        } else {
            // Es una categoría normal, guardamos directamente
            await updateTransactionCategoryAction(transaction.id, newCategoryId);
            toast.success("Categoría actualizada");
        }
    };

    // --- LÓGICA DE FILTRADO COMPLETA ---
    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            // 1. Filtro de búsqueda por texto
            const matchesSearch = t.concept.toLowerCase().includes(searchTerm.toLowerCase());
            
            // 2. Filtro por cuenta bancaria
            const matchesAccount = accountFilter === 'all' || t.account_id === accountFilter;
            
            // 3. Filtro de Rango de Fechas
            const tDate = new Date(t.date).setHours(0,0,0,0);
            const start = startDate ? new Date(startDate).setHours(0,0,0,0) : null;
            const end = endDate ? new Date(endDate).setHours(0,0,0,0) : null;
            const matchesStart = !start || tDate >= start;
            const matchesEnd = !end || tDate <= end;
            
            // 4. FILTRO DE CATEGORÍA (Corregido para desgloses)
            let matchesCategory = false;
            if (categoryFilter === 'all') {
                matchesCategory = true;
            } else if (categoryFilter === 'none') {
                matchesCategory = !t.category_id || t.category_id === 'pending';
            } else {
                // Comprobamos la categoría principal de la transacción
                const transactionCat = categories.find(c => c.id === t.category_id);
                const isMatchPrimary = t.category_id === categoryFilter || transactionCat?.parent_id === categoryFilter;
                
                // Comprobamos si alguna de las líneas del desglose coincide con el filtro
                // Buscamos tanto por el ID directo como por el ID del padre de esa subcategoría
                const isMatchInSplits = t.is_split && t.splits?.some(s => {
                    const splitCat = categories.find(c => c.id === s.category_id);
                    return s.category_id === categoryFilter || splitCat?.parent_id === categoryFilter;
                });
                
                matchesCategory = !!(isMatchPrimary || isMatchInSplits);
            }
            
            return matchesSearch && matchesAccount && matchesStart && matchesEnd && matchesCategory;
        });
    }, [transactions, searchTerm, categoryFilter, accountFilter, categories, startDate, endDate]);

    const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
    const paginatedTransactions = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredTransactions.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredTransactions, currentPage]);

    const resetFilters = () => {
        setSearchTerm(''); setCategoryFilter('all'); setStartDate(''); setEndDate(''); setCurrentPage(1);
    };

    return (
        <div className="space-y-4">
            {/* PANEL DE FILTROS */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 items-end">
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
                {(searchTerm || categoryFilter !== 'all' || startDate || endDate) && (
                    <Button variant="ghost" onClick={resetFilters} className="text-slate-500 hover:bg-slate-100 h-9"><FilterX className="mr-2 h-4 w-4"/> Limpiar</Button>
                )}
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowOriginalConcepts(!showOriginalConcepts)}
                    className={cn("h-9 text-[10px] font-bold uppercase tracking-wider", 
                        showOriginalConcepts ? "text-amber-600" : "text-indigo-600")}
                    >
                    {showOriginalConcepts ? <Building2 className="mr-2 h-3.5 w-3.5" /> : <User className="mr-2 h-3.5 w-3.5" />}
                    {showOriginalConcepts ? "Ver Banco" : "Ver Notas"}
                </Button>
            </div>
            
            {/* TABLA DE MOVIMIENTOS */}   
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
                                <div className="flex items-center gap-2 truncate max-w-[220px]">
                                <span className={cn(
                                    "text-sm block truncate",
                                    !showOriginalConcepts && t.notes ? "font-bold text-slate-900" : "font-medium text-slate-600"
                                )}>
                                    {/* Lógica: Si el switch está en 'Original', mostramos concepto. 
                                        Si está en 'Notas', priorizamos nota y si no hay, mostramos concepto. */}
                                    {showOriginalConcepts ? t.concept : (t.notes || t.concept)}
                                </span>
                                {t.transfer_id && (
                                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 shadow-sm animate-in fade-in zoom-in">
                                    <Link2 className="h-2.5 w-2.5" />
                                    <span className="text-[8px] font-black uppercase">VINCULADA</span>
                                    </div>
                                )}
                                {t.is_split && (
                                    <Badge variant="secondary" className="text-[9px] bg-indigo-50 text-indigo-600 border-indigo-100">
                                    SPLIT
                                    </Badge>
                                )}
                                </div>
                            </TableCell>
                            <TableCell className={cn("text-right font-mono font-bold", t.amount >= 0 ? "text-green-600" : "text-slate-900")}>
                                ${t.amount.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €
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
                                        <LoadIcon name={cat?.icon_name || "Tag"} className="w-3.5 h-3.5" />
                                        <span className="truncate">{cat?.name || "Pendiente"}</span>
                                        </div>
                                        <ChevronsUpDown className="h-3 w-3 opacity-50 shrink-0" />
                                    </Button>
                                    </PopoverTrigger>
                                    
                                    {/* 🌙 POPOVER EN MODO OSCURO */}
                                    <PopoverContent className="w-[280px] p-0 border-slate-700 bg-slate-900 shadow-2xl z-[100] overflow-hidden" align="start">
                                            /* --- BUSCADOR DE CATEGORÍAS --- */
                                            <Command className="bg-slate-900 border-none">
                                            <CommandInput 
                                                placeholder="Buscar categoría..." 
                                                className="text-slate-100 border-none focus:ring-0 placeholder:text-slate-500"
                                            />
                                            <CommandList className="max-h-[350px] scrollbar-thin scrollbar-thumb-slate-700">
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
                                                        className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-slate-200 aria-selected:bg-slate-800 aria-selected:text-white cursor-pointer transition-colors"
                                                        >
                                                        <Check className={cn("h-3.5 w-3.5 shrink-0", t.category_id === parent.id ? "text-indigo-400 opacity-100" : "opacity-0")} />
                                                        <span className="truncate">{parent.name}</span>
                                                        </CommandItem>
                                                    )}
                                                    {subCats.map((sub) => (
                                                        <CommandItem
                                                        key={sub.id}
                                                        onSelect={() => {handleCategorySelection(t, sub.id);}}
                                                        className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-slate-300 aria-selected:bg-slate-800 aria-selected:text-white cursor-pointer transition-colors"
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
                                            <p className="px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                                Opciones
                                            </p>
                                            
                                            {/* 📝 EDITAR NOTA */}
                                            <Button 
                                                variant="ghost" 
                                                className="w-full justify-start text-xs text-slate-200 hover:bg-slate-800 hover:text-white h-9"
                                                onClick={() => {
                                                    setSelectedTx(t);
                                                    setIsNoteDialogOpen(true);
                                                }}
                                            >
                                                <Pencil className="mr-2 h-4 w-4 text-indigo-400" />
                                                Editar nota (Alias)
                                            </Button>

                                            {/* ✂️ DESGLOSAR */}
                                            <div className="group w-full">
                                            <TransactionSplitDialog 
                                                    transaction={t} 
                                                    categories={categories} 
                                                    accounts={accounts}
                                                />
                                            </div>

                                            <div className="h-[1px] bg-slate-800 my-1" />

                                            {/* ✈️ VIAJES */}
                                            <Button 
                                                variant="ghost" 
                                                disabled
                                                className="w-full justify-start text-xs text-slate-500 opacity-50 h-9"
                                            >
                                                <Plane className="mr-2 h-4 w-4" />
                                                Vincular a viaje
                                            </Button>

                                            {/* 📦 INVENTARIO */}
                                            <Button 
                                                variant="ghost" 
                                                disabled
                                                className="w-full justify-start text-xs text-slate-500 opacity-50 h-9"
                                            >
                                                <Package className="mr-2 h-4 w-4" />
                                                Subir al inventario
                                            </Button>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </TableCell>
                            </TableRow>

                            {/* FILAS DE DESGLOSE (Se mantienen igual) */}
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
                                    <LoadIcon name={sCat?.icon_name || "Tag"} className="w-3 h-3" />
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
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                            Página {currentPage} de {totalPages || 1}
                        </p>
                        <p className="text-[9px] text-slate-400 italic">
                            {filteredTransactions.length} movimientos encontrados
                        </p>
                    </div>

                    <div className="flex gap-1">
                        {/* IR AL PRINCIPIO |< */}
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 w-8 p-0 bg-white"
                            disabled={currentPage === 1} 
                            onClick={() => setCurrentPage(1)}
                        >
                            <ChevronsLeft className="h-4 w-4" />
                        </Button>

                        {/* ANTERIOR < */}
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 w-8 p-0 bg-white"
                            disabled={currentPage === 1} 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>

                        {/* SIGUIENTE > */}
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 w-8 p-0 bg-white"
                            disabled={currentPage === totalPages || totalPages === 0} 
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>

                        {/* IR AL FINAL >| */}
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 w-8 p-0 bg-white"
                            disabled={currentPage === totalPages || totalPages === 0} 
                            onClick={() => setCurrentPage(totalPages)}
                        >
                            <ChevronsRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
            {selectedTx && (
                <TransactionNoteDialog 
                    transaction={selectedTx} 
                    open={isNoteDialogOpen} 
                    onOpenChange={setIsNoteDialogOpen} 
                />
                )}
            {/* Diálogo del Asistente de Transferencia */}
            {showTransferAssistant && selectedTxForTransfer && (
                <TransferAssistant 
                    transaction={selectedTxForTransfer}
                    accounts={accounts} // Las cuentas que ya pasas por props
                    onClose={() => {
                        setShowTransferAssistant(false);
                        setSelectedTxForTransfer(null);
                    }}
                />
            )}
        </div>
    );
}