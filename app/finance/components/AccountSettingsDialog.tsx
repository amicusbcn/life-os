// app/finance/components/AccountSettingsDialog.tsx
'use client'

import React, { useState, useEffect, useRef } from "react"
import { useRouter } from 'next/navigation';
import { useActionState } from 'react'; 
import { useFormStatus } from 'react-dom';

import { deleteAccount, createAccount, updateAccount, ActionResult, CreateAccountResult } from "@/app/finance/actions" 
import { FinanceAccount, FinanceAccountType } from "@/types/finance" 

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Loader2, CreditCard, Wallet, Trash2, Plus, Pencil, Check, X } from "lucide-react"
import { toast } from 'sonner';

// --- Global/Shared Types ---
interface CloneableElementProps {
	onSelect?: (e: Event) => void;
	onClick?: (e: React.MouseEvent) => void;
}
interface AccountSettingsDialogProps {
	initialAccounts: FinanceAccount[];
	children: React.ReactElement<CloneableElementProps>;
}

// Lista estática de Tipos de Cuenta
const ACCOUNT_TYPES: { value: FinanceAccountType, label: string }[] = [
	{ value: 'checking', label: 'Cuenta Corriente' },
	{ value: 'savings', label: 'Cuenta de Ahorro' },
	{ value: 'credit_card', label: 'Tarjeta de Crédito' },
	{ value: 'loan', label: 'Préstamo / Deuda' },
	{ value: 'investment', label: 'Inversión' },
	{ value: 'cash', label: 'Efectivo' },
];

