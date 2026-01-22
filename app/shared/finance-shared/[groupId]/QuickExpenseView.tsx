'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
    ArrowLeft, CheckCircle2, Wallet, User, Loader2, 
    HandCoins, PiggyBank, LogOut, Plus 
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import LoadIcon from '@/utils/LoadIcon'
import { createPublicTransaction } from '@/app/finance-shared/public-actions'

export function QuickExpenseView({ groupId, members, categories, accounts }: any) {
    // ESTADOS
    const [step, setStep] = useState<1 | 2 | 3>(1) // 1=Who, 2=Form, 3=Success
    const [selectedMember, setSelectedMember] = useState<any>(null)
    const [loading, setLoading] = useState(false)

    // DATOS FORMULARIO
    const [amount, setAmount] = useState('')
    const [desc, setDesc] = useState('')
    const [notes, setNotes] = useState('')
    const [categoryId, setCategoryId] = useState('')
    
    // ORIGEN Y DESTINO
    const [paymentSource, setPaymentSource] = useState<'pocket' | 'account'>('pocket')
    const [userIntent, setUserIntent] = useState<'reimbursement' | 'contribution'>('reimbursement')
    const [selectedAccountId, setSelectedAccountId] = useState('')

    // --- LOGICA DE PERMISOS ---
    const userAccounts = selectedMember 
        ? accounts.filter((a:any) => a.responsible_member_id === selectedMember.id)
        : []
    const canUseCard = userAccounts.length > 0

    // --- MANEJADORES ---

    const handleMemberSelect = (member: any) => {
        setSelectedMember(member)
        resetForm()
        setStep(2)
    }

    const resetForm = () => {
        setAmount('')
        setDesc('')
        setNotes('')
        setCategoryId('')
        setPaymentSource('pocket')
        setUserIntent('reimbursement') // Por defecto pide reembolso
        if (accounts.length > 0) setSelectedAccountId(userAccounts[0]?.id || '')
    }

    const handleNewSameUser = () => {
        resetForm()
        setStep(2) // Volver al formulario directamente
    }

    const handleLogout = () => {
        setSelectedMember(null)
        setStep(1) // Volver al inicio
    }

    const handleSubmit = async () => {
        if (!amount || !categoryId) return toast.error('Falta importe o categoría')
        
        setLoading(true)

        // Lógica de Reembolso
        // Si paga con tarjeta del grupo -> No hay reembolso (none)
        // Si paga con su bolsillo y pide reembolso -> pending
        // Si paga con su bolsillo y es aportación -> none
        let reimbursementStatus = 'none'
        if (paymentSource === 'pocket' && userIntent === 'reimbursement') {
            reimbursementStatus = 'pending'
        }

        // Añadimos etiqueta a las notas si es aportación para que quede claro
        let finalNotes = notes
        if (paymentSource === 'pocket' && userIntent === 'contribution') {
            finalNotes = `[APORTACIÓN VOLUNTARIA] ${notes}`.trim()
        }

        const payload = {
            group_id: groupId,
            date: new Date().toISOString().split('T')[0],
            amount: Math.abs(parseFloat(amount)),
            description: desc || categories.find((c:any) => c.id === categoryId)?.name,
            notes: finalNotes,
            category_id: categoryId,
            type: 'expense',
            payer_member_id: paymentSource === 'pocket' ? selectedMember.id : null,
            account_id: paymentSource === 'account' ? selectedAccountId : null,
            status: 'pending', // Siempre pendiente de aprobar
            reimbursement_status: reimbursementStatus
        }

        const res = await createPublicTransaction(payload)

        if (res.error) {
            toast.error(res.error)
            setLoading(false)
        } else {
            setStep(3)
            setLoading(false)
            // Ya no hay timeout, se queda en la pantalla de éxito
        }
    }

    // --- VISTA 1: ¿QUIÉN ERES? ---
    if (step === 1) {
        return (
            <div className="w-full max-w-md space-y-6 animate-in fade-in duration-500">
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-bold text-slate-900">¿Quién eres?</h1>
                    <p className="text-slate-500">Selecciona tu usuario para añadir un gasto.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    {members.map((m: any) => (
                        <button
                            key={m.id}
                            onClick={() => handleMemberSelect(m)}
                            className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-sm border-2 border-transparent hover:border-indigo-500 hover:shadow-md transition-all active:scale-95"
                        >
                            <Avatar className="h-16 w-16 mb-3">
                                <AvatarFallback className="bg-slate-100 text-xl font-bold text-slate-600">
                                    {m.name.substring(0,2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <span className="font-bold text-slate-700">{m.name}</span>
                        </button>
                    ))}
                </div>
            </div>
        )
    }

    // --- VISTA 3: ÉXITO (MODIFICADA) ---
    if (step === 3) {
        return (
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center animate-in zoom-in duration-300">
                <div className="h-20 w-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="h-10 w-10" />
                </div>
                
                <h2 className="text-2xl font-bold text-slate-800">¡Gasto Guardado!</h2>
                
                <div className="mt-4 p-4 bg-slate-50 rounded-lg text-sm text-slate-600">
                    <p>Gracias <strong>{selectedMember.name}</strong>.</p>
                    <p className="mt-1">El gasto ha quedado registrado y está <strong>pendiente de revisión</strong> por un administrador.</p>
                </div>

                <div className="mt-8 space-y-3">
                    <Button 
                        className="w-full h-12 text-base font-bold bg-slate-900 hover:bg-slate-800" 
                        onClick={handleNewSameUser}
                    >
                        <Plus className="mr-2 h-5 w-5" /> Crear otro gasto
                    </Button>
                    
                    <Button 
                        variant="ghost" 
                        className="w-full text-slate-500 hover:text-red-500" 
                        onClick={handleLogout}
                    >
                        <LogOut className="mr-2 h-4 w-4" /> He terminado (Salir)
                    </Button>
                </div>
            </div>
        )
    }

    // --- VISTA 2: EL FORMULARIO ---
    return (
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-right duration-300">
            
            {/* Header con Usuario */}
            <div className="bg-slate-900 p-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={() => setStep(1)} className="text-white/70 hover:text-white">
                        <ArrowLeft className="h-6 w-6" />
                    </button>
                    <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8 border-2 border-white/20">
                            <AvatarFallback className="bg-indigo-500 text-white text-xs">
                                {selectedMember.name.substring(0,2)}
                            </AvatarFallback>
                        </Avatar>
                        <span className="text-white font-bold">Hola, {selectedMember.name}</span>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
                
                {/* 1. IMPORTE GIGANTE */}
                <div className="relative text-center">
                    <input
                        type="number"
                        placeholder="0"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        className="w-full text-center text-6xl font-black text-slate-800 placeholder:text-slate-200 border-none focus:ring-0 p-0 bg-transparent"
                        autoFocus
                    />
                    <span className="text-sm font-bold text-slate-400 absolute top-1/2 -translate-y-1/2 right-0 pointer-events-none">EUR</span>
                </div>

                {/* 2. CATEGORÍAS (Grid Visual) */}
                <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-400 uppercase">¿Qué es?</Label>
                    <div className="grid grid-cols-4 gap-2">
                        {categories.map((c:any) => (
                            <button
                                key={c.id}
                                onClick={() => setCategoryId(c.id)}
                                className={cn(
                                    "flex flex-col items-center justify-center p-2 rounded-lg border aspect-square transition-all",
                                    categoryId === c.id 
                                        ? "bg-indigo-50 border-indigo-600 text-indigo-700 ring-1 ring-indigo-600" 
                                        : "border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100"
                                )}
                            >
                                <LoadIcon name={c.icon_name} className="h-6 w-6 mb-1" />
                                <span className="text-[9px] font-bold truncate w-full text-center">{c.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* 3. CONCEPTO Y NOTAS */}
                <div className="space-y-4">
                    <Input 
                        placeholder="Concepto corto (ej: Cena viernes)" 
                        value={desc} 
                        onChange={e => setDesc(e.target.value)}
                        className="bg-slate-50 border-0 font-medium"
                    />
                    
                    <Textarea 
                        placeholder="Notas adicionales (quién participa, detalle del regalo, si falta ticket, etc.)" 
                        value={notes} 
                        onChange={e => setNotes(e.target.value)}
                        className="bg-slate-50 border-0 resize-none text-sm min-h-[60px]"
                    />
                </div>

                {/* 4. ORIGEN (BOLSILLO VS TARJETA) */}
                <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-400 uppercase">¿Cómo pagaste?</Label>
                    
                    {canUseCard ? (
                        <div className="bg-slate-100 p-1 rounded-lg flex mb-2">
                            <button
                                onClick={() => setPaymentSource('pocket')}
                                className={cn(
                                    "flex-1 py-2 text-sm font-bold rounded-md flex items-center justify-center gap-2 transition-all",
                                    paymentSource === 'pocket' ? "bg-white shadow text-slate-900" : "text-slate-400"
                                )}
                            >
                                <User className="h-4 w-4" /> Mi dinero
                            </button>
                            <button
                                onClick={() => setPaymentSource('account')}
                                className={cn(
                                    "flex-1 py-2 text-sm font-bold rounded-md flex items-center justify-center gap-2 transition-all",
                                    paymentSource === 'account' ? "bg-white shadow text-indigo-600" : "text-slate-400"
                                )}
                            >
                                <Wallet className="h-4 w-4" /> {userAccounts[0]?.name || 'Tarjeta'}
                            </button>
                        </div>
                    ) : (
                        <div className="text-sm text-slate-500 bg-slate-50 p-2 rounded border flex items-center gap-2">
                            <User className="h-4 w-4" /> Pagado de tu bolsillo
                        </div>
                    )}

                    {/* 5. INTENCIÓN (SOLO SI ES BOLSILLO) */}
                    {paymentSource === 'pocket' && (
                        <div className="animate-in slide-in-from-top-2 fade-in">
                            <div className="bg-white border p-1 rounded-lg flex mt-2">
                                <button
                                    onClick={() => setUserIntent('reimbursement')}
                                    className={cn(
                                        "flex-1 py-2 text-xs font-bold rounded-md flex items-center justify-center gap-2 transition-all",
                                        userIntent === 'reimbursement' 
                                            ? "bg-indigo-50 text-indigo-700 border border-indigo-200" 
                                            : "text-slate-400 hover:bg-slate-50"
                                    )}
                                >
                                    <HandCoins className="h-3.5 w-3.5" /> Solicitar Reembolso
                                </button>
                                <button
                                    onClick={() => setUserIntent('contribution')}
                                    className={cn(
                                        "flex-1 py-2 text-xs font-bold rounded-md flex items-center justify-center gap-2 transition-all",
                                        userIntent === 'contribution' 
                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                            : "text-slate-400 hover:bg-slate-50"
                                    )}
                                >
                                    <PiggyBank className="h-3.5 w-3.5" /> Es una Aportación
                                </button>
                            </div>
                            <p className="text-[10px] text-center mt-1.5 text-slate-400">
                                {userIntent === 'reimbursement' 
                                    ? "El grupo te deberá este dinero." 
                                    : "Pones este dinero para el grupo sin esperar devolución."}
                            </p>
                        </div>
                    )}
                </div>

            </div>

            {/* FOOTER */}
            <div className="p-4 bg-white border-t shrink-0">
                <Button 
                    className="w-full h-12 text-lg font-bold bg-slate-900 hover:bg-slate-800"
                    onClick={handleSubmit}
                    disabled={!amount || !categoryId || loading}
                >
                    {loading ? <Loader2 className="animate-spin" /> : 'Guardar Gasto'}
                </Button>
            </div>
        </div>
    )
}