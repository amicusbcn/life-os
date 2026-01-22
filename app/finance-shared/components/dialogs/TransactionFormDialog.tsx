'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { 
    Wallet, User, AlignLeft, PiggyBank, 
    HandCoins, ArrowUpRight, ArrowDownLeft, Lock, ArrowRightLeft
} from 'lucide-react' 
import LoadIcon from '@/utils/LoadIcon'
import { cn, formatCurrency } from '@/lib/utils'
import { SharedSplitTemplate } from '@/types/finance-shared'
import { useImpersonation } from '../ui/ImpersonationContext'
import { upsertSharedTransaction } from '@/app/finance-shared/actions'

interface AllocationState {
    memberId: string
    isSelected: boolean
    amount: number
    weight: number
}

export function TransactionFormDialog({ 
    open, onOpenChange, groupId, members, categories, transactionToEdit, 
    accounts = [], defaultAccountId,mainBankAccountId,
    splitTemplates = []
}: any) {
    
    // --- 1. HOOKS Y PERMISOS ---
    const { activeMember } = useImpersonation()
    const currentUserMemberId = activeMember?.id
    
    const isGroupAdmin = activeMember?.role === 'admin'
    const myResponsibleAccounts = accounts.filter((a: any) => a.responsible_member_id === currentUserMemberId)
    const isAccountOwner = myResponsibleAccounts.length > 0
    const isStandardUser = !isGroupAdmin && !isAccountOwner

    // CONSTANTES DE BLOQUEO BANCARIO
    const isMainAccountTx = transactionToEdit && transactionToEdit.account_id === mainBankAccountId;
    const isCurrentlyPending = transactionToEdit?.status === 'pending'

    // --- 2. ESTADOS ---
    const [loading, setLoading] = useState(false)
    
    // BLOQUE IMPORTE
    const [direction, setDirection] = useState<-1 | 1>(-1)
    const [amount, setAmount] = useState('')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])

    // BLOQUE CONCEPTO
    const [desc, setDesc] = useState('')
    const [notes, setNotes] = useState('')
    const [categoryId, setCategoryId] = useState<string>('')

    // BLOQUE PROVISIÓN
    const [isProvision, setIsProvision] = useState(false)

    // BLOQUE TRASPASO
    const [isTransfer, setIsTransfer] = useState(false)
    const [transferAccountId, setTransferAccountId] = useState<string>('')

    // BLOQUE ORIGEN
    const [originType, setOriginType] = useState<'member' | 'account'>('account')
    const [originAccountId, setOriginAccountId] = useState<string>('') 
    const [originMemberId, setOriginMemberId] = useState<string>('')
    const [userIntent, setUserIntent] = useState<'reimbursement' | 'contribution'>('reimbursement')

    // BLOQUE REPARTO
    const [splitMode, setSplitMode] = useState<string>('equal')
    const [allocations, setAllocations] = useState<AllocationState[]>([])

    // --- 3. CARGA DE DATOS ---
    useEffect(() => {
        if (open) {
            if (transactionToEdit) {
                // EDITAR
                const rawAmount = transactionToEdit.amount
                let dir: -1 | 1 = -1
                
                if (transactionToEdit.type === 'income') dir = 1
                else if (transactionToEdit.type === 'loan') dir = rawAmount < 0 ? -1 : 1
                else dir = -1 
                
                setDirection(dir)
                setAmount(Math.abs(rawAmount).toString())
                setDate(transactionToEdit.date.split('T')[0])
                setDesc(transactionToEdit.description)
                
                const cleanNotes = (transactionToEdit.notes || '').replace('[SOLICITA REEMBOLSO]', '').replace('[APORTACIÓN]', '').trim()
                setNotes(cleanNotes)
                setCategoryId(transactionToEdit.category_id || '')
                
                setIsProvision(transactionToEdit.is_provision || false)
                setIsTransfer(transactionToEdit.type === 'transfer')
                setTransferAccountId(transactionToEdit.transfer_account_id || '')

                const src = transactionToEdit.payment_source || 'account'
                setOriginType(src)
                if (src === 'account') {
                    setOriginAccountId(transactionToEdit.account_id || '')
                } else {
                    setOriginMemberId(transactionToEdit.payer_member_id || currentUserMemberId)
                    if (transactionToEdit.notes?.includes('[APORTACIÓN]')) setUserIntent('contribution')
                    else setUserIntent('reimbursement')
                }

                if (transactionToEdit.allocations?.length > 0) {
                    const mapped = members.map((m: any) => {
                        const existing = transactionToEdit.allocations.find((a: any) => a.member_id === m.id)
                        return { memberId: m.id, isSelected: !!existing, amount: existing ? existing.amount : 0, weight: 1 }
                    })
                    setAllocations(mapped)
                } else {
                    resetAllocations(Math.abs(rawAmount))
                }

            } else {
                // NUEVO
                resetForm()
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, transactionToEdit, activeMember])

    // --- 4. HELPERS ---
    const resetForm = () => {
        setDirection(-1)
        setAmount('')
        setDate(new Date().toISOString().split('T')[0])
        setDesc('')
        setNotes('')
        setCategoryId(categories.length > 0 ? categories[0].id : '')
        setIsProvision(false)
        setIsTransfer(false)
        setTransferAccountId('')
        setUserIntent('reimbursement')
        
        setOriginMemberId(currentUserMemberId)

        // IMPORTANTE: Al crear, nunca seleccionamos la cuenta principal por defecto
        if (isGroupAdmin) {
            const secondaryAccount = accounts.find((a:any) => a.id !== defaultAccountId)
            if (secondaryAccount) {
                setOriginType('account')
                setOriginAccountId(secondaryAccount.id)
            } else {
                setOriginType('member')
            }
        } else if (isAccountOwner) {
            setOriginType('account')
            setOriginAccountId(myResponsibleAccounts[0]?.id || '')
        } else {
            setOriginType('member')
        }

        resetAllocations(0)
    }

    // FILTRO DE CUENTAS DISPONIBLES (No permitimos la principal en nuevos movimientos)
    const availableOriginAccounts = accounts.filter((acc: any) => {
        if (!transactionToEdit && acc.id === defaultAccountId) return false
        if (isGroupAdmin) return true
        if (isAccountOwner) return acc.responsible_member_id === currentUserMemberId
        return false
    })

    const recalculateAllocations = (currentTotal: number, currentList: AllocationState[], mode: string = splitMode) => {
        const absTotal = Math.abs(currentTotal)
        let list = [...currentList]
        let totalWeight = 0
        
        list = list.map(item => {
            const effectiveWeight = item.isSelected ? item.weight : 0
            totalWeight += effectiveWeight
            return item
        })

        return list.map(item => {
            const effectiveWeight = item.isSelected ? item.weight : 0
            let share = 0
            if (totalWeight > 0) {
                share = (absTotal * effectiveWeight) / totalWeight
            }
            return { ...item, amount: share }
        })
    }

    const resetAllocations = (total: number) => {
    // Si tienes plantillas, usamos la primera por defecto (que será tu 'Equitativo' personalizado)
        if (splitTemplates.length > 0) {
            handleSplitModeChange(splitTemplates[0].id);
        } else {
            // Fallback si no hay plantillas
            const initialList = members.map((m: any) => ({
                memberId: m.id,
                isSelected: true,
                amount: 0,
                weight: 1
            }));
            setSplitMode('manual');
            setAllocations(recalculateAllocations(total, initialList, 'manual'));
        }
    }

    const handleSplitModeChange = (newMode: string) => {
        setSplitMode(newMode)
        const currentAmount = parseFloat(amount) || 0
        
        if (newMode === 'equal' || newMode === 'manual') {
            const newList = members.map((m:any) => ({
                memberId: m.id,
                isSelected: true,
                weight: 1,
                amount: 0
            }))
            setAllocations(recalculateAllocations(currentAmount, newList, newMode))
        } 
        else {
            const template = (splitTemplates as SharedSplitTemplate[]).find(t => t.id === newMode)
            if (template && template.template_members) {
                const newList = members.map((m:any) => {
                    const tm = template.template_members?.find((tm:any) => tm.member_id === m.id)
                    const weight = tm ? tm.shares : 0
                    return {
                        memberId: m.id,
                        isSelected: weight > 0,
                        weight: weight,
                        amount: 0
                    }
                })
                setAllocations(recalculateAllocations(currentAmount, newList, newMode))
            }
        }
    }

    const handleCategoryChange = (newCatId: string) => {
        setCategoryId(newCatId)
        const cat = categories.find((c:any) => c.id === newCatId)
        if (cat?.is_individual_assignment) {
             const initialList = members.map((m:any) => ({ 
                 memberId: m.id, 
                 isSelected: m.id === currentUserMemberId, 
                 amount: 0,
                 weight: 1
             }))
             setAllocations(recalculateAllocations(parseFloat(amount)||0, initialList))
        } else {
             resetAllocations(parseFloat(amount)||0)
        }
    }

    const handleAvatarClick = (idx: number) => {
        if (splitMode !== 'manual') setSplitMode('manual')
        const newAllocs = [...allocations]
        const item = newAllocs[idx]
        item.isSelected = !item.isSelected
        if (item.isSelected && item.weight === 0) item.weight = 1
        setAllocations(recalculateAllocations(parseFloat(amount)||0, newAllocs, 'manual'))
    }

    // --- 5. GUARDAR ---
    const handleSave = async () => {
        if (!desc || !amount) return toast.error('Falta concepto o importe')
        const inputAmount = parseFloat(amount)
        if (isNaN(inputAmount)) return toast.error('Importe inválido')
        setLoading(true)

        if (originType === 'account' && !originAccountId && !isProvision) {
            setLoading(false); return toast.error('Selecciona una cuenta de origen')
        }

        let finalNotes = notes
        if (!isProvision && originType === 'member') {
            const tag = userIntent === 'reimbursement' ? '[SOLICITA REEMBOLSO]' : '[APORTACIÓN]'
            finalNotes = `${notes} ${tag}`.trim()
        }

        let type = 'expense'
        let finalAmount = Math.abs(inputAmount)
        const selectedCategory = categories.find((c: any) => c.id === categoryId)

        if (isTransfer) {
            type = 'transfer'
            if (direction === -1) finalAmount = -finalAmount
        } 
        else if (isProvision) {
            type = 'expense' 
        } 
        else if (selectedCategory?.is_loan) {
            type = 'loan'
            if (direction === -1) finalAmount = Math.abs(inputAmount)
            else finalAmount = -Math.abs(inputAmount)
        } 
        else {
            type = (direction === 1) ? 'income' : 'expense'
            finalAmount = Math.abs(inputAmount)
        }

        const weightsPayload: Record<string, number> = {}
        allocations.forEach(a => {
            if (a.isSelected) weightsPayload[a.memberId] = a.weight
        })

        // LÓGICA DE STATUS SEGÚN VALIDACIÓN ADMIN
        let status = 'approved'
        if (isStandardUser) status = 'pending'
        if (isAccountOwner && originType === 'member') status = 'pending'
        
        if (transactionToEdit) {
            if (isGroupAdmin && isCurrentlyPending) {
                status = 'approved'
            } else {
                status = transactionToEdit.status
            }
        }

        const payload = {
            id: transactionToEdit?.id,
            date,
            amount: finalAmount,
            description: desc,
            notes: finalNotes,
            type,
            status,
            is_provision: isProvision,
            payment_source: isProvision ? 'provision' : originType,
            account_id: isProvision ? null : (originType === 'account' ? originAccountId : null),
            payer_member_id: isProvision ? null : (originType === 'member' ? originMemberId : null),
            category_id: isTransfer ? null : categoryId,
            transfer_account_id: isTransfer ? transferAccountId : null,
            split_type: 'weighted',
            split_weights: weightsPayload,
            allocations: (isTransfer) ? [] : allocations.filter(a => a.isSelected).map(a => ({ member_id: a.memberId, amount: a.amount }))
        }

        const res = await upsertSharedTransaction(groupId, payload)
        setLoading(false)
        if (res.error) toast.error(res.error)
        else {
            toast.success(transactionToEdit ? 'Actualizado' : 'Creado correctamente')
            onOpenChange(false)
        }
    }

    const LockedBadge = () => <Lock className="h-3 w-3 text-amber-500 ml-2 inline" />
    const handleDeselectAll = () => {
        setSplitMode('manual');
        const resetList = allocations.map(a => ({ ...a, isSelected: false, amount: 0 }));
        setAllocations(resetList);
    };
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-white border shadow-lg max-h-[90vh] flex flex-col">
                <DialogHeader className="sr-only"><DialogTitle>Transacción</DialogTitle></DialogHeader>

                {/* 1. ESTADO */}
                {transactionToEdit && (
                    <div className="bg-slate-50 border-b px-6 py-2 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                            {isMainAccountTx ? (
                                <span className="text-amber-600 font-bold flex items-center gap-1">
                                    <Lock className="h-3 w-3" /> Movimiento Bancario Bloqueado
                                </span>
                            ) : (
                                <span className="text-slate-500">Editando movimiento manual</span>
                            )}
                        </div>
                        {isCurrentlyPending && (
                            <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">PENDIENTE VALIDACIÓN</span>
                        )}
                    </div>
                )}

                <div className="flex-1 overflow-y-auto">
                    
                    {/* 2. IMPORTE Y DIRECCIÓN */}
                    <div className="p-6 pb-2 text-center">
                        <div className="grid grid-cols-2 gap-3 w-full mb-4">
                            <Button 
                                type="button" 
                                variant={direction === -1 ? 'destructive' : 'outline'}
                                onClick={() => { setDirection(-1); setAllocations(prev => recalculateAllocations(parseFloat(amount)||0, prev)) }}
                                className={cn("h-10 transition-all", direction === -1 && "ring-2 ring-red-100 ring-offset-1")}
                                disabled={isMainAccountTx}
                            >
                                <ArrowUpRight className="h-4 w-4 mr-2" /> GASTO / SALIDA
                            </Button>
                            <Button 
                                type="button" 
                                variant="outline"
                                onClick={() => { setDirection(1); setAllocations(prev => recalculateAllocations(parseFloat(amount)||0, prev)) }}
                                className={cn("h-10 transition-all", direction === 1 && "bg-emerald-600 text-white hover:bg-emerald-700 ring-2 ring-emerald-100 ring-offset-1 border-emerald-600")}
                                disabled={isMainAccountTx}
                            >
                                <ArrowDownLeft className="h-4 w-4 mr-2" /> INGRESO / ENTRADA
                            </Button>
                        </div>

                        <div className="relative w-full flex items-center justify-center my-2">
                            <input 
                                type="number" 
                                step="0.01" 
                                placeholder="0.00"
                                value={amount}
                                disabled={isMainAccountTx}
                                onChange={e => {
                                    setAmount(e.target.value)
                                    setAllocations(prev => recalculateAllocations(parseFloat(e.target.value) || 0, prev))
                                }}
                                className={cn(
                                    "w-full bg-transparent border-none outline-none p-0",
                                    "text-center font-bold tracking-tight focus:ring-0 shadow-none appearance-none",
                                    "text-5xl h-16", 
                                    direction === -1 
                                        ? "text-red-500 placeholder:text-red-200" 
                                        : "text-emerald-500 placeholder:text-emerald-200",
                                    isMainAccountTx && "opacity-50 cursor-not-allowed"
                                )}
                            />
                            <span className="text-xs font-bold text-slate-500 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none select-none">EUR</span>
                        </div>

                        <div className="flex justify-center mt-2">
                            <input 
                                type="date" 
                                value={date} 
                                disabled={isMainAccountTx} 
                                onChange={e => setDate(e.target.value)} 
                                className={cn(
                                    "text-sm text-slate-500 bg-slate-50 px-3 py-1 rounded-full border border-slate-200 font-medium cursor-pointer focus:outline-none",
                                    isMainAccountTx && "opacity-60 cursor-not-allowed"
                                )}
                            />
                        </div>
                    </div>

                    <div className="px-6 space-y-6 pb-6">
                        
                        <div className="space-y-3">
                            <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Concepto (ej: Cena)" className="text-lg font-medium border-x-0 border-t-0 border-b rounded-none px-0 focus-visible:ring-0 bg-transparent" />
                            <div className="flex gap-3">
                                <div className="flex-1 relative">
                                    <AlignLeft className="absolute left-0 top-3 h-3 w-3 text-slate-400" />
                                    <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas..." className="pl-5 border-x-0 border-t-0 border-b rounded-none focus-visible:ring-0 bg-transparent text-sm h-9" />
                                </div>
                                {!isTransfer && (
                                    <div className="w-1/2">
                                        <Select value={categoryId} onValueChange={handleCategoryChange}>
                                            <SelectTrigger className="h-9 border-0 border-b rounded-none shadow-none px-0 focus:ring-0"><SelectValue placeholder="Categoría" /></SelectTrigger>
                                            <SelectContent>
                                                {categories.map((c: any) => (<SelectItem key={c.id} value={c.id}><div className="flex items-center gap-2"><LoadIcon name={c.icon_name} className="h-4 w-4 text-slate-500" />{c.name}</div></SelectItem>))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-100 rounded-lg">
                            <Label htmlFor="is-prov" className="cursor-pointer text-xs font-bold uppercase flex items-center gap-2 text-amber-700">
                                <PiggyBank className="h-4 w-4" /> Es solo una Provisión
                            </Label>
                            <Switch id="is-prov" checked={isProvision} onCheckedChange={setIsProvision} disabled={transactionToEdit?.is_provision || isMainAccountTx} />
                        </div>

                        {transactionToEdit && !isProvision && (
                            <div className="flex items-center justify-between py-2 border-b border-dashed">
                                <Label htmlFor="tr-switch" className="text-slate-600 text-sm font-medium cursor-pointer flex items-center gap-2">
                                    <ArrowRightLeft className="h-4 w-4" /> ¿Es un traspaso?
                                </Label>
                                <Switch id="tr-switch" checked={isTransfer} onCheckedChange={setIsTransfer} disabled={isMainAccountTx} />
                            </div>
                        )}
                        {isTransfer && (
                            <div className="space-y-2 animate-in slide-in-from-top-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase">Cuenta Destino</Label>
                                <Select value={transferAccountId} onValueChange={setTransferAccountId}>
                                    <SelectTrigger><SelectValue placeholder="Selecciona cuenta..." /></SelectTrigger>
                                    <SelectContent>
                                        {accounts.filter((a:any) => a.id !== originAccountId).map((a: any) => (<SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {!isProvision && (
                            <div className="space-y-3">
                                <Label className="text-xs text-slate-400 uppercase font-bold tracking-wider block">
                                    Origen {isMainAccountTx && <LockedBadge />}
                                </Label>
                                
                                <div className="flex gap-3">
                                    <div className="flex bg-slate-100 p-1 rounded-lg shrink-0 h-10 items-center">
                                        <button 
                                            type="button" 
                                            disabled={isMainAccountTx || (!isGroupAdmin && !isAccountOwner && originType !== 'member')}
                                            onClick={() => setOriginType('account')} 
                                            className={cn("w-10 h-8 rounded-md flex items-center justify-center transition-all", originType === 'account' ? "bg-white shadow-sm text-slate-900" : "text-slate-400")}
                                        >
                                            <Wallet className="h-4 w-4" />
                                        </button>
                                        <button 
                                            type="button" 
                                            disabled={isMainAccountTx} 
                                            onClick={() => { setOriginType('member'); setOriginMemberId(currentUserMemberId); }} 
                                            className={cn("w-10 h-8 rounded-md flex items-center justify-center transition-all", originType === 'member' ? "bg-white shadow-sm text-slate-900" : "text-slate-400")}
                                        >
                                            <User className="h-4 w-4" />
                                        </button>
                                    </div>

                                    <div className="flex-1">
                                        {originType === 'account' ? (
                                            <Select value={originAccountId} onValueChange={setOriginAccountId} disabled={isMainAccountTx}>
                                                <SelectTrigger className="bg-slate-50 border-slate-200 h-10"><SelectValue placeholder="Selecciona cuenta..." /></SelectTrigger>
                                                <SelectContent>
                                                    {availableOriginAccounts.map((a: any) => (<SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>))}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <div className="flex gap-2">
                                                <div className="flex-1">
                                                    {isGroupAdmin ? (
                                                        <Select value={originMemberId} onValueChange={setOriginMemberId}>
                                                            <SelectTrigger className="bg-slate-50 border-slate-200 h-10"><SelectValue /></SelectTrigger>
                                                            <SelectContent>{members.map((m: any) => (<SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>))}</SelectContent>
                                                        </Select>
                                                    ) : (
                                                        <div className="bg-slate-50 border px-3 h-10 rounded-md text-sm text-slate-600 flex items-center gap-2 w-full truncate">
                                                            <User className="h-4 w-4 text-slate-400" />
                                                            <span className="truncate">{members.find((m:any) => m.id === originMemberId)?.name || 'Tú'}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex bg-slate-50 rounded-lg p-1 shrink-0 h-10 items-center border">
                                                    <button type="button" onClick={() => setUserIntent('reimbursement')} className={cn("p-1.5 rounded transition-all text-xs flex", userIntent==='reimbursement' ? "bg-white shadow text-indigo-600" : "text-slate-300")}>
                                                        <HandCoins className="h-3 w-3 mr-2 mt-0.5" /> Reembolso
                                                    </button>
                                                    <button type="button" onClick={() => setUserIntent('contribution')} className={cn("p-1.5 rounded transition-all text-xs flex", userIntent==='contribution' ? "bg-white shadow text-emerald-600" : "text-slate-300")}>
                                                        <PiggyBank className="h-3 w-3 mr-2 mt-0.5" /> Aportación
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {!isTransfer && (
                            <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs text-slate-400 uppercase font-bold tracking-wider">Modo de Reparto</Label>
                                    
                                    <Select value={splitMode} onValueChange={handleSplitModeChange}>
                                        <SelectTrigger className="h-8 text-xs w-[180px] bg-indigo-50 border-indigo-100 text-indigo-700 font-medium">
                                            <SelectValue placeholder="Selecciona reparto..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {/* 1. Tus Plantillas primero */}
                                            {splitTemplates.map((t: any) => (
                                                <SelectItem key={t.id} value={t.id} className="font-medium">
                                                    {t.name}
                                                </SelectItem>
                                            ))}
                                            
                                            <div className="h-px bg-slate-100 my-1" />
                                            
                                            {/* 2. Manual al final */}
                                            <SelectItem value="manual" className="text-slate-500 italic">
                                                Personalizado / Manual
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
<div className="flex justify-end">
    <button 
        type="button" 
        onClick={handleDeselectAll}
        className="text-[10px] text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
    >
        <User className="h-3 w-3" /> Desmarcar todos
    </button>
</div>
                                <div className="flex flex-wrap justify-center gap-4">
                                    {allocations.map((alloc, idx) => {
                                        const member = members.find((m: any) => m.id === alloc.memberId)
                                        if (!member) return null
                                        const showWeightBadge = alloc.isSelected && alloc.weight !== 1
                                        return (
                                            <button key={member.id} type="button" onClick={() => handleAvatarClick(idx)} className={cn("flex flex-col items-center gap-2 outline-none group transition-all relative", !alloc.isSelected && "opacity-40 grayscale scale-95")}>
                                                <div className={cn("p-1 rounded-full border-2 transition-all", alloc.isSelected ? "border-indigo-500 ring-2 ring-indigo-100" : "border-transparent")}><Avatar className="h-10 w-10"><AvatarFallback className="bg-slate-100 font-bold text-slate-600">{member.name.substring(0,2).toUpperCase()}</AvatarFallback></Avatar></div>
                                                {showWeightBadge && <span className="absolute top-0 right-0 bg-slate-900 text-white text-[9px] font-bold px-1 rounded-full shadow-sm">x{alloc.weight}</span>}
                                                <div className="flex flex-col items-center"><span className="text-[10px] font-medium">{member.name}</span>{alloc.isSelected && <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 rounded-full">{formatCurrency(alloc.amount)}</span>}</div>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t bg-slate-50 flex justify-end gap-2 shrink-0">
                     <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
                     <Button 
                        onClick={handleSave} 
                        disabled={loading} 
                        className={cn(
                            "min-w-[120px] transition-all",
                            isGroupAdmin && isCurrentlyPending ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-slate-900 text-white hover:bg-slate-800"
                        )}
                    >
                        {loading ? (
                            <LoadIcon name="Loader2" className="animate-spin h-4 w-4"/>
                        ) : (
                            isGroupAdmin && isCurrentlyPending ? 'Validar y Guardar' : (isMainAccountTx ? 'Actualizar Reparto' : 'Guardar')
                        )}
                     </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}