// --- SUB-COMPONENTE: FILA DE CUENTA (Lectura/Edición) ---
function AccountRow({ account }: { account: FinanceAccount }) {
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [tempName, setTempName] = useState(account.name);
    const [tempBalance, setTempBalance] = useState(account.initial_balance.toString());
    const router = useRouter();

    const handleSave = async () => {
        setLoading(true);
        const formData = new FormData();
        formData.append('id', account.id);
        formData.append('name', tempName);
        formData.append('initial_balance', tempBalance);
        formData.append('account_type', account.account_type);

        const res = await updateAccount({} as ActionResult, formData);
        if (res.success) {
            toast.success('Cuenta actualizada');
            setIsEditing(false);
            router.refresh();
        } else {
            toast.error('Error al actualizar', { description: res.error });
        }
        setLoading(false);
    };

    const handleDelete = async () => {
        if(!confirm(`¿Borrar la cuenta "${account.name}"?`)) return;
        setLoading(true);
        const res = await deleteAccount(account.id);
        if (res.error) {
            toast.error('Error al borrar', { description: res.error });
        } else {
            toast.success('Cuenta eliminada');
            router.refresh();
        }
        setLoading(false);
    }

    const getAccountIcon = (type: FinanceAccountType) => {
        switch(type) {
            case 'credit_card': return <CreditCard className="h-4 w-4 text-indigo-600" />;
            case 'investment': return <Loader2 className="h-4 w-4 text-green-600" />;
            case 'loan': return <Wallet className="h-4 w-4 text-red-600" />; 
            default: return <Wallet className="h-4 w-4 text-blue-600" />;
        }
    }

    return (
        <div className="flex items-center gap-3 p-2 rounded-lg border border-slate-100 bg-white shadow-sm group hover:border-indigo-100 transition-all min-h-[50px]">
            {isEditing ? (
                // --- VISTA EDICIÓN ---
                <div className="flex-1 flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                    <Input 
                        value={tempName} 
                        onChange={(e) => setTempName(e.target.value)}
                        className="h-8 text-xs flex-1 bg-slate-50"
                        autoFocus
                    />
                    <Input 
                        value={tempBalance} 
                        onChange={(e) => setTempBalance(e.target.value)}
                        className="h-8 text-xs w-20 text-right bg-slate-50 font-mono"
                    />
                    <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={handleSave} disabled={loading} className="h-8 w-8 text-green-600 hover:bg-green-50">
                            {loading ? <Loader2 className="h-3 w-3 animate-spin"/> : <Check className="h-4 w-4" />}
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setIsEditing(false)} disabled={loading} className="h-8 w-8 text-slate-400">
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            ) : (
                // --- VISTA LECTURA ---
                <>
                    <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 shadow-sm shrink-0">
                        {getAccountIcon(account.account_type)}
                    </div>
                    <span className="flex-1 text-sm font-medium text-slate-700 truncate">{account.name}</span>
                    
                    <div className="text-right shrink-0 mr-2">
                        <p className={`text-sm font-semibold ${account.initial_balance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                            {account.initial_balance.toFixed(2)} {account.currency}
                        </p>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">
                            {ACCOUNT_TYPES.find(t => t.value === account.account_type)?.label}
                        </p>
                    </div>
                    
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <Button size="icon" variant="ghost" onClick={() => setIsEditing(true)} className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50">
                            <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={handleDelete} disabled={loading} className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50">
                            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <Trash2 className="h-3.5 w-3.5" />}
                        </Button>
                    </div>
                </>
            )}
        </div>
    )
}

// --- SUB-COMPONENTE: FORMULARIO DE CREACIÓN (NewAccountCreator) ---
function NewAccountCreator() {
    
	const initialState: CreateAccountResult = {};
	const [state, formAction] = useActionState(createAccount, initialState);
    
	const { pending } = useFormStatus();
	const router = useRouter(); // Necesario para la recarga
	const formRef = useRef<HTMLFormElement>(null);

	const [selectedType, setSelectedType] = useState<FinanceAccountType>('checking');
	const [selectedCurrency, setSelectedCurrency] = useState<string>('EUR'); 

	useEffect(() => {
		if (state.success === true) {
			toast.success('¡Cuenta creada con éxito!');
			formRef.current?.reset();
			router.refresh(); // <-- FORZAR RECARGA
		} else if (state.success === false && state.error) {
			toast.error('Error al crear cuenta', { description: state.error })
		}
	}, [state, router]);

	return (
		<form ref={formRef} action={formAction} className="flex flex-col gap-2">
			<p className="text-xs font-semibold text-slate-400 uppercase ml-1">Nueva Cuenta</p>
		    
			<Input name="name" placeholder="Nombre de la cuenta (Ej: BBVA)" required className="bg-white h-10 flex-1" />
		    
			<div className="grid grid-cols-2 gap-2">
				<div className="space-y-1">
					<Select onValueChange={(value) => setSelectedType(value as FinanceAccountType)} defaultValue={selectedType} disabled={pending}>
						<SelectTrigger className="h-10 bg-white">
							<SelectValue placeholder="Tipo" />
						</SelectTrigger>
						<SelectContent>
							{ACCOUNT_TYPES.map((type) => (
								<SelectItem key={type.value} value={type.value}>
									{type.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<input type="hidden" name="account_type" value={selectedType} /> 
				</div>

				<Input 
					name="initial_balance" 
					type="text"
					placeholder="Saldo Inicial (0.00)" 
					defaultValue="0.00"
					required
					disabled={pending}
					className="h-10 bg-white"
				/>
			</div>
		    
			<div className="flex gap-2">
				<Select onValueChange={setSelectedCurrency} defaultValue={selectedCurrency} disabled={pending}>
					<SelectTrigger className="w-1/3 h-10 bg-white">
						<SelectValue placeholder="Divisa" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="EUR">€ EUR</SelectItem>
						<SelectItem value="USD">$ USD</SelectItem>
					</SelectContent>
				</Select>
				<input type="hidden" name="currency" value={selectedCurrency} />

				<Button type="submit" disabled={pending} className="bg-slate-900 h-10 flex-1">
					{pending ? <Loader2 className="h-5 w-5 animate-spin"/> : <Plus className="h-5 w-5 mr-2"/>}
					Añadir Cuenta
				</Button>
			</div>
		</form>
	);
}


// --- COMPONENTE PRINCIPAL (Simplificado) ---

export function AccountSettingsDialog({ initialAccounts, children }: AccountSettingsDialogProps) {
	const [open, setOpen] = useState(false)
	// CORRECCIÓN CLAVE: Usamos la prop directamente.
	const accounts = initialAccounts; 
    
	const childElement = children as React.ReactElement<CloneableElementProps>;
	
	// Lógica para el Trigger (Mismo patrón)
	const newOnSelect = (e: Event) => {
		e.preventDefault(); 
		const originalOnSelect = (childElement.props as CloneableElementProps).onSelect;
		if (typeof originalOnSelect === 'function') {
			originalOnSelect(e);
		}
		setOpen(true); 
	};
	
	const trigger = React.cloneElement(childElement, {
		onSelect: newOnSelect,
		onClick: (e: React.MouseEvent) => e.stopPropagation(), 
	} as React.PropsWithChildren<CloneableElementProps>);


	return (
		<>
			{trigger}

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="max-w-md h-[550px] flex flex-col rounded-xl p-0 overflow-hidden bg-white">
					<DialogHeader className="p-4 pb-2 border-b border-slate-100">
						<DialogTitle>Gestión de Cuentas</DialogTitle>
					</DialogHeader>

					{/* Contenido principal: Lista de Cuentas */}
					<div className="flex-1 flex flex-col gap-0 overflow-hidden">
						<div className="flex-1 overflow-y-auto p-4 space-y-2 relative">
							{accounts.length === 0 && <p className="text-center text-sm text-slate-400 mt-10">Sin cuentas definidas</p>}
							{accounts.map((acc) => (
								<AccountRow key={acc.id} account={acc} />
							))}
						</div>
					    
						{/* Creador de Cuentas */}
						<div className="p-3 border-t border-slate-100 bg-slate-50">
							<NewAccountCreator />
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	)
}