// app/finance/components/FinanceDashboardView.tsx
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
import { TransactionList } from "./TransactionList"; // Importamos el nuevo componente

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

    const { currentBalance, netWorth } = useMemo(() => {
        // Definimos qué consideramos "Dinero en mano/disponible"
        const currentTypes = ['checking', 'savings', 'credit_card', 'cash'];
        
        // Saldo Corriente (Líquido)
        const current = accounts
            .filter(acc => currentTypes.includes(acc.account_type))
            .reduce((sum, acc) => sum + (Number(acc.current_balance) || 0), 0);

        // Saldo Total (Patrimonio = Corriente + Inversiones + Otros)
        const total = accounts
            .reduce((sum, acc) => sum + (Number(acc.current_balance) || 0), 0);

        return {
            currentBalance: current,
            netWorth: total
        };
    }, [accounts]);

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
            
        {/* --- BLOQUE DE SALDOS --- */}
        <div className="relative overflow-hidden p-6 rounded-[2rem] bg-slate-900 text-white shadow-xl">
            <div className="relative z-10 flex flex-col md:flex-row justify-between gap-8">
                
                {/* Lado Izquierdo: Los dos saldos */}
                <div className="flex flex-col sm:flex-row gap-8 md:gap-16">
                    {/* Saldo Corriente */}
                    <div>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Disponible Corriente</p>
                        <div className="flex items-baseline gap-2">
                            <h2 className="text-2xl md:text-3xl font-mono font-bold tracking-tighter">
                                {isPrivate ? "••••••" : currentBalance.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                            </h2>
                            {!isPrivate && <span className="text-slate-500 text-xs">EUR</span>}
                        </div>
                    </div>

                    {/* Patrimonio Total */}
                    <div className="relative">
                        <div className="absolute -left-4 top-0 bottom-0 w-[1px] bg-white/10 hidden sm:block" />
                        <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Patrimonio Global</p>
                        <div className="flex items-baseline gap-2">
                            <h2 className="text-2xl md:text-3xl font-mono font-bold tracking-tighter text-indigo-100">
                                {isPrivate ? "••••••" : netWorth.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                            </h2>
                            {!isPrivate && <span className="text-slate-500 text-xs">EUR</span>}
                        </div>
                    </div>
                </div>

                {/* Botón de Privacidad */}
                <div className="flex items-center">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setIsPrivate(!isPrivate)}
                        className={cn(
                            "rounded-xl border-white/10 px-4 h-10",
                            isPrivate ? "bg-indigo-600 text-white border-transparent" : "bg-white/5 text-slate-300"
                        )}
                    >
                        {isPrivate ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
                        {isPrivate ? "Revelar" : "Ocultar"}
                    </Button>
                </div>
            </div>
        </div>

            {/* --- ACORDEÓN DE CUENTAS --- */}
            <div className={cn(
                "grid transition-all duration-500",
                !isPrivate ? "grid-rows-[1fr] opacity-100 mb-4" : "grid-rows-[0fr] opacity-0"
            )}>
                <div className="overflow-hidden">
                    <div className="flex overflow-x-auto pb-4 gap-4 snap-x pt-2 scrollbar-thin scrollbar-thumb-slate-200">
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
                                    {isPrivate ? "••••" : (Number(acc.current_balance)).toLocaleString('es-ES', { minimumFractionDigits: 2 })} {acc.currency}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* --- TABLA DE MOVIMIENTOS --- */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <TransactionList 
                accounts={accounts}
                transactions={transactions}
                categories={categories}
                accountFilter={accountFilter}
                onCategoryChange={handleCategoryChange}
                isPrivate={isPrivate}
            />
                
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