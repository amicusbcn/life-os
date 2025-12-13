// app/settings/feedback/FeedbackTableView.tsx (NUEVO ARCHIVO)
'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale'; 
import { CheckCircle2, XCircle,ChevronDown,ArrowDown, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow,} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { ActionResponse } from '@/types/common';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AppFeedback, CATEGORIES_MAP, FeedbackCategory } from '@/types/settings';
import {FeedbackTableViewProps, SortKey, SortOrder, TableState} from "@/types/settings"; 
import { updateFeedbackStatus, updateFeedbackCategory } from '@/app/core/actions';
import { useMemo, useState } from 'react';

// Componente principal de la tabla de feedback

export function FeedbackTableView({ proposals }: FeedbackTableViewProps) {
    const [tableState, setTableState] = useState<TableState>({
        sortBy: 'created_at',
        sortOrder: 'desc', // Por defecto, el más reciente primero
    });

    const handleSort = (key: SortKey) => {
        setTableState(prev => ({
            sortBy: key,
            // Si la columna es la misma, alterna el orden; si no, por defecto es descendente
            sortOrder: prev.sortBy === key && prev.sortOrder === 'desc' ? 'asc' : 'desc',
        }));
    };

    const sortedProposals = useMemo(() => {
        if (!proposals) return [];
        
        // Creamos una copia para no mutar el array original
        return [...proposals].sort((a, b) => {
            let aValue: string | boolean | number;
            let bValue: string | boolean | number;

            // Lógica para acceder a valores anidados
            if (tableState.sortBy === 'profiles.full_name') {
                aValue = a.profiles?.full_name || '';
                bValue = b.profiles?.full_name || '';
            } else if (tableState.sortBy === 'is_processed') {
                aValue = a.is_processed;
                bValue = b.is_processed;
            } else {
                aValue = (a as any)[tableState.sortBy] || ''; // Acceso directo a propiedades de nivel superior
                bValue = (b as any)[tableState.sortBy] || '';
            }

            // Lógica de comparación
            let comparison = 0;
            if (aValue > bValue) comparison = 1;
            else if (aValue < bValue) comparison = -1;

            return tableState.sortOrder === 'desc' ? comparison * -1 : comparison;
        });
    }, [proposals, tableState]);
    
    // Función para mostrar el icono de ordenación
    const SortIcon = ({ sortKey }: { sortKey: SortKey }) => {
        if (tableState.sortBy !== sortKey) return null;
        return tableState.sortOrder === 'desc' 
            ? <ArrowDown className="ml-2 h-4 w-4 text-slate-700" />
            : <ArrowUp className="ml-2 h-4 w-4 text-slate-700" />;
    };
    return (
        <main className="max-w-7xl mx-auto p-4 md:p-8">
            <p className="text-gray-600 mb-6">Revisión de propuestas de mejora y bugs enviados por los usuarios de Life OS.</p>
            
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                <Table className="min-w-full">
                    <TableHeader>
                        <TableRow className="bg-slate-50">
                            {/* 🚨 INTEGRACIÓN DE BOTONES DE ORDENACIÓN EN HEADER */}
                            <TableHead className="w-[120px] cursor-pointer" onClick={() => handleSort('created_at')}>
                                Fecha
                                <SortIcon sortKey='created_at' />
                            </TableHead>
                            <TableHead className="w-[150px] hidden sm:table-cell cursor-pointer" onClick={() => handleSort('context_path')}>
                                Contexto
                                <SortIcon sortKey='context_path' />
                            </TableHead>
                            <TableHead className="w-[180px]">Categoría</TableHead> 
                            <TableHead className="cursor-pointer" onClick={() => handleSort('profiles.full_name')}>
                                Propuesta / Enviado Por
                                <SortIcon sortKey='profiles.full_name' />
                            </TableHead>
                            <TableHead className="w-[80px] text-center hidden md:table-cell cursor-pointer" onClick={() => handleSort('is_processed')}>
                                Estado
                                <SortIcon sortKey='is_processed' />
                            </TableHead>
                            <TableHead className="w-[50px] text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>{(sortedProposals && sortedProposals.length > 0) ? (
                        sortedProposals.map((prop) => (
                            <TableRow key={prop.id} className="align-top">
                                <TableCell className="text-xs text-slate-500">
                                    {format(new Date(prop.created_at), 'dd MMM yy', { locale: es })}
                                    <p className="text-xs font-medium text-slate-700 sm:hidden mt-1"> {/* Mostrar contexto en mobile debajo de la fecha */}
                                        {(prop.context_path ?? '').split('/').pop() || '/'}
                                    </p>
                                </TableCell>
                                
                                <TableCell className="text-sm text-slate-600 hidden sm:table-cell">
                                    {/* Muestra solo la última parte de la ruta para ser conciso */}
                                    <Badge variant="secondary">{(prop.context_path ?? '').split('/').pop() || '/'}</Badge>
                                </TableCell>
                                
                                <TableCell>
                                    <CategoryDropdown 
                                        feedbackId={prop.id} 
                                        currentCategory={prop.type} 
                                    />
                                </TableCell>

                                <TableCell className="text-sm max-w-sm">
                                    {prop.content}
                                    <p className="text-xs text-slate-500 mt-1">Por: {prop.profiles?.full_name || 'N/A'}</p>
                                </TableCell>
                                
                                <TableCell className="text-center hidden md:table-cell">
                                    <Badge 
                                        // ... (clases de estado se mantienen) ...
                                    >
                                        {prop.is_processed ? 'Procesada' : 'Pendiente'}
                                    </Badge>
                                </TableCell>
                                
                                <TableCell className="text-right">
                                    <UpdateStatusButton 
                                        feedbackId={prop.id} 
                                        isProcessed={prop.is_processed} 
                                    />
                                </TableCell>
                            </TableRow>
                        ))): (
                            // 🚨 FILA DE NO HAY PROPUESTAS
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-slate-500 py-10">
                                    No hay propuestas de feedback pendientes.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </main>
    );
}
// ------------------------------------
// NUEVO COMPONENTE: EDICIÓN DE CATEGORÍA
// ------------------------------------

