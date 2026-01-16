'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSharedTransaction, updateSharedTransaction } from '@/app/finance-shared/actions'
import { CreateTransactionInput, SharedMember, SharedCategory } from '@/types/finance-shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Users, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatCurrency } from '@/lib/utils'
import LoadIcon from '@/utils/LoadIcon'

// Tipo para la transacción que viene de DB (con allocations)
interface TransactionWithDetails {
    id: string
    group_id: string
    date: string
    amount: number
    description: string
    category_id?: string | null
    payment_source: 'account' | 'member'
    payer_member_id?: string | null
    reimbursement_status: 'none'|'pending'|'paid'
    allocations?: { member_id: string, amount: number }[]
}

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  groupId: string
  members: SharedMember[]
  categories: SharedCategory[]
  currentUserMemberId?: string
  isAdmin: boolean
  transactionToEdit?: TransactionWithDetails | null
}

export function TransactionFormDialog({ 
    open, onOpenChange, groupId, members, categories, currentUserMemberId, isAdmin, transactionToEdit 
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const isEditing = !!transactionToEdit

  // ESTADOS
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState<string>('uncategorized')
  
  const [paymentSource, setPaymentSource] = useState<'account' | 'member'>('member')
  const [payerId, setPayerId] = useState<string>('')
  const [requestReimbursement, setRequestReimbursement] = useState(false)

  const [splitType, setSplitType] = useState<'equal' | 'weighted'>('equal')
  const [involvedIds, setInvolvedIds] = useState<string[]>([])
  const [weights, setWeights] = useState<Record<string, number>>({})
  const isBankTransaction = isEditing && transactionToEdit?.payment_source === 'account'

  // --- EFECTO: CARGAR DATOS SI ES EDICIÓN ---
  useEffect(() => {
    if (open) {
        if (transactionToEdit) {
            // MODO EDICIÓN
            setDate(transactionToEdit.date)
            setAmount(transactionToEdit.amount.toString())
            setDescription(transactionToEdit.description)
            setCategoryId(transactionToEdit.category_id || 'uncategorized')
            setPaymentSource(transactionToEdit.payment_source)
            setPayerId(transactionToEdit.payer_member_id || currentUserMemberId || members[0]?.id)
            setRequestReimbursement(transactionToEdit.reimbursement_status === 'pending')

            // Recuperar Reparto
            const allocs = transactionToEdit.allocations || []
            const involved = allocs.map(a => a.member_id)
            setInvolvedIds(involved)
            
            // Heurística simple para detectar tipo de split
            const amounts = allocs.map(a => a.amount)
            const allEqual = amounts.length > 0 && amounts.every(val => Math.abs(val - amounts[0]) <= 0.02)
            
            if (allEqual) {
                setSplitType('equal')
                const w: Record<string, number> = {}; members.forEach(m => w[m.id] = 1); setWeights(w)
            } else {
                setSplitType('weighted')
                const w: Record<string, number> = {}; members.forEach(m => w[m.id] = 1); setWeights(w)
            }

        } else {
            // MODO CREAR: Defaults
            setDate(new Date().toISOString().split('T')[0])
            setAmount('')
            setDescription('')
            setCategoryId('uncategorized')
            setPaymentSource(isAdmin ? 'account' : 'member')
            setPayerId(currentUserMemberId || members[0]?.id)
            setRequestReimbursement(false)
            setSplitType('equal')
            setInvolvedIds(members.map(m => m.id))
            const w: Record<string, number> = {}; members.forEach(m => w[m.id] = 1); setWeights(w)
        }
    }
  }, [open, transactionToEdit, members, currentUserMemberId, isAdmin])


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || !description) return

    setLoading(true)

    const finalWeights: Record<string, number> = {}
    if (splitType === 'weighted') {
        involvedIds.forEach(id => finalWeights[id] = weights[id] || 0)
    }

    const payload: CreateTransactionInput = {
        group_id: groupId,
        date,
        amount: parseFloat(amount),
        description,
        category_id: categoryId === 'uncategorized' ? undefined : categoryId,
        payment_source: paymentSource,
        payer_member_id: paymentSource === 'member' ? payerId : undefined,
        request_reimbursement: requestReimbursement,
        split_type: splitType,
        involved_member_ids: involvedIds,
        split_weights: splitType === 'weighted' ? finalWeights : undefined
    }

    let res;
    if (isEditing && transactionToEdit) {
        res = await updateSharedTransaction(transactionToEdit.id, payload)
    } else {
        res = await createSharedTransaction(payload)
    }

    if (res.error) {
        toast.error(res.error)
    } else {
        toast.success(isEditing ? 'Gasto actualizado' : (isAdmin ? 'Gasto creado' : 'Gasto enviado'))
        onOpenChange(false)
        router.refresh()
    }
    setLoading(false)
  }

  const toggleMemberInvolvement = (memberId: string) => {
      setInvolvedIds(prev => prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId])
  }

  const handleWeightChange = (memberId: string, val: string) => {
      const num = parseFloat(val); if (num >= 0) setWeights(prev => ({ ...prev, [memberId]: num }))
  }

  const calculateShare = (memberId: string) => {
      const totalAmount = parseFloat(amount) || 0
      if (splitType === 'equal') return involvedIds.includes(memberId) ? totalAmount / involvedIds.length : 0
      else {
          if (!involvedIds.includes(memberId)) return 0
          const totalWeight = involvedIds.reduce((sum, id) => sum + (weights[id] || 0), 0)
          return totalWeight === 0 ? 0 : (totalAmount / totalWeight) * (weights[memberId] || 0)
      }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar Movimiento' : 'Registrar Movimiento'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
            
            {/* 1. IMPORTE Y FECHA */}
            <div className="flex gap-4">
                <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl font-light text-slate-400">€</span>
                    <Input 
                        type="number" step="0.01" placeholder="0.00" 
                        disabled={isBankTransaction}
                        className={cn(
                            "pl-8 text-2xl font-bold h-14 bg-slate-50/50",
                            isBankTransaction && "opacity-60 cursor-not-allowed bg-slate-100"
                        )}
                        value={amount} onChange={e => setAmount(e.target.value)}
                        autoFocus
                    />
                </div>
                <div className="w-[140px]">
                    <Input 
                        type="date" value={date} onChange={e => setDate(e.target.value)}
                        disabled={isBankTransaction} // BLOQUEADO
                        className={cn(
                            "h-14 text-center text-xs",
                            isBankTransaction && "opacity-60 cursor-not-allowed bg-slate-100"
                        )}
                    />
                </div>
            </div>
                {isBankTransaction && (
                    <p className="text-[10px] text-amber-600 flex items-center gap-1">
                        <span className="font-bold">Nota:</span> Importe y fecha bloqueados por ser movimiento bancario.
                    </p>
                )}
            {/* 2. DATOS BÁSICOS */}
            <div className="space-y-3">
                <Input placeholder="Concepto (ej: Compra Semanal)" value={description} onChange={e => setDescription(e.target.value)} className="font-medium" />
                <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger><SelectValue placeholder="Categoría" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="uncategorized">📁 Sin Categoría</SelectItem>
                        {categories.map(c => (
                            <SelectItem key={c.id} value={c.id}>
                                <span className="flex items-center gap-2"><LoadIcon name={c.icon_name} className="h-3 w-3"/> {c.name}</span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="h-px bg-slate-100 my-2" />

            {/* 3. ORIGEN */}
            <div className="space-y-2">
                    <Label className="text-xs text-slate-500 uppercase font-bold">¿Quién paga?</Label>
                    <div className="grid grid-cols-2 gap-2">
                        {/* Si es bancario, forzamos visualmente la selección y deshabilitamos clic */}
                        <div 
                             onClick={() => !isBankTransaction && isAdmin && setPaymentSource('account')} 
                             className={cn(
                                "flex items-center gap-2 border rounded-md p-2 transition-all",
                                paymentSource === 'account' 
                                    ? "border-indigo-500 bg-indigo-50/50 text-indigo-700" 
                                    : "opacity-40",
                                isBankTransaction ? "cursor-not-allowed" : "cursor-pointer"
                             )}
                        >
                            <Wallet className="h-4 w-4" /><span className="text-sm font-medium">Cuenta Grupo</span>
                        </div>
                        
                        <div 
                             onClick={() => !isBankTransaction && setPaymentSource('member')} 
                             className={cn(
                                 // ... estilos member ...
                                 isBankTransaction ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
                             )}
                        >
                            <Users className="h-4 w-4" /><span className="text-sm font-medium">Un Miembro</span>
                        </div>
                    </div>
                </div>

            {/* 4. REPARTO */}
            <div className="space-y-3 pt-2">
                 <div className="flex justify-between items-center">
                    <Label className="text-xs text-slate-500 uppercase font-bold">Reparto del Gasto</Label>
                    <Tabs value={splitType} onValueChange={(v: any) => setSplitType(v)} className="h-7">
                        <TabsList className="h-7 p-0 bg-slate-100">
                            <TabsTrigger value="equal" className="h-7 text-[10px] px-3">Equitativo</TabsTrigger>
                            <TabsTrigger value="weighted" className="h-7 text-[10px] px-3">Por cuotas</TabsTrigger>
                        </TabsList>
                    </Tabs>
                 </div>

                 <div className="grid gap-2">
                    {members.map(member => {
                        const isSelected = involvedIds.includes(member.id)
                        const amountShare = calculateShare(member.id)

                        return (
                            <div key={member.id} className={cn("flex items-center justify-between p-2 rounded-lg border transition-all", isSelected ? "bg-white border-indigo-200 shadow-sm" : "bg-slate-50 border-transparent opacity-60")}>
                                <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => toggleMemberInvolvement(member.id)}>
                                    <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white transition-colors", isSelected ? "bg-indigo-500" : "bg-slate-300")}>
                                        {member.name.substring(0,2).toUpperCase()}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className={cn("text-sm font-medium leading-none", isSelected ? "text-slate-900" : "text-slate-500")}>{member.name}</span>
                                        {isSelected && <span className="text-[10px] text-slate-400 mt-1">Paga: {formatCurrency(amountShare)}</span>}
                                    </div>
                                </div>

                                {splitType === 'weighted' && isSelected && (
                                    <div className="flex items-center gap-1 animate-in slide-in-from-right-2">
                                        <span className="text-[10px] text-slate-400 uppercase mr-1">Cuotas:</span>
                                        <Input 
                                            type="number" step="0.5" min="0"
                                            className="h-8 w-16 text-center font-bold text-indigo-600 border-indigo-100 focus:border-indigo-500"
                                            value={weights[member.id] || 0}
                                            onChange={(e) => handleWeightChange(member.id, e.target.value)}
                                            onClick={(e) => e.stopPropagation()} 
                                        />
                                    </div>
                                )}
                                
                                {splitType === 'equal' && isSelected && (
                                    <div className="text-indigo-500 pr-2"><Users className="h-4 w-4" /></div>
                                )}
                            </div>
                        )
                    })}
                 </div>
            </div>

            <Button type="submit" className="w-full bg-slate-900" disabled={loading || !amount || involvedIds.length === 0}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Guardar Cambios' : (isAdmin ? 'Crear Gasto' : 'Enviar Gasto')}
            </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}