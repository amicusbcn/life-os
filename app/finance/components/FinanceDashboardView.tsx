'use client'

import React, { useState, useMemo, useEffect } from 'react';
import { 
    FinanceAccount, 
    FinanceCategory, 
    FinanceTransaction, 
    FinanceRule, 
    FinanceTransactionSplit 
} from '@/types/finance';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { TransactionSplitDialog } from "./TransactionSplitDialog";
import { 
    Split, Search, FilterX, ChevronDown, ChevronRight,
    ChevronLeft, Check, ChevronsUpDown, Wallet, Eye, EyeOff, Tag
} from 'lucide-react';
import LoadIcon from '@/utils/LoadIcon';

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover" ;
import { cn } from "@/lib/utils";
import { updateTransactionCategoryAction } from '../actions';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { MagicRuleDialog } from "./MagicRuleDialog";

interface FinanceDashboardViewProps {
    accounts: FinanceAccount[];
    categories: FinanceCategory[];
    transactions: FinanceTransaction[];
    rules: FinanceRule[];
    totalBalance: number;
}

const ITEMS_PER_PAGE = 25;

export function FinanceDashboardView({ accounts, categories, transactions, rules, totalBalance }: FinanceDashboardViewProps) {
    const router = useRouter();
    
    // --- ESTADOS ---
    const [isUpdating, setIsUpdating] = useState<string | null>(null);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [isPrivate, setIsPrivate] = useState(true); 
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [accountFilter, setAccountFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [mounted, setMounted] = useState(false);
    const [magicSuggestion, setMagicSuggestion] = useState<{ concept: string, catId: string, catName: string } | null>(null);

    useEffect(() => { setMounted(true); }, []);

    const toggleRow = (id: string) => {
        const newRows = new Set(expandedRows);
        if (newRows.has(id)) newRows.delete(id);
        else newRows.add(id);
        setExpandedRows(newRows);
    };

    const handleCategoryChange = async (transactionId: string, categoryId: string, concept: string) => {
        setIsUpdating(transactionId);
        const result = await updateTransactionCategoryAction(transactionId, categoryId);
        
        if (result.success) {
            const patternExists = rules.some((r: FinanceRule) => 
                concept.toUpperCase().includes(r.pattern.toUpperCase())
            );
            const catName = categories.find(c => c.id === categoryId)?.name || "";

            if (!patternExists && categoryId !== 'pending') {
                toast.success("Categoría actualizada", {
                    description: `¿Quieres crear una regla para "${concept}"?`,
                    duration: 6000,
                    action: {
                        label: "🪄 Crear Regla",
                        onClick: () => setMagicSuggestion({ concept, catId: categoryId, catName }),
                    },
                });
            } else {
                toast.success("Categoría actualizada", { duration: 2000 });
            }
            router.refresh();
        } else {
            toast.error("Error al actualizar");
        }
        setIsUpdating(null);
    };

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const matchesSearch = t.concept.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesAccount = accountFilter === 'all' || t.account_id === accountFilter;
            
            let matchesCategory = false;
            if (categoryFilter === 'all') {
                matchesCategory = true;
            } else if (categoryFilter === 'none') {
                matchesCategory = t.category_id === null || t.category_id === 'pending' || t.category_id === '';
            } else {
                const transactionCat = categories.find(c => c.id === t.category_id);
                const matchesPrimary = t.category_id === categoryFilter || transactionCat?.parent_id === categoryFilter;
                
                const isSplit = t.is_split ?? false;
                const matchesInSplits = isSplit && t.splits?.some(s => {
                    const splitCat = categories.find(c => c.id === s.category_id);
                    return s.category_id === categoryFilter || splitCat?.parent_id === categoryFilter;
                });
                
                matchesCategory = !!(matchesPrimary || matchesInSplits);
            }
            return matchesSearch && matchesCategory && matchesAccount;
        });
    }, [transactions, searchTerm, categoryFilter, accountFilter, categories]);

    const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
    const paginatedTransactions = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredTransactions.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredTransactions, currentPage]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
    }

    const resetFilters = () => {
        setSearchTerm('');
        setCategoryFilter('all');
        setAccountFilter('all');
        setCurrentPage(1);
    };

    if (!mounted) return <div className="mt-8 animate-pulse italic text-slate-400">Cargando dashboard...</div>;

    return (
        <div className="mt-8 space-y-6 pb-20">
            
            {/* --- BLOQUE DE PATRIMONIO (OCULTACIÓN TOTAL) --- */}
            <div className="relative overflow-hidden p-6 rounded-[2rem] bg-slate-900 text-white shadow-xl">
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Patrimonio Global</p>
                        <div className="flex items-baseline gap-3">
                            <h2 className="text-3xl md:text-5xl font-mono font-bold tracking-tighter transition-all duration-300">
                                {isPrivate ? "••••••" : totalBalance.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                            </h2>
                            {!isPrivate && <span className="text-slate-500 text-xl font-light">EUR</span>}
                        </div>
                    </div>

                    <Button 
                        variant="outline" 
                        size="lg" 
                        onClick={() => setIsPrivate(!isPrivate)}
                        className={cn(
                            "rounded-2xl border-white/10 px-6",
                            isPrivate ? "bg-indigo-600 text-white border-transparent" : "bg-white/5 text-slate-300"
                        )}
                    >
                        {isPrivate ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
                        {isPrivate ? "Revelar Datos" : "Modo Privado"}
                    </Button>
                </div>
            </div>

            {/* --- ACORDEÓN DE CUENTAS --- */}
            <div className={cn(
                "grid transition-all duration-500",
                !isPrivate ? "grid-rows-[1fr] opacity-100 mb-4" : "grid-rows-[0fr] opacity-0"
            )}>
                <div className="overflow-hidden">
                    <div className="flex overflow-x-auto pb-4 gap-4 snap-x scrollbar-hide pt-2">
                        {accounts.map((acc) => (
                            <div 
                                key={acc.id} 
                                onClick={() => {
                                    setAccountFilter(accountFilter === acc.id ? 'all' : acc.id);
                                    setCurrentPage(1);
                                }}
                                className={cn(
                                    "min-w-[240px] cursor-pointer snap-start p-5 rounded-2xl shadow-sm border-2 transition-all",
                                    accountFilter === acc.id ? "border-indigo-500 ring-2 ring-indigo-100" : "border-transparent"
                                )}
                                style={{ backgroundColor: acc.color_theme || '#f8fafc' }}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div className="p-2 bg-white/60 rounded-lg">
                                        <LoadIcon name={acc.icon_name || 'Bank'} className="w-4 h-4 text-slate-700" />
                                    </div>
                                    {accountFilter === acc.id && <Badge className="bg-indigo-500 text-white border-0 text-[10px]">Filtrando</Badge>}
                                </div>
                                <h3 className="font-bold text-slate-800 text-sm">{acc.name}</h3>
                                <p className="text-xl font-black text-slate-900 mt-1">
                                    {isPrivate ? "••••" : (acc.current_balance ?? acc.initial_balance).toLocaleString('es-ES', { minimumFractionDigits: 2 })} {acc.currency}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* --- PANEL DE FILTROS CON ICONOS --- */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                <div className="md:col-span-2 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                        placeholder="Buscar movimientos..." 
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        className="pl-10 bg-white border-slate-200"
                    />
                </div>
                <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger className="bg-white border-slate-200">
                        <SelectValue placeholder="Categoría" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">
                            <div className="flex items-center gap-2">
                                <Tag className="w-3.5 h-3.5 text-slate-400" />
                                <span>Todas las categorías</span>
                            </div>
                        </SelectItem>
                        <SelectItem value="none" className="text-amber-600 font-bold">
                            <div className="flex items-center gap-2">
                                <EyeOff className="w-3.5 h-3.5" />
                                <span>⚠️ Sin categoría</span>
                            </div>
                        </SelectItem>
                        <hr className="my-1 border-slate-100" />
                        {categories.filter(c => !c.parent_id).map(parent => {
                            const subCats = categories.filter(sub => sub.parent_id === parent.id);
                            const hasSubcats = subCats.length > 0;

                            return (
                                <React.Fragment key={parent.id}>
                                    <SelectItem value={parent.id} className="font-bold text-indigo-600">
                                        <div className="flex items-center gap-2">
                                            <LoadIcon name={parent.icon_name || 'Tag'} className="w-3.5 h-3.5" />
                                            <span>{parent.name.toUpperCase()} {hasSubcats ? '(TODO)' : ''}</span>
                                        </div>
                                    </SelectItem>
                                    {subCats.map(sub => (
                                        <SelectItem key={sub.id} value={sub.id} className="pl-6">
                                            <div className="flex items-center gap-2">
                                                <LoadIcon name={sub.icon_name || 'Tag'} className="w-3.5 h-3.5 text-slate-400" />
                                                <span>{sub.name}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </React.Fragment>
                            );
                        })}
                    </SelectContent>
                </Select>
                {(searchTerm || categoryFilter !== 'all' || accountFilter !== 'all') && (
                    <Button variant="ghost" onClick={resetFilters} className="text-slate-500 hover:bg-slate-100">
                        <FilterX className="mr-2 h-4 w-4"/> Limpiar
                    </Button>
                )}
            </div>

            {/* --- TABLA DE MOVIMIENTOS --- */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50/80">
                        <TableRow>
                            <TableHead className="w-[100px]">Fecha</TableHead>
                            <TableHead>Concepto</TableHead>
                            <TableHead className="text-right w-[140px]">Importe</TableHead>
                            <TableHead className="w-[180px]">Categoría</TableHead>
                            <TableHead className="hidden md:table-cell w-[140px]">Cuenta</TableHead>
                            <TableHead className="w-[60px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedTransactions.map((t) => (
                            <React.Fragment key={t.id}>
                                <TableRow 
                                    className={cn(
                                        "group cursor-pointer hover:bg-slate-50/50 transition-colors",
                                        (t.is_split ?? false) && expandedRows.has(t.id) && "bg-slate-50"
                                    )}
                                    onClick={() => (t.is_split ?? false) && toggleRow(t.id)}
                                >
                                    <TableCell className="text-xs font-medium text-slate-500 tracking-tight">{formatDate(t.date)}</TableCell>
                                    <TableCell className="font-medium text-slate-700 max-w-[200px]">
                                        <div className="flex items-center gap-2">
                                            <span className="truncate">{t.concept}</span>
                                            {(t.is_split ?? false) && (
                                                <Badge variant="secondary" className="h-5 px-1.5 bg-indigo-50 text-indigo-600 border-indigo-100 text-[9px] font-bold">
                                                    {expandedRows.has(t.id) ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
                                                    SPLIT
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className={cn(
                                        "text-right font-mono font-bold transition-all duration-300",
                                        t.amount >= 0 ? 'text-green-600' : 'text-slate-900'
                                    )}>
                                        {t.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                                    </TableCell>
                                    <TableCell>
                                        {(t.is_split ?? false) ? (
                                            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase italic tracking-tighter">
                                                <Split className="h-3 w-3" /> Ver desglose
                                            </div>
                                        ) : (
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className={cn(
                                                            "h-8 w-full justify-between text-xs font-medium transition-all",
                                                            !t.category_id ? "border-amber-200 bg-amber-50 text-amber-700" : "border-transparent bg-slate-100 text-slate-700"
                                                        )}
                                                        style={t.category ? { 
                                                            backgroundColor: (t.category.parent?.color || t.category.color || '#94a3b8') + '25',
                                                            color: t.category.parent?.color || t.category.color || '#475569',
                                                        } : {}}
                                                    >
                                                        <div className="flex items-center gap-2 truncate">
                                                            <LoadIcon name={t.category?.icon_name || 'Tag'} className="w-3.5 h-3.5" />
                                                            <span className="truncate">{t.category?.name || "Pendiente"}</span>
                                                        </div>
                                                        <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[240px] p-0 shadow-xl border-slate-200">
                                                    <Command>
                                                        <CommandInput placeholder="Buscar categoría..." className="h-8 text-xs" />
                                                        <CommandList>
                                                            <CommandEmpty>No hay resultados.</CommandEmpty>
                                                            {categories.filter(c => !c.parent_id).map(parent => {
                                                                const subCats = categories.filter(sub => sub.parent_id === parent.id);
                                                                const hasSubcats = subCats.length > 0;

                                                                return (
                                                                    <CommandGroup key={parent.id} heading={parent.name} className="text-[10px] uppercase font-bold text-slate-400">
                                                                        {/* ✅ Permitimos seleccionar la raíz SI NO tiene hijos */}
                                                                        {!hasSubcats && (
                                                                            <CommandItem
                                                                                key={parent.id}
                                                                                value={parent.name}
                                                                                onSelect={() => handleCategoryChange(t.id, parent.id, t.concept)}
                                                                                className="text-xs cursor-pointer"
                                                                            >
                                                                                <Check className={cn("mr-2 h-3 w-3", t.category_id === parent.id ? "opacity-100" : "opacity-0")} />
                                                                                {parent.name} (Raíz)
                                                                            </CommandItem>
                                                                        )}
                                                                        {/* Renderizamos subcategorías normalmente */}
                                                                        {subCats.map(sub => (
                                                                            <CommandItem
                                                                                key={sub.id}
                                                                                value={sub.name}
                                                                                onSelect={() => handleCategoryChange(t.id, sub.id, t.concept)}
                                                                                className="text-xs cursor-pointer"
                                                                            >
                                                                                <Check className={cn("mr-2 h-3 w-3", t.category_id === sub.id ? "opacity-100" : "opacity-0")} />
                                                                                {sub.name}
                                                                            </CommandItem>
                                                                        ))}
                                                                    </CommandGroup>
                                                                );
                                                            })}
                                                        </CommandList>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                        )}
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">
                                        <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-lg text-[10px] font-bold border border-slate-100 bg-slate-50 text-slate-500">
                                            <LoadIcon name={t.account?.icon_name || 'CreditCard'} className="w-3 h-3" />
                                            <span className="truncate max-w-[80px]">{t.account?.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                            <TransactionSplitDialog transaction={t} categories={categories} />
                                        </div>
                                    </TableCell>
                                </TableRow>

                                {(t.is_split ?? false) && expandedRows.has(t.id) && (
                                    <>
                                        {t.splits?.map((split: FinanceTransactionSplit) => (
                                            <TableRow key={split.id} className="bg-slate-50/40 border-l-4 border-l-indigo-400/50 border-b-0 hover:bg-slate-100/50 transition-colors">
                                                <TableCell className="py-2"></TableCell>
                                                <TableCell className="py-2 pl-8">
                                                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                                        {split.notes || <span className="italic opacity-40 italic">Detalle</span>}
                                                    </div>
                                                </TableCell>
                                                <TableCell className={cn(
                                                    "py-2 text-right font-mono text-xs font-semibold transition-all duration-300",
                                                    t.amount >= 0 ? 'text-green-500/80' : 'text-slate-500'
                                                )}>
                                                    {(t.amount >= 0 ? split.amount : -split.amount).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                                                </TableCell>
                                                <TableCell className="py-2">
                                                    <div className="flex items-center gap-2 px-2 py-0.5 rounded-md border border-slate-200 bg-white w-fit shadow-sm">
                                                        <LoadIcon name={split.category?.icon_name || 'Tag'} className="w-3 h-3" style={{ color: split.category?.color }} />
                                                        <span className="text-[10px] font-bold text-slate-600">{split.category?.name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell colSpan={2} className="py-2"></TableCell>
                                            </TableRow>
                                        ))}
                                    </>
                                )}
                            </React.Fragment>
                        ))}
                    </TableBody>
                </Table>
                
                {/* --- PAGINACIÓN --- */}
                <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <p className="text-[10px] text-slate-500 font-medium">Mostrando {paginatedTransactions.length} de {filteredTransactions.length} movimientos</p>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center px-3 text-[10px] font-bold text-slate-600 bg-white border rounded-md">{currentPage} / {totalPages || 1}</div>
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p => p + 1)}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {magicSuggestion && (
                <MagicRuleDialog 
                    concept={magicSuggestion.concept}
                    categoryId={magicSuggestion.catId}
                    categoryName={magicSuggestion.catName}
                    onClose={() => setMagicSuggestion(null)}
                />
            )}
        </div>
    );
}