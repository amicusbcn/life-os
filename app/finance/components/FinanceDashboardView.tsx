'use client'

import React from 'react';
import { FinanceAccount, FinanceCategory, FinanceTransaction } from '@/types/finance';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, Tag, Banknote, ListChecks, Split } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'; // Asumiendo esta ruta

interface FinanceDashboardViewProps {
    accounts: FinanceAccount[];
    categories: FinanceCategory[];
    transactions: FinanceTransaction[];
}

export function FinanceDashboardView({ transactions }: FinanceDashboardViewProps) {
    
    // Función de ayuda para formatear la fecha
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    return (
        <div className="mt-8 bg-white p-6 rounded-xl shadow border border-slate-200">
            <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center">
                <ListChecks className="w-5 h-5 mr-2 text-indigo-600"/> Últimos 100 Movimientos
            </h2>

            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50 hover:bg-slate-50/80">
                            <TableHead className="w-[100px] text-slate-600">Fecha</TableHead>
                            <TableHead className="text-slate-600">Concepto</TableHead>
                            <TableHead className="w-[120px] text-slate-600 text-right">Importe</TableHead>
                            <TableHead className="w-[150px] text-slate-600">Categoría</TableHead>
                            <TableHead className="w-[150px] text-slate-600">Cuenta</TableHead>
                            <TableHead className="w-[80px] text-slate-600">Split</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {transactions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                                    No hay transacciones. ¡Importa tu primer archivo C43!
                                </TableCell>
                            </TableRow>
                        ) : (
                            transactions.map((t) => (
                                <TableRow key={t.id} className="text-sm">
                                    <TableCell className="font-medium text-slate-700 whitespace-nowrap">
                                        {formatDate(t.date)}
                                    </TableCell>
                                    <TableCell className="text-slate-700 truncate max-w-xs">
                                        {t.concept}
                                    </TableCell>
                                    <TableCell className={`font-semibold text-right whitespace-nowrap ${t.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {t.amount.toFixed(2)} {t.account?.currency || '€'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge 
                                            variant="secondary" 
                                            className={`font-normal ${t.category?.is_income ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                                        >
                                            {t.category?.name || 'Sin Categoría'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-slate-500">
                                        {t.account?.name || 'N/A'}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {t.is_split && (
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Split 
                                                            className="h-4 w-4 text-indigo-500 mx-auto cursor-pointer" 
                                                            aria-label="Movimiento Desglosado" // Mantenemos accesibilidad
                                                        />
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        Movimiento Desglosado
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="mt-4 text-center text-sm text-slate-500">
                Mostrando las {transactions.length} transacciones más recientes.
            </div>
        </div>
    );
}