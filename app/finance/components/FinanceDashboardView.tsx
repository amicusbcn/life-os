'use client'

import React, { useState, useMemo, useEffect } from 'react';
import { FinanceAccount, FinanceCategory, FinanceTransaction, FinanceRule } from '@/types/finance';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { 
    ListChecks, Search, FilterX, 
    ChevronLeft, ChevronRight, Check, ChevronsUpDown, Wallet, Zap
} from 'lucide-react';
import LoadIcon from '@/utils/LoadIcon';

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover" ;
import { cn } from "@/lib/utils";
import { updateTransactionCategoryAction } from '../actions';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { MagicRuleDialog } from "./MagicRuleDialog"; // Asegúrate de que el archivo existe

interface FinanceDashboardViewProps {
    accounts: FinanceAccount[];
    categories: FinanceCategory[];
    transactions: FinanceTransaction[];
    rules: FinanceRule[]; // 🚨 Añadido
    totalBalance: number; // 🚨 Añadido
}

const ITEMS_PER_PAGE = 25;

export function FinanceDashboardView({ accounts, categories, transactions, rules, totalBalance }: FinanceDashboardViewProps) {
    const router = useRouter();
    const [isUpdating, setIsUpdating] = useState<string | null>(null);
    
    // 🪄 Estado para la sugerencia mágica
    const [magicSuggestion, setMagicSuggestion] = useState<{ concept: string, catId: string, catName: string } | null>(null);

    // --- MANEJADOR DE CAMBIO DE CATEGORÍA ---
    const handleCategoryChange = async (transactionId: string, categoryId: string, concept: string) => {
        setIsUpdating(transactionId);
        
        const result = await updateTransactionCategoryAction(transactionId, categoryId);
        
        if (result.success) {
            // 1. Buscamos si ya existe regla
            const patternExists = rules.some((r: FinanceRule) => 
                concept.toUpperCase().includes(r.pattern.toUpperCase())
            );

            const catName = categories.find(c => c.id === categoryId)?.name || "";

            // 2. Si NO existe regla, lanzamos el toast especial
            if (!patternExists && categoryId !== 'pending') {
                toast.success("Categoría actualizada", {
                    description: `¿Quieres crear una regla para "${concept}"?`,
                    duration: 6000, // Le damos más tiempo porque requiere acción
                    action: {
                        label: "🪄 Crear Regla",
                        onClick: () => {
                            // Aquí llamamos a una pequeña función que abra un prompt o el diálogo
                            // Pero para permitir la EDICIÓN que pediste, lo ideal es usar un modal pequeño
                            setMagicSuggestion({ concept, catId: categoryId, catName });
                        },
                    },
                });
            } else {
                // Si ya existe regla, toast normal rápido
                toast.success("Categoría actualizada", { duration: 2000 });
            }
            
            router.refresh();
        } else {
            toast.error("Error al actualizar");
        }
        setIsUpdating(null);
    };

    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [accountFilter, setAccountFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);

    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const matchesSearch = t.concept.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = categoryFilter === 'all' || t.category_id === categoryFilter;
            const matchesAccount = accountFilter === 'all' || t.account_id === accountFilter;
            return matchesSearch && matchesCategory && matchesAccount;
        });
    }, [transactions, searchTerm, categoryFilter, accountFilter]);

    const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
    const paginatedTransactions = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredTransactions.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredTransactions, currentPage]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = String(date.getFullYear()).slice(-2);
        return `${day}/${month}/${year}`;
    }

    const resetFilters = () => {
        setSearchTerm('');
        setCategoryFilter('all');
        setAccountFilter('all');
        setCurrentPage(1);
    };

    if (!mounted) return <div className="mt-8 animate-pulse italic text-slate-400">Cargando dashboard...</div>;

    return (
        <div className="mt-8 space-y-8 pb-20">
            
            {/* --- BLOQUE DE PATRIMONIO TOTAL --- */}
            <div className="relative overflow-hidden p-8 rounded-[2.5rem] bg-slate-900 text-white shadow-2xl shadow-slate-200">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] -mr-20 -mt-20" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.3em] mb-3">
                            Patrimonio Neto Global
                        </p>
                        <h2 className="text-4xl md:text-6xl font-mono font-bold tracking-tighter flex items-baseline gap-3">
                            {totalBalance.toLocaleString('es-ES', { 
                                minimumFractionDigits: 2, 
                                maximumFractionDigits: 2,
                                useGrouping: 'always' 
                            })}
                            <span className="text-slate-500 text-2xl md:text-3xl font-light">EUR</span>
                        </h2>
                    </div>
                    <div className="flex items-center gap-4 bg-white/5 p-4 rounded-3xl border border-white/10 backdrop-blur-md">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/40">
                            <Wallet className="h-6 w-6 text-white" />
                        </div>
                        <div className="pr-4">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Estado</p>
                            <p className="text-sm font-bold text-emerald-400">Actualizado</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- CAROUSEL DE CUENTAS --- */}
            <div className="flex overflow-x-auto pb-4 gap-4 snap-x scrollbar-hide">
                {accounts.map((acc) => (
                    <div 
                        key={acc.id} 
                        onClick={() => {
                            setAccountFilter(accountFilter === acc.id ? 'all' : acc.id);
                            setCurrentPage(1);
                        }}
                        className={`min-w-[280px] cursor-pointer snap-start p-6 rounded-2xl shadow-sm border-2 transition-all active:scale-95 ${
                            accountFilter === acc.id ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: acc.color_theme || '#f8fafc' }}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-white/60 rounded-lg">
                                <LoadIcon name={acc.icon_name || 'Bank'} className="w-5 h-5 text-slate-700" />
                            </div>
                            {accountFilter === acc.id && <Badge className="bg-indigo-500">Filtrando</Badge>}
                        </div>
                        <h3 className="font-bold text-slate-800">{acc.name}</h3>
                        <p className="text-2xl font-black text-slate-900 mt-2">
                            {(acc.current_balance ?? acc.initial_balance).toLocaleString('es-ES', { minimumFractionDigits: 2, useGrouping: 'always' })} {acc.currency}
                        </p>
                    </div>
                ))}
            </div>

            {/* --- FILTROS --- */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="md:col-span-2 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                        placeholder="Buscar concepto..." 
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        className="pl-10 bg-white"
                    />
                </div>
                <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger className="bg-white"><SelectValue placeholder="Categoría" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas las categorías</SelectItem>
                        {categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                {(searchTerm || categoryFilter !== 'all' || accountFilter !== 'all') && (
                    <Button variant="ghost" onClick={resetFilters} className="text-slate-500"><FilterX className="mr-2 h-4 w-4"/> Limpiar</Button>
                )}
            </div>

            {/* --- TABLA --- */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="w-[100px]">Fecha</TableHead>
                            <TableHead>Concepto</TableHead>
                            <TableHead className="text-right">Importe</TableHead>
                            <TableHead>Categoría</TableHead>
                            <TableHead className="hidden md:table-cell">Cuenta</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedTransactions.map((t) => (
                            <TableRow key={t.id} className="cursor-pointer hover:bg-slate-50/50">
                                <TableCell className="text-xs font-medium text-slate-500">{formatDate(t.date)}</TableCell>
                                <TableCell className="font-medium text-slate-700 truncate max-w-[200px]">{t.concept}</TableCell>
                                <TableCell className={`text-right font-bold ${t.amount >= 0 ? 'text-green-600' : 'text-slate-900'}`}>
                                    {t.amount.toLocaleString('es-ES', { minimumFractionDigits: 2, useGrouping: 'always' })} €
                                </TableCell>
                                <TableCell>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className={cn(
                                                    "h-8 w-full justify-between text-xs font-medium transition-all",
                                                    !t.category_id ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100" : "border-transparent bg-slate-100 text-slate-700"
                                                )}
                                                style={t.category ? { 
                                                    backgroundColor: (t.category.parent?.color || t.category.color || '#94a3b8') + '25',
                                                    color: t.category.parent?.color || t.category.color || '#475569',
                                                    borderColor: (t.category.parent?.color || t.category.color || '#94a3b8') + '40'
                                                } : {}}
                                            >
                                                <div className="flex items-center gap-2 truncate">
                                                    <LoadIcon name={t.category?.icon_name || 'Tag'} className="w-3.5 h-3.5" />
                                                    <span className="truncate">{t.category?.name || "Sin Clasificar"}</span>
                                                </div>
                                                <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[240px] p-0 shadow-xl border-slate-200">
                                            <Command>
                                                <CommandInput placeholder="Buscar categoría..." className="h-8 text-xs" />
                                                <CommandList>
                                                    <CommandEmpty>No hay resultados.</CommandEmpty>
                                                    {categories.filter(c => !c.parent_id).map(parent => (
                                                        <CommandGroup key={parent.id} heading={parent.name} className="text-[10px] uppercase font-bold text-slate-400">
                                                            {categories.filter(sub => sub.parent_id === parent.id).map(sub => (
                                                                <CommandItem
                                                                    key={sub.id}
                                                                    value={sub.name}
                                                                    onSelect={() => handleCategoryChange(t.id, sub.id, t.concept)} // 🚨 Pasamos t.concept
                                                                    className="text-xs cursor-pointer"
                                                                >
                                                                    <Check className={cn("mr-2 h-3 w-3", t.category_id === sub.id ? "opacity-100" : "opacity-0")} />
                                                                    {sub.name}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    ))}
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </TableCell>
                                <TableCell className="hidden md:table-cell">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold border"
                                        style={{ backgroundColor: t.account?.color_theme || '#f1f5f9', borderColor: 'rgba(0,0,0,0.1)', color: '#334155' }}>
                                        <LoadIcon name={t.account?.icon_name || 'CreditCard'} className="w-3.5 h-3.5" />
                                        {t.account?.name}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                {/* --- CONTROLES DE PAGINACIÓN --- */}
                <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <p className="text-xs text-slate-500">Mostrando {paginatedTransactions.length} de {filteredTransactions.length} movimientos</p>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center px-4 text-xs font-medium">{currentPage} / {totalPages || 1}</div>
                        <Button variant="outline" size="sm" disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p => p + 1)}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* 🪄 Renderizamos el diálogo de sugerencia mágica si existe */}
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