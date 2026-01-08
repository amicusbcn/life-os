// app/finance/components/AccountSettingsDialog.tsx
'use client'

import React, { useState, useMemo, useEffect } from "react"
import { useRouter } from 'next/navigation'
import { deleteAccount, createAccount, updateAccount, ActionResult } from "@/app/finance/actions" 
import { FinanceAccount, FinanceAccountType, ACCOUNT_TYPES_META } from "@/types/finance" 
import { Switch } from "@/components/ui/switch" 
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from 'sonner'
import { cn } from "@/lib/utils"
import LoadIcon from "@/utils/LoadIcon"
import { AccountAvatar } from "./AccountAvatar"
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select"
import { 
    Trash2, Plus, Check, X, Pencil, EyeOff, Eye, Landmark, Loader2 
} from "lucide-react"

// --- FILA DE CUENTA ---
function AccountRow({ account,templates }: { account: FinanceAccount,templates: any[] }) {
    const [isEditing, setIsEditing] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    // Estados de edición
    const [tempName, setTempName] = useState(account.name)
    const [tempColor, setTempColor] = useState(account.color_theme || '#64748b')
    const [tempLetter, setTempLetter] = useState(account.avatar_letter || account.name.charAt(0).toUpperCase())
    const [tempNumber, setTempNumber] = useState(account.account_number || '')
    const [tempActive, setTempActive] = useState(account.is_active)
    const [tempType, setTempType] = useState<FinanceAccountType>(account.account_type)
    const [tempAutoMirror, setTempAutoMirror] = useState(account.auto_mirror_transfers || false)
    const [tempImporterId, setTempImporterId] = useState(account.importer_id || 'none')
    const [tempInitialBalance, setTempInitialBalance] = useState(account.initial_balance || 0)

    // Se dispara solo cuando cambias el tipo de cuenta en el selector
    useEffect(() => {
        // Tipos donde queremos que esté activo por defecto
        const autoActiveTypes: FinanceAccountType[] = ['loan', 'investment'];
        
        if (autoActiveTypes.includes(tempType)) {
            setTempAutoMirror(true);
        } else {
            setTempAutoMirror(false);
        }
    }, [tempType]);
    const isChanged = tempName !== account.name || 
                      tempColor !== account.color_theme || 
                      tempLetter !== account.avatar_letter || 
                      tempNumber !== (account.account_number || '') ||
                      tempActive !== account.is_active ||
                      tempType !== account.account_type ||
                      tempAutoMirror !== (account.auto_mirror_transfers || false)|| 
                      tempImporterId !== (account.importer_id || 'none')||
                      Number(tempInitialBalance) !== Number(account.initial_balance);

    const handleSave = async () => {
        setLoading(true)
        const formData = new FormData()
        formData.append('id', account.id)
        formData.append('name', tempName)
        formData.append('color_theme', tempColor)
        formData.append('avatar_letter', tempLetter)
        formData.append('account_number', tempNumber)
        formData.append('is_active', String(tempActive))
        formData.append('account_type', tempType)
        formData.append('auto_mirror_transfers', String(tempAutoMirror))
        formData.append('importer_id', tempImporterId === 'none' ? '' : tempImporterId)
        formData.append('initial_balance', String(tempInitialBalance))
        const res = await updateAccount({} as ActionResult, formData)
        if (res.success) {
            toast.success('Cuenta actualizada')
            setIsEditing(false)
            router.refresh()
        } else {
            toast.error('Error al guardar')
        }
        setLoading(false)
    }

    return (
        <div className={cn(
            "group mb-2 p-2 rounded-xl border bg-white shadow-sm transition-all",
            isEditing ? "ring-2 ring-indigo-500/20 border-indigo-200" : "border-slate-100"
        )}>
            <div className="flex items-center gap-2">
                {/* Color Picker Rápido */}
                <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg border shadow-xs">
                    <input 
                        type="color" 
                        value={tempColor} 
                        onChange={(e) => setTempColor(e.target.value)}
                        className="absolute inset-0 scale-150 cursor-pointer"
                    />
                </div>

                <AccountAvatar 
                    account={{ name: tempName, color_theme: tempColor, avatar_letter: tempLetter }} 
                    className="h-8 w-8 text-[11px]" 
                />

                <div className="flex-1 min-w-0">
                    <Input 
                        value={tempName} 
                        onChange={(e) => setTempName(e.target.value)}
                        className="h-5 text-sm border-none focus-visible:ring-0 bg-transparent font-bold p-0 px-1"
                    />
                    <p className="text-[9px] text-slate-400 px-1 font-mono truncate">
                        {tempNumber || 'Sin número de cuenta'}
                    </p>
                </div>

                <div className="flex gap-1">
                    <Button 
                        size="icon" variant="ghost" 
                        onClick={() => setTempActive(!tempActive)}
                        className={cn("h-8 w-8", !tempActive ? "text-amber-500 bg-amber-50" : "text-slate-300")}
                    >
                        {tempActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setIsEditing(!isEditing)} className="h-8 w-8 text-slate-400">
                        <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {isChanged && (
                        <Button size="icon" variant="ghost" onClick={handleSave} disabled={loading} className="h-8 w-8 text-emerald-600">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4" />}
                        </Button>
                    )}
                </div>
            </div>

            {isEditing && (
                <div className="mt-3 pt-3 border-t border-slate-50 space-y-4 animate-in slide-in-from-top-2">
                    <div className="grid grid-cols-4 gap-2">
                        {Object.entries(ACCOUNT_TYPES_META).map(([key, meta]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setTempType(key as FinanceAccountType)}
                                className={cn(
                                    "flex flex-col items-center justify-center p-2 rounded-xl border transition-all gap-1",
                                    tempType === key ? "bg-indigo-600 border-indigo-500 text-white shadow-md" : "bg-slate-50 border-transparent text-slate-400 hover:border-slate-200"
                                )}
                            >
                                <LoadIcon name={meta.icon} className="h-3.5 w-3.5" />
                                <span className="text-[7px] font-bold uppercase">{meta.label.split(' ')[0]}</span>
                            </button>
                        ))}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-400">Letra</label>
                            <Input 
                                value={tempLetter} 
                                onChange={(e) => setTempLetter(e.target.value.charAt(0).toUpperCase())}
                                className="h-8 text-center font-black bg-slate-50 border-none"
                                maxLength={1}
                            />
                        </div>
                        <div className="col-span-2 space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-400">Nº Cuenta / IBAN</label>
                            <Input 
                                value={tempNumber} 
                                onChange={(e) => setTempNumber(e.target.value)}
                                className="h-8 text-[10px] bg-slate-50 border-none font-mono"
                            />
                        </div>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="space-y-0.5 pr-4">
                            <Label className="text-[10px] font-bold uppercase text-slate-700">Movimiento Espejo</Label>
                            <p className="text-[8px] text-slate-500 leading-tight">
                                Genera automáticamente el ingreso de contrapartida al recibir una transferencia.
                            </p>
                        </div>
                        <Switch 
                            checked={tempAutoMirror} 
                            onCheckedChange={setTempAutoMirror}
                            className="scale-75 data-[state=checked]:bg-emerald-500"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {/* ✨ CAMPO SALDO INICIAL REINTEGRADO */}
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-400 italic">Saldo Inicial (Ancla)</label>
                            <Input 
                                type="number"
                                step="0.01"
                                value={tempInitialBalance} 
                                onChange={(e) => setTempInitialBalance(Number(e.target.value))}
                                className="h-8 text-[11px] bg-slate-50 border-none font-mono font-bold text-indigo-600"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-400">Plantilla de Importación</label>
                            <Select 
                                value={tempImporterId || 'none'} 
                                onValueChange={(val: string) => setTempImporterId(val)}
                            >
                                <SelectTrigger className="h-8 text-[11px] bg-slate-50 border-none">
                                    <SelectValue placeholder="Sin plantilla asociada" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Ninguna (Manual)</SelectItem>
                                    {templates.map((t: any) => (
                                        <SelectItem key={t.id} value={t.id} className="text-xs">
                                            {t.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// --- FORMULARIO NUEVA CUENTA ---
function NewAccountForm({ onSuccess }: { onSuccess: () => void }) {
    const [pending, setPending] = useState(false)
    const [type, setType] = useState<FinanceAccountType>('checking')

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setPending(true)
        const fd = new FormData(e.currentTarget)
        fd.append('account_type', type)
        const res = await createAccount({} as any, fd)
        if (res.success) {
            toast.success("Cuenta creada")
            onSuccess()
        }
        setPending(false)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
                <Input name="name" placeholder="Nombre (Ej: Santander)" required className="col-span-3 h-10 bg-slate-50 border-none font-bold" />
                <Input name="color_theme" type="color" defaultValue="#6366f1" className="h-10 p-1 bg-slate-50 border-none" />
            </div>
            
            <div className="grid grid-cols-4 gap-2">
                {Object.entries(ACCOUNT_TYPES_META).map(([key, meta]) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => setType(key as FinanceAccountType)}
                        className={cn(
                            "flex flex-col items-center justify-center p-2 rounded-xl border transition-all h-14 gap-1",
                            type === key ? "bg-indigo-600 border-indigo-500 text-white shadow-lg" : "bg-slate-50 border-transparent text-slate-400"
                        )}
                    >
                        <LoadIcon name={meta.icon} className="h-4 w-4" />
                        <span className="text-[7px] font-bold uppercase">{meta.label.split(' ')[0]}</span>
                    </button>
                ))}
            </div>

            <div className="flex gap-2">
                <Input name="account_number" placeholder="IBAN..." className="flex-1 h-10 bg-slate-50 border-none font-mono text-xs" />
                <Input name="initial_balance" placeholder="0.00" type="number" step="0.01" className="w-24 h-10 bg-slate-50 border-none text-right font-mono" />
            </div>
            
            <Button type="submit" disabled={pending} className="w-full bg-indigo-600 h-11 uppercase font-black text-[10px] tracking-widest">
                {pending ? "Registrando..." : "Añadir Cuenta"}
            </Button>
        </form>
    )
}

// --- DIÁLOGO PRINCIPAL ---
export function AccountSettingsDialog({ 
    initialAccounts, 
    templates, // ✨ Asegúrate de que esto está aquí
    children 
}: { 
    initialAccounts: FinanceAccount[], 
    templates: any[], 
    children: React.ReactNode 
}) {
    const [open, setOpen] = useState(false)
    const [showNew, setShowNew] = useState(false)

    const trigger = React.useMemo(() => {
        const child = React.Children.only(children) as React.ReactElement<any>;
        return React.cloneElement(child, {
            onClick: (e: React.MouseEvent<HTMLElement>) => {
                e.stopPropagation();
                if (child.props.onClick) child.props.onClick(e);
                setOpen(true);
            }
        });
    }, [children]);

    return (
        <>
            {trigger}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[450px] h-[85vh] flex flex-col bg-slate-50 p-0 overflow-hidden border-none shadow-2xl">
                    <DialogHeader className="p-6 pb-2 bg-white border-b">
                        <DialogTitle className="flex items-center gap-2 uppercase tracking-tighter font-black text-slate-700">
                            <Landmark className="h-5 w-5 text-indigo-500" /> Mis Cuentas
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 flex flex-col overflow-hidden p-4 pt-4">
                        <Button 
                            variant="outline" 
                            className="w-full mb-4 border-dashed border-slate-300 bg-white hover:bg-slate-50 text-slate-500 gap-2 h-11 font-bold text-xs"
                            onClick={() => setShowNew(!showNew)}
                        >
                            {showNew ? <X className="h-4 w-4"/> : <Plus className="h-4 w-4" />}
                            {showNew ? "Cerrar" : "Añadir Cuenta"}
                        </Button>

                        {showNew && (
                            <div className="mb-6 p-4 bg-white rounded-xl border border-indigo-100 shadow-md animate-in slide-in-from-top-2">
                                <NewAccountForm onSuccess={() => setShowNew(false)} />
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto space-y-1">
                            {initialAccounts.map((acc: FinanceAccount) => (
                                <AccountRow key={acc.id} account={acc} templates={templates} />
                            ))}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}