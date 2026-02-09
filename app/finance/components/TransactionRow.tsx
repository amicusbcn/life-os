'use client'

import React from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { FinanceTransaction, FinanceCategory, FinanceAccount } from '@/types/finance';
import { AccountAvatar } from './AccountAvatar';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Plane, Link2, Boxes, ArrowRight, Split, ChevronsUpDown, MoreVertical, Pencil, Package, Check, Link2Off } from 'lucide-react';
import LoadIcon from '@/utils/LoadIcon';
import Link from 'next/link';
import { cn } from "@/lib/utils";
import { TransactionSplitDialog } from "./TransactionSplitDialog";

interface Props {
    transaction: FinanceTransaction;
    categories: FinanceCategory[];
    accounts: FinanceAccount[];
    showOriginalConcepts: boolean;
    isExpanded: boolean;
    onToggleExpand: (id: string) => void;
    onCategorySelect: (t: FinanceTransaction, catId: string) => void;
    onUnlinkClick: (t: FinanceTransaction) => void;
    onEditNote: (t: FinanceTransaction) => void;
    onInventoryClick: (t: FinanceTransaction) => void;
    isPrivate?: boolean;
}

export const TransactionRow = ({ 
    transaction: t, 
    categories, 
    accounts, 
    showOriginalConcepts, 
    isExpanded, 
    onToggleExpand,
    onCategorySelect,
    onUnlinkClick,
    onEditNote,
    onInventoryClick,
    isPrivate 
}: Props) => {
    const cat = categories.find((c) => c.id === t.category_id);
    const parentCat = cat?.parent_id ? categories.find((pc) => pc.id === cat.parent_id) : null;
    const displayColor = parentCat?.color || cat?.color || "#94a3b8";
    const account = accounts.find(a => a.id === t.account_id);

    return (
        <React.Fragment>
            <TableRow className="group hover:bg-slate-50/50">
                {/* FECHA */}
                <TableCell className="text-xs text-slate-500 font-medium">
                    {new Date(t.date).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                </TableCell>

                {/* CONCEPTO Y BADGES */}
                <TableCell className="font-medium" onClick={() => t.is_split && onToggleExpand(t.id)}>
                    <div className="flex items-center gap-3 truncate max-w-[400px]">
                        {account && <AccountAvatar account={account} className="h-6 w-6 text-[9px]" />}
                        <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                                <span className={cn(
                                    "text-sm block truncate",
                                    !showOriginalConcepts && t.notes ? "font-bold text-slate-900" : "font-medium text-slate-600"
                                )}>
                                    {showOriginalConcepts ? t.concept : (t.notes || t.concept)}
                                </span>
                                {t.transfer_id && <Badge className="bg-amber-100 text-amber-700 text-[8px]">VINCULADA</Badge>}
                                {t.travel_expense_id && <Badge className="bg-indigo-100 text-indigo-700 text-[8px]">VIAJE</Badge>}
                                {t.is_split && <Badge variant="secondary" className="text-[9px]">SPLIT</Badge>}
                            </div>
                        </div>
                    </div>
                </TableCell>

                {/* IMPORTE */}
                <TableCell className={cn("text-right font-mono font-bold", t.amount >= 0 ? "text-green-600" : "text-slate-900")}>
                    {t.amount.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €
                </TableCell>

                {/* CATEGORÍA SELECTOR */}
                <TableCell>
                    {!t.is_split ? (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 w-full justify-between text-xs font-bold border-transparent" 
                                    style={{ backgroundColor: displayColor + "15", color: displayColor, borderLeft: `3px solid ${displayColor}` }}>
                                    <div className="flex items-center gap-2 truncate text-left">
                                        <LoadIcon name={cat?.icon_name || "Tag"} size={14} />
                                        <span className="truncate">{cat?.name || "Pendiente"}</span>
                                    </div>
                                    <ChevronsUpDown className="h-3 w-3 opacity-50 shrink-0" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[280px] p-0 border-slate-700 bg-slate-900 z-[100]">
                                {t.travel_expense_id ? (
                                    <div className="p-3 space-y-3 italic text-[11px] text-slate-400">
                                        <Button onClick={() => onUnlinkClick(t)} variant="ghost" className="w-full justify-start text-rose-400 h-10">
                                            <Link2Off className="mr-2 h-4 w-4" /> Desvincular de Viaje
                                        </Button>
                                    </div>
                                ) : (
                                    <Command className="bg-slate-900 text-white">
                                        <CommandInput placeholder="Buscar categoría..." className="text-white border-none focus:ring-0" />
                                        <CommandList className="max-h-[300px] overflow-y-auto">
                                            <CommandEmpty className="py-4 text-center text-xs text-slate-500 font-bold uppercase">Sin resultados</CommandEmpty>
                                            
                                            {/* Acción para resetear a pendiente */}
                                            <CommandGroup>
                                                <CommandItem 
                                                    onSelect={() => onCategorySelect(t, 'pending')}
                                                    className="text-[10px] font-black uppercase text-rose-400 hover:bg-slate-800 cursor-pointer"
                                                >
                                                    <Check className={cn("mr-2 h-3 w-3", t.category_id === 'pending' ? "opacity-100" : "opacity-0")} />
                                                    Marcar como Pendiente
                                                </CommandItem>
                                            </CommandGroup>

                                            {/* Mapeo Jerárquico de Categorías */}
                                            {categories.filter(c => !c.parent_id).map(parent => (
                                                <CommandGroup 
                                                    key={parent.id} 
                                                    heading={parent.name.toUpperCase()}
                                                    className="text-[9px] text-slate-500 font-black px-2 pt-3"
                                                >
                                                    <CommandItem
                                                        onSelect={() => onCategorySelect(t, parent.id)}
                                                        className="text-[11px] font-bold text-indigo-400 hover:bg-slate-800 cursor-pointer"
                                                    >
                                                        <Check className={cn("mr-2 h-3 w-3", t.category_id === parent.id ? "opacity-100" : "opacity-0")} />
                                                        {parent.name} (General)
                                                    </CommandItem>
                                                    
                                                    {categories.filter(sub => sub.parent_id === parent.id).map(sub => (
                                                        <CommandItem
                                                            key={sub.id}
                                                            onSelect={() => onCategorySelect(t, sub.id)}
                                                            className="text-[11px] pl-8 text-slate-300 hover:bg-slate-800 cursor-pointer"
                                                        >
                                                            <Check className={cn("mr-2 h-3 w-3", t.category_id === sub.id ? "opacity-100" : "opacity-0")} />
                                                            {sub.name}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            ))}
                                        </CommandList>
                                    </Command>
                                )}
                            </PopoverContent>
                        </Popover>
                    ) : (
                        <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-100 text-slate-400 text-[10px] font-black uppercase italic justify-center">
                            <Split className="h-3 w-3" /> Ver desglose
                        </div>
                    )}
                </TableCell>

                {/* ACCIONES (Puntos verticales) */}
                <TableCell className="text-right">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full">
                                <MoreVertical className="h-4 w-4 text-slate-500" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-52 p-2 bg-slate-900 border-slate-800" align="end">
                            <Button variant="ghost" className="w-full justify-start text-xs text-slate-200 h-9" onClick={() => onEditNote(t)}>
                                <Pencil className="mr-2 h-4 w-4 text-indigo-400" /> Editar nota (Alias)
                            </Button>
                            <TransactionSplitDialog transaction={t} categories={categories} accounts={accounts} />
                            <Button variant="ghost" className="w-full justify-start text-xs text-slate-200 h-9" onClick={() => onInventoryClick(t)}>
                                <Package className="mr-2 h-4 w-4 text-emerald-400" /> Subir al inventario
                            </Button>
                        </PopoverContent>
                    </Popover>
                </TableCell>
            </TableRow>

            {/* FILAS DE DESGLOSE (Hijas) */}
            {t.is_split && isExpanded && t.splits?.map((s) => {
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
};