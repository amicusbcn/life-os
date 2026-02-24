'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSharedTransaction } from '@/app/finance-shared/actions'
import { CreateTransactionInput, SharedMember, SharedCategory } from '@/types/finance-shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Plus, Users, Wallet, Scale } from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatCurrency } from '@/lib/utils'
import LoadIcon from '@/utils/LoadIcon'

interface Props {
  groupId: string
  members: SharedMember[]
  categories: SharedCategory[]
  currentUserMemberId?: string
  isAdmin: boolean
}

export function CreateTransactionDialog({ groupId, members, categories, currentUserMemberId, isAdmin }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState<string>('uncategorized')
  
  const [paymentSource, setPaymentSource] = useState<'account' | 'member'>(isAdmin ? 'account' : 'member')
  const [payerId, setPayerId] = useState<string>(currentUserMemberId || members[0]?.id)
  const [requestReimbursement, setRequestReimbursement] = useState(false)

  const [splitType, setSplitType] = useState<'equal' | 'weighted'>('equal')
  const [involvedIds, setInvolvedIds] = useState<string[]>(members.map(m => m.id))
  const [weights, setWeights] = useState<Record<string, number>>({})

  useEffect(() => {
      const initialWeights: Record<string, number> = {}
      members.forEach(m => initialWeights[m.id] = 1)
      setWeights(initialWeights)
  }, [members])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || !description || !groupId) {
        toast.error("Faltan datos obligatorios");
        return;
    }

    setLoading(true)

    // LÓGICA DE SIGNOS: Valor absoluto y forzar negativo para gasto
    const absoluteAmount = Math.abs(parseFloat(amount));
    const finalAmount = absoluteAmount * -1;

    const finalWeights: Record<string, number> = {}
    if (splitType === 'weighted') {
        involvedIds.forEach(id => {
            finalWeights[id] = weights[id] || 0
        })
    }

    const payload: any = { // Usamos any temporalmente si la interfaz CreateTransactionInput es estricta
        group_id: groupId, // 👈 CRÍTICO: Aseguramos que viaja el ID del grupo
        date,
        amount: finalAmount, // 👈 Enviamos el valor negativo
        description,
        category_id: categoryId === 'uncategorized' ? null : categoryId,
        payment_source: paymentSource,
        payer_member_id: paymentSource === 'member' ? payerId : null,
        request_reimbursement: requestReimbursement,
        split_type: splitType,
        involved_member_ids: involvedIds,
        split_weights: splitType === 'weighted' ? finalWeights : null,
        type: 'expense',
        status: isAdmin ? 'approved' : 'pending'
    }

    const res = await createSharedTransaction(payload)

    if (res.error) {
        toast.error(res.error)
    } else {
        toast.success(isAdmin ? 'Gasto creado' : 'Gasto enviado a validar')
        setOpen(false)
        resetForm()
        router.refresh()
    }
    setLoading(false)
  }

  const resetForm = () => {
      setAmount('')
      setDescription('')
      setCategoryId('uncategorized')
      setDate(new Date().toISOString().split('T')[0])
  }

  const toggleMemberInvolvement = (memberId: string) => {
      setInvolvedIds(prev => 
          prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
      )
  }

  const handleWeightChange = (memberId: string, val: string) => {
      const num = parseFloat(val)
      if (!isNaN(num) && num >= 0) {
          setWeights(prev => ({ ...prev, [memberId]: num }))
      }
  }

  const calculateShare = (memberId: string) => {
      const totalAmount = Math.abs(parseFloat(amount)) || 0
      if (splitType === 'equal') {
          return involvedIds.includes(memberId) 
            ? totalAmount / involvedIds.length 
            : 0
      } else {
          if (!involvedIds.includes(memberId)) return 0
          const totalWeight = involvedIds.reduce((sum, id) => sum + (weights[id] || 0), 0)
          if (totalWeight === 0) return 0
          return (totalAmount / totalWeight) * (weights[memberId] || 0)
      }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-slate-900 hover:bg-slate-800 shadow-lg shadow-slate-900/20">
            <Plus className="mr-2 h-4 w-4" /> Nuevo Gasto
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
            <DialogTitle>Registrar Movimiento</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
            
            {/* 1. IMPORTE Y FECHA */}
            <div className="flex gap-4">
                <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl font-light text-slate-400">€</span>
                    <Input 
                        type="number" 
                        step="0.01" 
                        min="0" // 👈 Solo permitimos positivos en la UI
                        placeholder="0.00" 
                        className="pl-8 text-2xl font-bold h-14 bg-slate-50/50"
                        value={amount} 
                        onChange={e => setAmount(e.target.value)}
                        autoFocus
                    />
                </div>
                <div className="w-[140px]">
                    <Input 
                        type="date" value={date} onChange={e => setDate(e.target.value)}
                        className="h-14 text-center text-xs"
                    />
                </div>
            </div>

            {/* 2. DATOS BÁSICOS */}
            <div className="space-y-3">
                <Input placeholder="Concepto" value={description} onChange={e => setDescription(e.target.value)} className="font-medium" />
                <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger><SelectValue placeholder="Categoría" /></SelectTrigger>
                    <SelectContent className='max-h-60'>
                        <SelectItem value="uncategorized">📁 Sin Categoría</SelectItem>
                        {categories.map(c => (
                            <SelectItem key={c.id} value={c.id}>
                                <span className="flex items-center gap-2">
                                    <LoadIcon name={c.icon_name} className="h-3.5 w-3.5"/> 
                                    {c.name}
                                </span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="h-px bg-slate-100 my-2" />

            {/* 3. ORIGEN */}
            <div className="space-y-2">
                <Label className="text-xs text-slate-500 uppercase font-bold tracking-wider text-[10px]">¿Quién paga?</Label>
                <div className="grid grid-cols-2 gap-2">
                    <div onClick={() => isAdmin && setPaymentSource('account')} className={cn("flex items-center gap-2 border rounded-md p-2 cursor-pointer transition-all", paymentSource === 'account' ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm" : isAdmin ? "hover:bg-slate-50" : "opacity-40 cursor-not-allowed")}>
                        <Wallet className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-tight">Cuenta Grupo</span>
                    </div>
                    <div onClick={() => setPaymentSource('member')} className={cn("flex items-center gap-2 border rounded-md p-2 cursor-pointer transition-all", paymentSource === 'member' ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm" : "hover:bg-slate-50")}>
                        <Users className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-tight">Un Miembro</span>
                    </div>
                </div>
                {paymentSource === 'member' && (
                    <div className="p-3 bg-slate-50 rounded-md space-y-3 border animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] uppercase font-bold text-slate-400">Pagador:</span>
                            <Select value={payerId} onValueChange={setPayerId} disabled={!isAdmin}>
                                <SelectTrigger className="h-8 bg-white text-xs w-2/3"><SelectValue /></SelectTrigger>
                                <SelectContent>{members.map(m => <SelectItem key={m.id} value={m.id} className="text-xs">{m.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center space-x-2 border-t pt-2">
                            <Checkbox id="reimburse" checked={requestReimbursement} onCheckedChange={(c) => setRequestReimbursement(!!c)} />
                            <label htmlFor="reimburse" className="text-[10px] uppercase font-bold text-slate-500 cursor-pointer">Solicitar reembolso al grupo</label>
                        </div>
                    </div>
                )}
            </div>

            {/* 4. REPARTO */}
            <div className="space-y-3 pt-2">
                 <div className="flex justify-between items-center">
                    <Label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Reparto del Gasto</Label>
                    <Tabs value={splitType} onValueChange={(v: any) => setSplitType(v)} className="h-7">
                        <TabsList className="h-7 p-0.5 bg-slate-100">
                            <TabsTrigger value="equal" className="h-6 text-[9px] px-2 uppercase font-bold">Equitativo</TabsTrigger>
                            <TabsTrigger value="weighted" className="h-6 text-[9px] px-2 uppercase font-bold">Por cuotas</TabsTrigger>
                        </TabsList>
                    </Tabs>
                 </div>

                 <div className="grid gap-2 border p-2 rounded-xl bg-slate-50/50">
                    {members.map(member => {
                        const isSelected = involvedIds.includes(member.id)
                        const amountShare = calculateShare(member.id)

                        return (
                            <div key={member.id} className={cn("flex items-center justify-between p-2 rounded-lg border transition-all", isSelected ? "bg-white border-indigo-200 shadow-sm" : "bg-slate-100/50 border-transparent opacity-40 grayscale")}>
                                <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => toggleMemberInvolvement(member.id)}>
                                    <div className={cn("h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white transition-colors", isSelected ? "bg-indigo-500" : "bg-slate-400")}>
                                        {member.name.substring(0,2).toUpperCase()}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className={cn("text-xs font-bold leading-none", isSelected ? "text-slate-900" : "text-slate-500")}>{member.name}</span>
                                        {isSelected && amount > '0' && (
                                            <span className="text-[10px] text-indigo-600 font-medium mt-1">
                                                {formatCurrency(amountShare)}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {splitType === 'weighted' && isSelected && (
                                    <div className="flex items-center gap-1 animate-in slide-in-from-right-2">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase mr-1 italic">Peso:</span>
                                        <Input 
                                            type="number" 
                                            step="1" 
                                            min="0"
                                            className="h-7 w-12 text-center text-xs font-bold text-indigo-600 border-indigo-100 focus:ring-0"
                                            value={weights[member.id] || 0}
                                            onChange={(e) => handleWeightChange(member.id, e.target.value)}
                                            onClick={(e) => e.stopPropagation()} 
                                        />
                                    </div>
                                )}
                            </div>
                        )
                    })}
                 </div>
            </div>

            <Button type="submit" className="w-full bg-slate-900 h-12 text-sm font-bold uppercase tracking-widest" disabled={loading || !amount || involvedIds.length === 0}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                {isAdmin ? 'Guardar Movimiento' : 'Enviar para Validación'}
            </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}