function CategoryDropdown({ feedbackId, currentCategory }: { feedbackId: string, currentCategory: FeedbackCategory }) {
    const router = useRouter();
    const current = CATEGORIES_MAP[currentCategory];

    const handleSelectCategory = (category: FeedbackCategory) => {
        if (category === currentCategory) return;
        
        toast.promise(updateFeedbackCategory(feedbackId, category), {
            loading: 'Cambiando categoría...',
            success: (res: ActionResponse) => { 
                router.refresh(); 
                return res.message || 'Categoría actualizada.'; 
            },
            error: (err: Error) => `Fallo: ${err.message}`, 
        });
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button 
                    variant="outline" 
                    size="sm" 
                    className={`h-7 px-3 text-xs w-full justify-between ${current.color} text-white hover:text-white`} // Clases de color
                >
                    {current.label}
                    <ChevronDown className="ml-2 h-3 w-3" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[200px]">
                {(Object.keys(CATEGORIES_MAP) as FeedbackCategory[]).map((key) => {
                    const category = CATEGORIES_MAP[key];
                    return (
                        <DropdownMenuItem 
                            key={key} 
                            onSelect={() => handleSelectCategory(key)}
                            className={`cursor-pointer ${key === currentCategory ? 'font-bold bg-slate-100' : ''}`}
                        >
                            <div className={`h-2 w-2 rounded-full ${category.color} mr-2`}></div>
                            {category.label}
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
// ------------------------------------
// BOTÓN DE ACCIÓN (Client Component, solo para usar useRouter/toast)
// ------------------------------------

async function handleUpdateStatus(id: string, currentState: boolean) {
    // Esta es la llamada real a la Server Action
    return await updateFeedbackStatus(id, currentState);
}

function UpdateStatusButton({ feedbackId, isProcessed }: { feedbackId: string, isProcessed: boolean }) {
    const router = useRouter(); 

    const handleClick = () => {
        toast.promise(handleUpdateStatus(feedbackId, isProcessed), {
            loading: 'Actualizando estado...',
            success: (res: ActionResponse) => { 
                router.refresh(); 
                return res.message || 'Estado actualizado.'; 
            },
            error: (err: Error) => `Fallo: ${err.message}`, 
        });
    };
    
		return (
				<Button 
						onClick={handleClick} 
						variant="ghost" 
						size="icon" 
						className={`h-8 w-8 transition-colors`}
						title={isProcessed ? "Marcar como Pendiente" : "Marcar como Procesada"}
				>
						{isProcessed ? (
								<XCircle className="h-4 w-4 text-slate-400 hover:text-red-500" /> 
						) : (
								<CheckCircle2 className="h-4 w-4 text-emerald-500 hover:text-emerald-600" />
						)}
				</Button>
		)
}