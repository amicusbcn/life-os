'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { formatCurrency, cn } from '@/lib/utils'
import LoadIcon from '@/utils/LoadIcon'
import { 
    CheckCircle2, Trash2, Pencil, Users, Lock, 
    ChevronLeft, ChevronRight, MessageSquare, ArrowRightLeft, Clock, AlertCircle, 
    User
} from 'lucide-react'

import { SharedMember, SharedCategory, SharedAccount } from '@/types/finance-shared'
import { 
    approveTransaction, 
    deleteTransaction, 
    updateTransactionCategory, 
    setTransactionContributor,
    updateTransactionSplitMode, // Necesitarás crear esta acción o usar una genérica
    upsertSharedTransaction
} from '@/app/finance-shared/actions'

interface Props {
    transaction: any
    open: boolean
    onClose: () => void
    members: SharedMember[]
    categories: SharedCategory[]
    accounts: SharedAccount[]
    isAdmin: boolean
    onEdit: () => void
    onNext?: () => void // Para navegación
    onPrev?: () => void // Para navegación
    splitTemplates: any[]
    defaultAccountId?: string
    mainBankAccountId?:string
}

export function TransactionDetailDialog({ 
    transaction: initialTransaction, // Renombramos la prop para evitar conflictos
    open, onClose, members, categories, accounts,
    isAdmin, onEdit, onNext, onPrev, splitTemplates, defaultAccountId, mainBankAccountId
}: Props) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    
    // 1. ESTADO MAESTRO LOCAL
    const [localTx, setLocalTx] = useState(initialTransaction)

    // 2. TUS ESTADOS ACTUALES (Ahora se sincronizan con localTx)
    const [selectedCategoryId, setSelectedCategoryId] = useState('')
    const [contributorId, setContributorId] = useState<string>('')

    // 3. EFECTO DE SINCRONIZACIÓN (Cuando cambia la prop o el estado local)
    useEffect(() => {
        if (initialTransaction) {
            setLocalTx(initialTransaction)
        }
    }, [initialTransaction])

    useEffect(() => {
        if (localTx) {
            setSelectedCategoryId(localTx.category_id || (localTx.type === 'transfer' ? 'transfer' : 'uncategorized'))
            const currentCId = localTx.allocations?.length === 1 ? localTx.allocations[0].member_id : ''
            setContributorId(currentCId)
        }
    }, [localTx])

    if (!localTx) return null

    // --- LÓGICA DE ESTADOS (Punto 6) ---
    const isPending = localTx.status === 'pending' || localTx.approval_status === 'pending'
    const isUnassigned = (!localTx.allocations || localTx.allocations.length === 0)
    const isMainAccount = localTx.account_id === mainBankAccountId

    const getStatusBadge = () => {
        if (isPending) return <Badge className="bg-amber-100 text-amber-700 border-amber-200"><Clock className="w-3 h-3 mr-1"/> Pendiente Validar</Badge>
        if (isUnassigned && localTx.type !== 'transfer') return <Badge className="bg-rose-100 text-rose-700 border-rose-200"><AlertCircle className="w-3 h-3 mr-1"/> Sin Repartir</Badge>
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200"><CheckCircle2 className="w-3 h-3 mr-1"/> Validado</Badge>
    }

    // --- ACCIONES ---
    const handleQuickUpdate = async (updates: any) => {
        if (!isAdmin) return;
        setLoading(true)

        // Combinamos todo: lo que tiene la tx + los cambios
        const payload = {
            ...localTx,
            ...updates
        };
        const res = await upsertSharedTransaction(localTx.group_id, payload)

        if (res.error) {
            toast.error(res.error)
        } else {
            // ACTUALIZACIÓN DE LA UI SIN ESPERAR AL SERVER
            // Si el servidor te devuelve la data completa con allocations, úsala:
            if (res.data) {
                setLocalTx(res.data) 
            } else {
                // Si no, mergeamos manual para que al menos el Select se mueva
                setLocalTx((prev: any) => ({ ...prev, ...updates }))
            }
            
            router.refresh()
            toast.success('Cambio guardado')
        }
        setLoading(false)
    };

    const handleDelete = async () => {
        if (!confirm('¿Seguro que quieres eliminar este movimiento?')) return
        setLoading(true)
        const res = await deleteTransaction(localTx.id, localTx.group_id)
        if (res.error) toast.error(res.error)
        else { 
            toast.success('Eliminado')
            onClose()
            router.refresh() 
        }
        setLoading(false)
    }

    // --- LÓGICA DE NAVEGACIÓN (Punto 7) ---
    // Estas funciones se activan con las flechas superiores
    const handlePrev = () => {
        if (onPrev) onPrev()
    }

    const handleNext = () => {
        if (onNext) onNext()
    }

    const handleTemplateChange = async (templateId: string) => {
        if (templateId === 'manual') {
            onClose(); // Cerramos el detalle
            onEdit();  // Abrimos el formulario de edición completa
            return;
        }

        // Si es una plantilla, usamos nuestra acción maestra
        // El servidor detectará el split_template_id y recalculará todo
        await handleQuickUpdate({ 
            split_template_id: templateId,
            type: 'expense' // Al aplicar plantilla nos aseguramos de que no sea transfer
        });
    }
    // --- RENDERING ---

    const activeCategoryObj = categories.find(c => c.id === selectedCategoryId)
    const isIndividualMode = activeCategoryObj?.is_individual_assignment || false

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden bg-white shadow-2xl border-none">
                
                {/* NAVEGACIÓN SUPERIOR (Punto 7) */}
                <div className="absolute top-4 right-12 flex gap-1 z-50">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white/80 backdrop-blur" onClick={onPrev} disabled={!onPrev}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white/80 backdrop-blur" onClick={onNext} disabled={!onNext}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                <div className="h-1.5 w-full" style={{ backgroundColor: activeCategoryObj?.color || '#cbd5e1' }} />

                <DialogHeader className="px-6 pt-8 pb-4">
                    <div className="flex items-start gap-4">
                        <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner border border-slate-100 bg-slate-50">
                            <LoadIcon name={activeCategoryObj?.icon_name || 'HelpCircle'} className="h-7 w-7" style={{ color: activeCategoryObj?.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <DialogTitle className="text-xl font-bold truncate tracking-tight">
                                    {localTx.description}
                                </DialogTitle>
                                {isMainAccount && <Lock className="h-3.5 w-3.5 text-slate-400" />}
                            </div>
                            {/* Punto 2: Nota bajo el concepto */}
                            {localTx.notes && (
                                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1 italic">
                                    <MessageSquare className="h-3 w-3" /> {localTx.notes}
                                </p>
                            )}
                        </div>
                    </div>
                </DialogHeader>

                <div className="px-6 py-2 space-y-5">
                    {/* IMPORTE Y BADGES (Punto 6) */}
                    <div className="flex flex-col items-center p-6 bg-slate-50 rounded-2xl border border-slate-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2">{getStatusBadge()}</div>
                        <span className={cn("text-4xl font-black tracking-tighter", localTx.amount < 0 || localTx.type === 'expense' ? 'text-slate-900' : 'text-emerald-600')}>
                            {formatCurrency(localTx.amount)}
                        </span>
                        <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mt-2">
                            {new Date(localTx.date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>

                    {/* SELECTOR CATEGORÍA */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Categoría</label>
                            {isAdmin ? (
                                <Select 
                                    value={selectedCategoryId} 
                                    onValueChange={(catId) => {
                                        setSelectedCategoryId(catId);
                                        
                                        if (catId === 'transfer') {
                                            // CONVERSIÓN A TRASPASO
                                            handleQuickUpdate({ 
                                                category_id: null, 
                                                type: 'transfer',
                                                allocations: [], // Las transferencias no llevan reparto
                                                // No tocamos transfer_account_id aquí para que el usuario 
                                                // pueda elegirlo después en el segundo selector
                                            });
                                        } else {
                                            // CONVERSIÓN A GASTO NORMAL
                                            handleQuickUpdate({ 
                                                category_id: catId, 
                                                type: 'expense',
                                                transfer_account_id: null // Limpiamos rastro de transferencia
                                            });
                                        }
                                    }}
                                >
                                    <SelectTrigger className="w-full bg-white border-slate-200 h-9 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="uncategorized">📁 Sin Categoría</SelectItem>
                                        {/* Opción especial de Traspaso */}
                                        <SelectItem value="transfer" className="text-indigo-600 font-bold italic">
                                            <div className="flex items-center gap-2">
                                                <ArrowRightLeft className="h-4 w-4" /> 
                                                Traspaso / Transferencia
                                            </div>
                                        </SelectItem>
                                        
                                        <div className="h-px bg-slate-100 my-1" />
                                        
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
                                    {localTx.type === 'transfer' ? 'Traspaso' : (activeCategoryObj?.name || 'Sin Categoría')}
                                </div>
                            )}
                        </div>

                        {/* SECCIÓN DINÁMICA: CUENTA DESTINO | MIEMBRO | PLANTILLA */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                {selectedCategoryId === 'transfer' || localTx.type === 'transfer' ? (
                                    <><ArrowRightLeft className="h-3 w-3 text-indigo-500" /> Cuenta Destino</>
                                ) : isIndividualMode ? (
                                    <><User className="h-3 w-3 text-amber-500" /> Asignar a</>
                                ) : (
                                    <><Users className="h-3 w-3 text-emerald-500" /> Plantilla de Reparto</>
                                )}
                            </label>

                            {/* CASO A: ES UNA TRANSFERENCIA (Selector de Cuentas) */}
                            {(selectedCategoryId === 'transfer' || localTx.type === 'transfer') ? (
                                <Select 
                                    value={localTx.transfer_account_id || ''} 
                                    onValueChange={(accId) => handleQuickUpdate({ transfer_account_id: accId })}
                                    disabled={!isAdmin}
                                >
                                    <SelectTrigger className="h-9 text-sm border-indigo-100 bg-indigo-50/30">
                                        <SelectValue placeholder="Seleccionar destino..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {accounts
                                            .filter((a: any) => a.id !== localTx.account_id)
                                            .map((a: any) => (
                                                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                                            ))
                                        }
                                    </SelectContent>
                                </Select>
                            ) : isIndividualMode ? (
                                /* CASO B: CATEGORÍA DE ASIGNACIÓN ÚNICA (Selector de Miembros) */
                                <Select value={contributorId} 
                                    onValueChange={(mId) => {
                                        setContributorId(mId)
                                        handleQuickUpdate({ allocations: [{ member_id: mId, amount: localTx.amount }] })
                                    }}
                                    disabled={!isAdmin}>
                                    <SelectTrigger className="h-9 text-sm border-amber-100 bg-amber-50/50">
                                        <SelectValue placeholder="Elegir miembro..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {members.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            ) : (
                                /* CASO C: GASTO COMÚN (Selector de Plantillas) */
                                <Select 
                                    value={localTx.split_template_id || 'manual'} 
                                    onValueChange={handleTemplateChange} 
                                    disabled={!isAdmin}
                                >
                                    <SelectTrigger className="h-9 text-sm border-emerald-100 bg-emerald-50/30">
                                        <SelectValue placeholder="Reparto..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {splitTemplates.map(t => (
                                            <SelectItem key={t.id} value={t.id}>
                                                ⚡ {t.name}
                                            </SelectItem>
                                        ))}
                                        <div className="h-px bg-slate-100 my-1" />
                                        <SelectItem value="manual" className="text-slate-400 italic">
                                            ✍️ Personalizado / Manual
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    </div>

                    {/* DETALLE DEL REPARTO ACTUAL */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                            <Users className="h-3 w-3" /> Distribución Actual
                        </label>
                        <div className="bg-slate-50/50 border rounded-xl divide-y text-sm">
                            {isUnassigned ? (
                                <div className="p-4 text-center text-slate-400 italic text-xs">No se ha definido el reparto todavía</div>
                            ) : (
                                localTx.allocations?.map((alloc: any) => {
                                    const m = members.find(mem => mem.id === alloc.member_id)
                                    return (
                                        <div key={alloc.member_id} className="p-2.5 flex justify-between items-center">
                                            <span className="font-medium text-slate-700">{m?.name}</span>
                                            <span className="font-bold text-slate-900">{formatCurrency(alloc.amount)}</span>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                </div>

                {isAdmin && (
                    <DialogFooter className="p-4 bg-slate-50 border-t flex flex-row items-center justify-between gap-2">
                        {/* Punto 1: Deshabilitar borrar si es cuenta principal */}
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={handleDelete} 
                            disabled={isMainAccount || loading}
                            className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                        >
                            {isMainAccount ? <Lock className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                        </Button>

                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => { onClose(); onEdit() }} className="h-9 text-xs">
                                <Pencil className="mr-2 h-3.5 w-3.5" /> Edición completa
                            </Button>

                            {isPending && (
                                <Button onClick={() => handleQuickUpdate({ status: 'approved' })} size="sm" disabled={loading} className="h-9 text-xs bg-emerald-600 hover:bg-emerald-700">
                                    <CheckCircle2 className="mr-2 h-3.5 w-3.5" /> Validar
                                </Button>
                            )}
                        </div>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    )
}