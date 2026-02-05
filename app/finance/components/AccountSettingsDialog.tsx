// app/finance/components/AccountSettingsDialog.tsx
'use client'

import React, { useState, useMemo, useEffect } from "react"
import { useRouter } from 'next/navigation'
import { deleteAccount, createAccount, updateAccount } from "@/app/finance/actions/accounts" 
import { FinanceAccount, FinanceAccountType, ACCOUNT_TYPES_META } from "@/types/finance" 
import { ActionResponse } from "@/types/common"
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
import { AccountFormFields } from "./AccountFormFields"

const slugify = (text: string) => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-');
};


    const formatIBAN = (value: string) => {
        return value
            .replace(/\s/g, '') // Quitamos espacios existentes
            .replace(/(.{4})/g, '$1 ') // Añadimos espacio cada 4
            .trim()
            .toUpperCase();
    };
// --- FILA DE CUENTA ---
function AccountRow({ account, templates }: { account: FinanceAccount, templates: any[] }) {
    const [isEditing, setIsEditing] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    // Estados temporales unificados
    const [state, setState] = useState({
        name: account.name,
        slug: account.slug || '',
        color: account.color_theme || '#64748b',
        letter: account.avatar_letter || account.name.charAt(0).toUpperCase(),
        number: account.account_number || '',
        active: account.is_active,
        type: account.account_type,
        autoMirror: account.auto_mirror_transfers || false,
        importerId: account.importer_id || 'none',
        balance: account.initial_balance || 0
    });

    const [isSlugCustom, setIsSlugCustom] = useState(false);

    useEffect(() => {
        if (!isSlugCustom && isEditing) {
            setState(prev => ({ ...prev, slug: slugify(prev.name) }));
        }
    }, [state.name, isSlugCustom, isEditing]);

    const handleSave = async () => {
        setLoading(true);
        const fd = new FormData();
        fd.append('id', account.id);
        fd.append('name', state.name);
        fd.append('slug', state.slug);
        fd.append('account_number', state.number);
        fd.append('initial_balance', state.balance.toString());
        fd.append('account_type', state.type);
        fd.append('color_theme', state.color);
        fd.append('avatar_letter', state.letter);
        fd.append('is_active', String(state.active));
        fd.append('auto_mirror_transfers', String(state.autoMirror));
        fd.append('importer_id', state.importerId);

        const res = await updateAccount({} as ActionResponse, fd);
        if (res.success) {
            toast.success('Cuenta actualizada');
            setIsEditing(false);
            router.refresh();
        }
        setLoading(false);
    };

    return (
        <div className={cn(
            "group mb-3 p-4 rounded-2xl border bg-white shadow-sm transition-all",
            isEditing ? "ring-2 ring-indigo-500/20 border-indigo-200" : "border-slate-100"
        )}>
            {/* FILA SUPERIOR: SIEMPRE VISIBLE */}
            <div className="flex items-center gap-3">
                {!isEditing && (
                    <>
                        <AccountAvatar 
                            account={{ name: account.name, color_theme: account.color_theme, avatar_letter: account.avatar_letter }} 
                            className="h-9 w-9 text-[11px] shrink-0" 
                        />
                        <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-black text-slate-700 uppercase italic tracking-tighter leading-none mb-1">{account.name}</h4>
                            <p className="text-[10px] text-slate-400 font-mono italic">{formatIBAN(account.account_number||'')}</p>
                        </div>
                    </>
                )}
                
                {/* SI ESTAMOS EDITANDO, ESTA PARTE SE OCULTA PARA DEJAR PASO AL FORMFIELDS QUE YA LLEVA EL NOMBRE */}
                {isEditing && <p className="flex-1 text-[10px] font-black text-indigo-500 uppercase italic tracking-widest">Editando cuenta...</p>}

                {/* BOTONES DE ACCIÓN: SIEMPRE A LA DERECHA */}
                <div className="flex gap-1 shrink-0">
                    {!isEditing && (
                        <Button size="icon" variant="ghost" onClick={() => setState(p => ({...p, active: !p.active}))} className={cn("h-8 w-8", !state.active ? "text-amber-500 bg-amber-50" : "text-slate-300")}>
                            {state.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => setIsEditing(!isEditing)} className={cn("h-8 w-8", isEditing ? "text-rose-500 bg-rose-50" : "text-slate-400")}>
                        {isEditing ? <X className="h-4 w-4" /> : <Pencil className="h-3.5 w-3.5" />}
                    </Button>
                    {isEditing && (
                        <Button size="icon" variant="ghost" onClick={handleSave} disabled={loading} className="h-8 w-8 text-emerald-600 bg-emerald-50">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4" />}
                        </Button>
                    )}
                </div>
            </div>

            {isEditing && (
                <div className="mt-4 border-t pt-4">
                    <AccountFormFields 
                        templates={templates}
                        data={state}
                        onChange={(f: string, v: any) => {
                            if (f === 'slug') setIsSlugCustom(true);
                            setState(p => ({...p, [f]: v}));
                        }}
                    />
                </div>
            )}
        </div>
    );
}


// --- FORMULARIO NUEVA CUENTA ---
function NewAccountForm({ templates, onSuccess }: { templates: any[], onSuccess: () => void }) {
    const [pending, setPending] = useState(false);
    const [isSlugCustom, setIsSlugCustom] = useState(false);
    const [state, setState] = useState({
        name: '', slug: '', number: '', balance: '0', type: 'checking', autoMirror: false, importerId: 'none', color: '#6366f1', letter: ''
    });

    useEffect(() => {
        if (!isSlugCustom) setState(p => ({ ...p, slug: slugify(p.name), letter: p.name.charAt(0).toUpperCase() }));
    }, [state.name, isSlugCustom]);

    const handleSave = async () => {
        setPending(true);
        const fd = new FormData();
        Object.entries(state).forEach(([k, v]) => fd.append(k, String(v)));
        fd.append('color_theme', state.color); // Mapeo de nombres de campo para la action
        fd.append('account_number', state.number);
        fd.append('initial_balance', state.balance);
        fd.append('account_type', state.type);
        fd.append('auto_mirror_transfers', String(state.autoMirror));
        fd.append('avatar_letter', state.letter);

        const res = await createAccount({} as any, fd);
        if (res.success) onSuccess();
        setPending(false);
    };

    return (
        <div className="space-y-4">
            <AccountFormFields 
                templates={templates}
                data={state}
                onChange={(f: string, v: any) => {
                    if (f === 'slug') setIsSlugCustom(true);
                    setState(p => ({...p, [f]: v}));
                }}
            />
            <Button onClick={handleSave} disabled={pending} className="w-full bg-slate-900 h-12 rounded-2xl font-black uppercase text-[10px] tracking-widest">
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear Nueva Cuenta"}
            </Button>
        </div>
    );
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
                                <NewAccountForm onSuccess={() => setShowNew(false)} templates={templates} />
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