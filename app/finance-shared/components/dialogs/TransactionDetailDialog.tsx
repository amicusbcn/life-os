'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import LoadIcon from '@/utils/LoadIcon'
import { CheckCircle2, Trash2, Pencil, Users, RefreshCw, AlertTriangle, X } from 'lucide-react'

// Importaciones de tipos y acciones (Asegúrate de que las rutas sean correctas)
import { SharedTransaction, SharedMember, SharedCategory } from '@/types/finance-shared'
import { approveTransaction, markReimbursementPaid, deleteTransaction, updateTransactionCategory, setTransactionContributor } from '@/app/finance-shared/actions'

interface Props {
    transaction: any // Tipado laxo para facilitar integración, o usa tu ExtendedTransaction
    open: boolean
    onClose: () => void
    members: SharedMember[]
    categories: SharedCategory[]
    isAdmin: boolean
    onEdit: () => void // Callback para abrir el formulario de edición completa
}

export function TransactionDetailDialog({ transaction, open, onClose, members, categories, isAdmin, onEdit }: Props) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [selectedCategoryId, setSelectedCategoryId] = useState('')

    // Sincronizar estado local al abrir
    useEffect(() => {
        if (transaction) {
            setSelectedCategoryId(transaction.category_id || 'uncategorized')
        }
    }, [transaction])

    if (!transaction) return null

    // Datos derivados
    const activeCategoryObj = categories.find(c => c.id === selectedCategoryId)
    // Usamos el flag de la categoría para saber si es "Modo Individual" (Aportación, Deuda...)
    const isIndividualMode = activeCategoryObj?.is_individual_assignment || false
    
    // Detectar quién es el contribuidor asignado (si lo hay)
    const currentContributorId = transaction.allocations?.length === 1 ? transaction.allocations[0].member_id : undefined
    const isUnassigned = (!transaction.allocations || transaction.allocations.length === 0)

    // --- ACCIONES RÁPIDAS (Solo Admin) ---

    const handleCategoryChange = async (catId: string) => {
        if (!isAdmin) return
        setSelectedCategoryId(catId) // Optimistic UI
        
        toast.promise(updateTransactionCategory(transaction.id, catId), {
            loading: 'Actualizando...',
            success: 'Categoría guardada',
            error: 'Error al actualizar'
        })
        router.refresh()
    }

    const handleContributorChange = async (memberId: string) => {
        if (!isAdmin) return
        toast.promise(setTransactionContributor(transaction.id, memberId, transaction.amount), {
            loading: 'Reasignando...',
            success: 'Asignado correctamente',
            error: 'Error al asignar'
        })
        router.refresh()
    }

    const handleDelete = async () => {
        if (!confirm('¿Seguro que quieres eliminar este movimiento?')) return
        setLoading(true)
        const res = await deleteTransaction(transaction.id, transaction.group_id)
        if (res.error) toast.error(res.error)
        else { 
            toast.success('Eliminado')
            onClose()
            router.refresh() 
        }
        setLoading(false)
    }

    const handleApprove = async () => {
        setLoading(true)
        const res = await approveTransaction(transaction.id, transaction.group_id)
        if (res.error) toast.error(res.error)
        else { 
            toast.success('Aprobado')
            router.refresh() 
        }
        setLoading(false)
    }

    // Datos visuales
    const isPending = transaction.approval_status === 'pending'
    const isIncome = transaction.type === 'income'
    const sign = isIncome ? '+' : '-'
    const colorClass = isIncome ? 'text-green-600' : 'text-slate-900'

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden bg-white">
                
                {/* HEADER CON COLOR DE CATEGORÍA */}
                <div 
                    className="h-2 w-full"
                    style={{ backgroundColor: activeCategoryObj?.color || '#cbd5e1' }}
                />

                <DialogHeader className="px-6 pt-6 pb-2">
                    <div className="flex items-start gap-4">
                        {/* Icono Grande */}
                        <div 
                            className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-slate-100"
                            style={{ 
                                backgroundColor: activeCategoryObj?.color ? `${activeCategoryObj.color}15` : '#f8fafc',
                                color: activeCategoryObj?.color || '#64748b'
                            }}
                        >
                            <LoadIcon name={activeCategoryObj?.icon_name || 'HelpCircle'} className="h-6 w-6" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <DialogTitle className="text-xl font-bold truncate leading-tight mb-1">
                                {transaction.description}
                            </DialogTitle>
                            <p className="text-sm text-slate-500 font-medium">
                                {new Date(transaction.date).toLocaleDateString()} 
                                <span className="mx-2 text-slate-300">|</span>
                                {transaction.payment_source === 'account' ? 'Cuenta' : transaction.payer?.name}
                            </p>
                        </div>
                    </div>
                </DialogHeader>

                <div className="px-6 py-4 space-y-6">
                    
                    {/* IMPORTE Y ESTADO */}
                    <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <span className={`text-4xl font-bold tracking-tight ${colorClass}`}>
                            {sign}{formatCurrency(transaction.amount)}
                        </span>
                        {transaction.bank_balance !== null && transaction.bank_balance !== undefined && (
                            <span className="text-xs text-slate-400 font-mono mt-1">
                                Saldo: {formatCurrency(transaction.bank_balance)}
                            </span>
                        )}
                        
                        {isPending && (
                            <Badge variant="outline" className="mt-3 bg-amber-50 text-amber-700 border-amber-200">
                                Pendiente de Revisión
                            </Badge>
                        )}
                    </div>

                    {/* SELECTOR DE CATEGORÍA (Solo Admin edita, otros ven texto) */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Categoría</label>
                        {isAdmin ? (
                            <Select value={selectedCategoryId} onValueChange={handleCategoryChange}>
                                <SelectTrigger className="w-full bg-white border-slate-200">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="uncategorized">📁 Sin Categoría</SelectItem>
                                    {categories.map(c => (
                                        <SelectItem key={c.id} value={c.id}>
                                            <div className="flex items-center gap-2">
                                                <LoadIcon name={c.icon_name} className="h-4 w-4 text-slate-400"/>
                                                {c.name}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <div className="flex items-center gap-2 p-2 border rounded-md bg-slate-50 text-sm text-slate-700">
                                <LoadIcon name={activeCategoryObj?.icon_name || 'HelpCircle'} className="h-4 w-4 text-slate-400"/>
                                {activeCategoryObj?.name || 'Sin Categoría'}
                            </div>
                        )}
                    </div>

                    {/* SECCIÓN REPARTO / APORTACIÓN */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Users className="h-3 w-3" />
                            {isIndividualMode ? 'Asignado a' : 'Repartido entre'}
                        </label>

                        {/* A. MODO INDIVIDUAL (Selector para Admin, Texto para resto) */}
                        {isIndividualMode ? (
                            isAdmin ? (
                                <Select value={currentContributorId || ''} onValueChange={handleContributorChange}>
                                    <SelectTrigger className="w-full bg-white border-indigo-200 text-indigo-700">
                                        <SelectValue placeholder="Seleccionar miembro..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {members.map(m => (
                                            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <div className="p-2 border border-indigo-100 bg-indigo-50 rounded-md text-sm text-indigo-800 font-medium">
                                    {members.find(m => m.id === currentContributorId)?.name || 'Sin asignar'}
                                </div>
                            )
                        ) : (
                            /* B. MODO REPARTO (Lista estática) */
                            <div className="bg-white border rounded-lg divide-y max-h-32 overflow-y-auto">
                                {isUnassigned ? (
                                    <div className="p-3 text-sm text-slate-400 text-center italic">Sin asignar</div>
                                ) : (
                                    transaction.allocations?.map((alloc: any) => {
                                        const m = members.find(mem => mem.id === alloc.member_id)
                                        return (
                                            <div key={alloc.member_id} className="p-2 flex justify-between items-center text-sm">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                                        {m?.name.substring(0,2).toUpperCase()}
                                                    </div>
                                                    <span>{m?.name}</span>
                                                </div>
                                                <span className="font-mono text-slate-600">{formatCurrency(alloc.amount)}</span>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        )}
                    </div>

                </div>

                {/* FOOTER DE ACCIONES */}
                {/* Si NO es Admin, ocultamos el footer completamente (ya tiene la X arriba) */}
                {isAdmin && (
                    <DialogFooter className="bg-slate-50 p-4 gap-2 sm:justify-between flex-col-reverse sm:flex-row border-t">
                        
                        {/* Botón Borrar (Izquierda) */}
                        <div className="flex-1 sm:flex-none">
                            <Button variant="ghost" onClick={handleDelete} className="text-red-500 hover:text-red-700 hover:bg-red-50 w-full sm:w-auto">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Botones Derecha */}
                        <div className="flex gap-2 w-full sm:w-auto justify-end">
                            <Button variant="outline" onClick={() => { onClose(); onEdit() }}>
                                <Pencil className="mr-2 h-4 w-4" /> Editar
                            </Button>

                            {isPending && (
                                <Button onClick={handleApprove} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white">
                                    <CheckCircle2 className="mr-2 h-4 w-4" /> Aprobar
                                </Button>
                            )}
                        </div>
                    </DialogFooter>
                )}
                
                {/* Opcional: Si quieres mantener el footer para todos pero sin el botón cerrar duplicado */}
                {/* Simplemente eliminamos el bloque {!isAdmin && <Button>Cerrar</Button>} */}

            </DialogContent>
        </Dialog>
    )
}