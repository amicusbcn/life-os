// app/finance/components/AccountSettingsDialog.tsx
'use client'

import React, { useState, useEffect } from "react"
import { useRouter } from 'next/navigation'
import { createAccount, updateAccount } from "@/app/finance/actions/accounts" 
import { FinanceAccount } from "@/types/finance" 
import { ActionResponse } from "@/types/common"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from 'sonner'
import { cn } from "@/lib/utils"
import { AccountAvatar } from "./AccountAvatar"
import { 
    Plus, Check, X, Pencil, EyeOff, Eye, Landmark, Loader2, History, FileText, Settings
} from "lucide-react"
import { AccountFormFields } from "./AccountFormFields"
import { Badge } from "@/components/ui/badge"

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
        .replace(/\s/g, '') 
        .replace(/(.{4})/g, '$1 ') 
        .trim()
        .toUpperCase();
};

// --- FILA DE CUENTA ---
function AccountRow({ account }: { account: FinanceAccount }) {
    const [isEditing, setIsEditing] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

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
                
                {isEditing && <p className="flex-1 text-[10px] font-black text-indigo-500 uppercase italic tracking-widest">Editando cuenta...</p>}

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
function NewAccountForm({ onSuccess }: { onSuccess: () => void }) {
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
        fd.append('color_theme', state.color);
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

// --- TABLA DE HISTORIAL DE IMPORTACIONES ---
function HistoryTab({ history = [] }: { history?: any[] }) {
    return (
        <div className="flex-1 overflow-y-auto pr-1 space-y-2">
            {history.length === 0 ? (
                <div className="text-center py-20 text-slate-400 italic bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    <History className="h-10 w-10 mx-auto mb-3 opacity-20 text-slate-500" />
                    <p className="text-sm font-medium">No hay registros de importación todavía.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Los archivos que importes aparecerán listados aquí.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-3">
                        Registros de auditoría ({history.length})
                    </p>
                    {history.map((log: any) => (
                        <div 
                            key={log.id} 
                            className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex items-center justify-between gap-4"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                                    <FileText className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-slate-700 truncate">
                                        {log.name || `Importación #${log.id.slice(0, 5)}`}
                                    </p>
                                    <p className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                        <span className="font-medium text-slate-500">
                                            {log.accounts?.name || 'Cuenta no disponible'}
                                        </span>
                                        • 
                                        <span>
                                            {new Date(log.created_at).toLocaleDateString(undefined, {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    </p>
                                </div>
                            </div>
                            <Badge 
                                variant="secondary" 
                                className="text-[10px] font-black tracking-tight px-2.5 py-1 bg-slate-100 text-slate-600 shrink-0 border border-slate-200"
                            >
                                {log.row_count ?? 0} movs
                            </Badge>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// --- DIÁLOGO PRINCIPAL CON SECTOR DE PESTAÑAS ---
export function AccountSettingsDialog({ 
    initialAccounts, 
    history = [],
    children 
}: { 
    initialAccounts: FinanceAccount[], 
    history?: any[],
    children: React.ReactNode 
}) {
    const [open, setOpen] = useState(false)
    const [activeTab, setActiveTab] = useState<'accounts' | 'history'>('accounts')
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
                <DialogContent className="sm:max-w-[480px] h-[85vh] flex flex-col bg-slate-50 p-0 overflow-hidden border-none shadow-2xl">
                    <DialogHeader className="p-6 pb-4 bg-white border-b space-y-4">
                        <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-800">
                            <Settings className="h-5 w-5 text-indigo-500" /> Configuración de Cuentas
                        </DialogTitle>

                        {/* PESTAÑAS TIPO SELECTOR (Igual que en Categorías) */}
                        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl">
                            <button
                                onClick={() => setActiveTab('accounts')}
                                className={cn(
                                    "flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all",
                                    activeTab === 'accounts'
                                        ? "bg-white text-slate-800 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                <Landmark className="h-3.5 w-3.5 text-indigo-500" /> Mis Cuentas
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={cn(
                                    "flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all",
                                    activeTab === 'history'
                                        ? "bg-white text-slate-800 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                <History className="h-3.5 w-3.5 text-indigo-500" /> Historial Import
                            </button>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 flex flex-col overflow-hidden p-4 pt-4">
                        {activeTab === 'accounts' && (
                            <>
                                <Button 
                                    variant="outline" 
                                    className="w-full mb-4 border-dashed border-slate-300 bg-white hover:bg-slate-50 text-slate-500 gap-2 h-11 font-bold text-xs shrink-0"
                                    onClick={() => setShowNew(!showNew)}
                                >
                                    {showNew ? <X className="h-4 w-4"/> : <Plus className="h-4 w-4" />}
                                    {showNew ? "Cerrar" : "Añadir Cuenta"}
                                </Button>

                                {showNew && (
                                    <div className="mb-6 p-4 bg-white rounded-xl border border-indigo-100 shadow-md animate-in slide-in-from-top-2 shrink-0">
                                        <NewAccountForm onSuccess={() => setShowNew(false)} />
                                    </div>
                                )}

                                <div className="flex-1 overflow-y-auto space-y-1">
                                    {initialAccounts.map((acc: FinanceAccount) => (
                                        <AccountRow key={acc.id} account={acc} />
                                    ))}
                                </div>
                            </>
                        )}

                        {activeTab === 'history' && (
                            <HistoryTab history={history} />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}