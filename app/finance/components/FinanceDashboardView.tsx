'use client'

import React, { useState, useMemo } from 'react';
import { FinanceAccount } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { 
    Copy, ArrowUpRight, Eye, EyeOff, Wallet, 
    Landmark, TrendingUp, CreditCard, ChevronDown, Banknote
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { cn } from "@/lib/utils";
import LoadIcon from '@/utils/LoadIcon';
import { AccountSettingsDialog } from './AccountSettingsDialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function FinanceDashboardView({ initialAccounts, templates }: { initialAccounts: FinanceAccount[], templates: any[] }) {
    const [isPrivate, setIsPrivate] = useState(true);

    // Lógica de Saldos
    const { currentBalance, netWorth } = useMemo(() => {
        const liquidTypes = ['checking', 'savings', 'credit_card', 'cash'];
        const current = initialAccounts
            .filter(acc => liquidTypes.includes(acc.account_type))
            .reduce((sum, acc) => sum + (Number(acc.current_balance) || 0), 0);
        
        const total = initialAccounts.reduce((sum, acc) => sum + (Number(acc.current_balance) || 0), 0);
        
        return { currentBalance: current, netWorth: total };
    }, [initialAccounts]);

    // Agrupación para los acordeones
    const groupedAccounts = useMemo(() => {
        return {
            checking: { label: 'Disponibilidad y Efectivo', icon: 'Wallet', list: initialAccounts.filter(a => a.account_type === 'checking' || a.account_type === 'cash') },
            credit_card: { label: 'Tarjetas de Crédito', icon: 'CreditCard', list: initialAccounts.filter(a => a.account_type === 'credit_card') },
            savings: { label: 'Ahorro y Reserva', icon: 'Landmark', list: initialAccounts.filter(a => a.account_type === 'savings') },
            investment: { label: 'Inversión y Activos', icon: 'TrendingUp', list: initialAccounts.filter(a => a.account_type === 'investment') },
            loan: { label: 'Préstamos y Deudas', icon: 'Banknote', list: initialAccounts.filter(a => a.account_type === 'loan') },
        };
    }, [initialAccounts]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("IBAN copiado");
    };

    return (
        <div className="space-y-8 pb-20">
            {/* --- BLOQUE DESTACADO: SALDO CORRIENTE (DARK) --- */}
            <div className="relative overflow-hidden p-8 rounded-[2.5rem] bg-slate-900 text-white shadow-2xl border border-white/5">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex flex-col sm:flex-row gap-12 text-center md:text-left">
                        <div>
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Disponible Real</p>
                            <h2 className="text-5xl font-mono font-bold tracking-tighter italic text-indigo-400">
                                {isPrivate ? "••••••" : currentBalance.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                            </h2>
                        </div>
                        <div className="relative md:pl-12 md:border-l border-white/10">
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Patrimonio Neto</p>
                            <h2 className="text-3xl font-mono font-bold tracking-tighter text-slate-300">
                                {isPrivate ? "••••••" : netWorth.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                            </h2>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <AccountSettingsDialog initialAccounts={initialAccounts} templates={templates}>
                            <Button variant="outline" className="rounded-2xl bg-white/5 border-white/10 hover:bg-white/10 h-12 px-6 uppercase font-black text-[10px] tracking-widest text-slate-300">
                                Ajustes
                            </Button>
                        </AccountSettingsDialog>
                        <Button variant="outline" onClick={() => setIsPrivate(!isPrivate)} className="rounded-2xl bg-white/5 border-white/10 w-12 h-12 p-0">
                            {isPrivate ? <Eye size={18} /> : <EyeOff size={18} />}
                        </Button>
                    </div>
                </div>
                {/* Decoración sutil de fondo */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-32 -mt-32 blur-3xl" />
            </div>

            {/* --- ACORDEONES POR GRUPO --- */}
            <Accordion type="multiple" defaultValue={['checking', 'savings']} className="space-y-4">
                {Object.entries(groupedAccounts).map(([key, group]) => (
                    group.list.length > 0 && (
                        <AccordionItem key={key} value={key} className="border-none bg-slate-50/50 rounded-[2rem] px-6 overflow-hidden">
                            <AccordionTrigger className="hover:no-underline py-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-white rounded-xl shadow-sm text-slate-600">
                                        <LoadIcon name={group.icon} size={20} />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">{group.label}</h3>
                                        <p className="text-[10px] font-bold text-indigo-500/70 font-mono">
                                            {isPrivate ? "•••" : group.list.reduce((s, a) => s + Number(a.current_balance), 0).toLocaleString('es-ES')} €
                                        </p>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pb-8">
                                <div className="flex flex-wrap gap-4 pt-2">
                                    {group.list.map((acc) => (
                                        <div 
                                            key={acc.id} 
                                            className={cn(
                                                "group flex flex-col p-6 rounded-[2.2rem] border-2 transition-all duration-300 min-w-[280px] flex-1",
                                                acc.is_active ? "shadow-sm bg-white" : "opacity-50 grayscale border-dashed bg-slate-50"
                                            )}
                                            style={{ 
                                                backgroundColor: acc.is_active ? acc.color_theme + '15' : undefined, 
                                                borderColor: acc.is_active ? acc.color_theme + '30' : undefined
                                            }}
                                        >
                                            {/* FILA SUPERIOR: IDENTIDAD */}
                                            <div className="flex items-start justify-between mb-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 bg-white rounded-2xl shadow-sm text-slate-700" style={{ color: acc.color_theme }}>
                                                        <LoadIcon name={acc.icon_name || 'Bank'} size={22} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="font-black text-base text-slate-800 uppercase italic tracking-tighter truncate leading-none mb-1.5">
                                                            {acc.name}
                                                        </h4>
                                                        {acc.account_number && (
                                                            <TooltipProvider>
                                                                <Tooltip delayDuration={300}>
                                                                    <TooltipTrigger asChild>
                                                                        <button 
                                                                            onClick={(e) => { e.stopPropagation(); copyToClipboard(acc.account_number!); }}
                                                                            className="text-[9px] font-mono text-slate-400 hover:text-indigo-600 transition-colors flex items-center gap-1.5"
                                                                        >
                                                                            {acc.account_number.replace(/(.{4})/g, '$1 ')}
                                                                            <Copy size={9} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                        </button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent className="bg-slate-900 text-white text-[10px] font-bold uppercase">Copiar IBAN</TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* FILA INFERIOR: SALDO Y ACCIÓN */}
                                            <div className="flex items-end justify-between mt-auto">
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 ml-1">Saldo Disponible</span>
                                                    <p className="text-3xl font-mono font-bold text-slate-900 tracking-tighter italic leading-none">
                                                        {isPrivate ? "••••" : Number(acc.current_balance).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                                                        <span className="text-xs ml-1 font-black text-slate-400">€</span>
                                                    </p>
                                                </div>

                                                <TooltipProvider>
                                                    <Tooltip delayDuration={300}>
                                                        <TooltipTrigger asChild>
                                                            <Link 
                                                                href={`/finance/transactions/${acc.slug}`}
                                                                className="h-9 w-9 rounded-full bg-white flex items-center justify-center text-slate-900 shadow-sm hover:bg-slate-900 hover:text-white transition-all shrink-0 active:scale-95 border border-slate-100"
                                                            >
                                                                <ArrowUpRight size={16} />
                                                            </Link>
                                                        </TooltipTrigger>
                                                        <TooltipContent className="bg-slate-900 text-white text-[10px] font-bold uppercase">Movimientos</TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    )
                ))}
            </Accordion>
        </div>
    );
}