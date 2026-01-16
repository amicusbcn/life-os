'use client'

import { useState,useEffect } from 'react'
import { SharedTransaction, SharedMember, SharedCategory } from '@/types/finance-shared'
import { approveTransaction, markReimbursementPaid, deleteTransaction, updateTransactionCategory, setTransactionContributor } from '@/app/finance-shared/actions'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import LoadIcon from '@/utils/LoadIcon'
import { CheckCircle2, Trash2, ArrowRightLeft, Users, Pencil, RefreshCw, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

// ID ESPECIAL DE APORTACIÓN
const CONTRIBUTION_CAT_ID = '8bd98f3f-9c28-4ebf-90ba-219087f5548e'

interface ExtendedTransaction extends Omit<SharedTransaction, 'allocations'> {
    payer?: { name: string } | null
    category?: { name: string, icon_name: string, color?: string } | null
    allocations?: { member_id: string, amount: number }[]
    category_id?:string | null
}

interface Props {
    transaction: ExtendedTransaction | null
    open: boolean
    onClose: () => void
    members: SharedMember[]
    categories: SharedCategory[] // <--- NECESITAMOS CATEGORÍAS AHORA
    isAdmin: boolean
    onEdit: () => void
}

export function TransactionDetailDialog({ transaction, open, onClose, members, categories, isAdmin, onEdit }: Props) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [selectedCategoryId, setSelectedCategoryId] = useState(transaction?.category_id || 'uncategorized')

    useEffect(() => {
        if (transaction) {
            setSelectedCategoryId(transaction.category_id || 'uncategorized')
        }
    }, [transaction])

    if (!transaction) return null

    const activeCategoryObj = categories.find(c => c.id === selectedCategoryId) // <--- CORRECCIÓN
    const isIndividualMode = activeCategoryObj?.is_individual_assignment || false // <--- CORRECCIÓN
    
    // Handlers existentes (Approve, Reimburse, Delete...) se mantienen igual
    const handleApprove = async () => { /* ... código anterior ... */ }
    const handleReimburse = async () => { /* ... código anterior ... */ }
    const handleDelete = async () => {
        if (!confirm('¿Seguro?')) return
        setLoading(true)
        const res = await deleteTransaction(transaction.id, transaction.group_id)
        if (res.error) toast.error(res.error)
        else { toast.success('Eliminado'); onClose(); router.refresh() }
        setLoading(false)
    }

    // --- NUEVOS HANDLERS ---
    
    const handleCategoryChange = async (catId: string) => {
        // 1. Actualización visual inmediata (Optimistic UI)
        setSelectedCategoryId(catId) 

        // 2. Actualización en servidor
        toast.promise(updateTransactionCategory(transaction.id, catId), {
            loading: 'Actualizando...',
            success: 'Categoría guardada',
            error: 'Error al cambiar categoría'
        })
        router.refresh()
    }

    const handleContributorChange = async (memberId: string) => {
        toast.promise(setTransactionContributor(transaction.id, memberId, transaction.amount), {
            loading: 'Reasignando aportación...',
            success: 'Aportación asignada',
            error: 'Error al asignar'
        })
        router.refresh()
    }

    // Datos visuales
    const isPending = transaction.approval_status === 'pending'
    const needsReimbursement = transaction.reimbursement_status === 'pending'
    const isIncome = transaction.type === 'income'
    const sign = isIncome ? '+' : '-'
    const colorClass = isIncome ? 'text-green-600' : 'text-slate-900'
    
    // Detectar si es la categoría especial
    const isContribution = transaction.category_id === CONTRIBUTION_CAT_ID
    
    // Buscar quién hace la aportación (el único allocation)
    const contributorId = isContribution && transaction.allocations?.length === 1 
        ? transaction.allocations[0].member_id 
        : undefined
    const isUnassigned = (!transaction.allocations || transaction.allocations.length === 0) || (isIndividualMode && !contributorId)
    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        {/* Icono dinámico según categoría seleccionada */}
                        <div 
                            className="h-10 w-10 rounded-full flex items-center justify-center border transition-colors"
                            style={{ 
                                backgroundColor: transaction.category?.color ? `${transaction.category.color}20` : '#f1f5f9',
                                color: transaction.category?.color || '#64748b'
                            }}
                        >
                            <LoadIcon name={transaction.category?.icon_name || 'HelpCircle'} className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                            <DialogTitle className="text-lg line-clamp-1">{transaction.description}</DialogTitle>
                            <p className="text-xs text-muted-foreground">{new Date(transaction.date).toLocaleDateString()}</p>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-4">
                    {/* IMPORTE */}
                    <div className="text-center py-4 bg-slate-50 rounded-lg border border-slate-100 relative">
                        <span className={`text-3xl font-bold ${colorClass}`}>
                            {sign}{formatCurrency(transaction.amount)}
                        </span>
                         {transaction.bank_balance !== undefined && transaction.bank_balance !== null && (
                            <div className="text-xs text-slate-400 mt-1 font-mono">
                                Saldo: {formatCurrency(transaction.bank_balance)}
                            </div>
                        )}
                        <div className="flex justify-center gap-2 mt-2">
                            {isPending && <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Pendiente</Badge>}
                            {needsReimbursement && <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">Reembolso</Badge>}
                        </div>
                    </div>

                    {/* DATOS CAMBIABLES */}
                    <div className="text-sm space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500 w-1/3">Origen:</span>
                            <span className="font-medium text-right flex-1">
                                {transaction.payment_source === 'account' 
                                    ? '🏦 Movimiento Cuenta'  // <--- CAMBIO 1
                                    : `👤 ${transaction.payer?.name || 'Miembro'}`}
                            </span>
                        </div>
                        
                        {/* CAMBIO 2: SELECTOR DE CATEGORÍA */}
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500 w-1/3">Categoría:</span>
                            <div className="flex-1">
                                <Select 
                                    value={selectedCategoryId}
                                    defaultValue={transaction.category_id || 'uncategorized'} 
                                    onValueChange={handleCategoryChange}
                                    disabled={!isAdmin} // Solo admin cambia categorías rápido
                                >
                                    <SelectTrigger className="h-8 text-xs w-full justify-between">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent align="end">
                                        <SelectItem value="uncategorized">📁 Sin Categoría</SelectItem>
                                        {categories.map(c => (
                                            <SelectItem key={c.id} value={c.id}>
                                                <span className="flex items-center gap-2">
                                                    <LoadIcon name={c.icon_name} className="h-3 w-3"/> {c.name}
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-slate-100 my-4" />

                        {/* REPARTO O APORTACIÓN */}
                        <div>
                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                                <Users className="h-3 w-3"/> 
                                {isIndividualMode ? 'Aportado por' : 'Reparto del gasto'}
                            </h4>

                            {/* CAMBIO 3: LÓGICA ESPECIAL APORTACIÓN */}
                            <div>

                                {/* CASO A: ESTÁ SIN ASIGNAR (Importado) */}
                                {isUnassigned && !isIndividualMode && (
                                    <div className="bg-red-50 p-3 rounded-lg border border-red-100 text-center space-y-3">
                                        <p className="text-xs text-red-600 font-medium">
                                            <AlertTriangle className="h-3 w-3 inline mr-1"/>
                                            Este movimiento no afecta al saldo de nadie todavía.
                                        </p>
                                        {isAdmin && (
                                            <Button 
                                                size="sm" 
                                                variant="outline" 
                                                className="w-full bg-white border-red-200 text-red-700 hover:bg-red-50"
                                                onClick={() => { onClose(); onEdit() }} // Mandamos a editar para repartir bien
                                            >
                                                Repartir ahora
                                            </Button>
                                        )}
                                    </div>
                                )}

                                {/* CASO B: MODO INDIVIDUAL (Aportaciones/Deudas) */}
                                {isIndividualMode && (
                                    <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                                        <div className="flex items-center gap-2 mb-2">
                                            <RefreshCw className="h-3 w-3 text-indigo-600" />
                                            <span className="text-xs text-indigo-800 font-medium">
                                                {activeCategoryObj?.name || 'Asignación Única'}
                                            </span>
                                        </div>
                                        <Select 
                                            value={contributorId} 
                                            onValueChange={handleContributorChange} // Usamos la action que creamos antes
                                            disabled={!isAdmin}
                                        >
                                            <SelectTrigger className="bg-white border-indigo-200">
                                                <SelectValue placeholder="Seleccionar miembro..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {members.map(m => (
                                                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {/* CASO C: REPARTO ESTÁNDAR (Si ya está asignado) */}
                                {!isUnassigned && !isIndividualMode && (
                                    // LISTA ESTÁNDAR DE REPARTO
                                    <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2">
                                        {transaction.allocations?.map(alloc => {
                                            const memberName = members.find(m => m.id === alloc.member_id)?.name || '...'
                                            return (
                                                <div key={alloc.member_id} className="flex justify-between items-center text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                                            {memberName.substring(0,2).toUpperCase()}
                                                        </div>
                                                        <span>{memberName}</span>
                                                    </div>
                                                    <span className="font-medium text-slate-700">
                                                        {formatCurrency(alloc.amount)}
                                                    </span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex-col sm:justify-between gap-2 border-t pt-4 mt-2">
                    {/* ... (Botones Editar, Aprobar, etc. - Copiar del anterior) ... */}
                    {isAdmin && (
                        <div className="grid grid-cols-2 gap-2 w-full">
                            <Button variant="outline" onClick={() => { onClose(); onEdit() }} className="col-span-2 border-dashed">
                                <Pencil className="mr-2 h-4 w-4" /> Editar Completo
                            </Button>
                            {/* ... Resto de botones igual ... */}
                             <Button variant="destructive" onClick={handleDelete} className="col-span-2">
                                <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                            </Button>
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}