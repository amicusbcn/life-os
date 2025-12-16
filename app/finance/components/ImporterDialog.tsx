'use client'

import React, { useState, useActionState } from "react"
import { importC43Action, ImportResult } from "@/app/finance/actions" 
import { FinanceAccount } from "@/types/finance" 

// UI Components
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

// Icons & Hooks
import {  useFormStatus } from 'react-dom';
import { Loader2, Upload, FileText, Banknote } from "lucide-react"
import { toast } from 'sonner';

// --- Global/Shared Types ---
interface CloneableElementProps {
    onSelect?: (e: Event) => void;
    onClick?: (e: React.MouseEvent) => void;
}
interface ImporterDialogProps {
    accounts: FinanceAccount[]; // Lista de cuentas disponibles para cargar el archivo
    children: React.ReactElement<CloneableElementProps>;
}

// --- SUB-COMPONENTE: BOTÓN DE SUBIDA ---
function SubmitButton() {
    const { pending } = useFormStatus();

    return (
        <Button type="submit" disabled={pending} className="w-full bg-indigo-600 hover:bg-indigo-700">
            {pending ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2"/>
            ) : (
                <Upload className="h-5 w-5 mr-2"/>
            )}
            {pending ? 'Procesando archivo...' : 'Importar y Clasificar'}
        </Button>
    );
}


// --- SUB-COMPONENTE: FORMULARIO DE IMPORTACIÓN ---
function ImporterForm({ accounts, onImported }: { accounts: FinanceAccount[], onImported: (count: number) => void }) {
    
    // El estado inicial debe coincidir con la interfaz ImportResult
    const initialState: ImportResult = {}; 
    
    // La acción es importC43Action, que espera (_prevState, formData)
    const [state, formAction] = useActionState(importC43Action, initialState);
    
    const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>(accounts.length > 0 ? accounts[0].id : undefined);

    React.useEffect(() => {
        if (state.success === true) {
            const count = state.data?.count || 0;
            toast.success(`🎉 ¡Importación completada!`, {
                description: `Se han añadido ${count} movimientos a tu cuenta.`,
            });
            onImported(count); 
        } else if (state.success === false && state.error) {
            toast.error('Error al importar C43', {
                description: state.error,
                duration: 5000,
            });
        }
    }, [state, onImported]);

    // La función 'ResetFormOnSuccess' es un buen patrón, pero simplificamos con el estado
    
    if (accounts.length === 0) {
        return (
            <div className="text-center p-4 border border-red-300 rounded-lg bg-red-50">
                <p className="text-sm font-semibold text-red-800">No puedes importar.</p>
                <p className="text-sm text-red-600">Por favor, crea primero una cuenta financiera (Ej: Banco BBVA) en la configuración de Cuentas.</p>
            </div>
        );
    }


    return (
        <form action={formAction} className="space-y-4">
            
            {/* 1. Nombre de la Importación */}
            <div className="space-y-1">
                <Label htmlFor="importer_name">Nombre de la Importación</Label>
                <Input 
                    id="importer_name" 
                    name="importer_name" 
                    placeholder="Ej: BBVA Noviembre 2025" 
                    required 
                    defaultValue={`Importación C43 - ${new Date().toLocaleDateString('es-ES')}`}
                />
            </div>

            {/* 2. Cuenta Destino */}
            <div className="space-y-1">
                <Label htmlFor="account_id_select">Cuenta Bancaria Destino</Label>
                <Select 
                    onValueChange={setSelectedAccountId} 
                    defaultValue={selectedAccountId}
                >
                    <SelectTrigger id="account_id_select">
                        <SelectValue placeholder="Selecciona la cuenta destino" />
                    </SelectTrigger>
                    <SelectContent>
                        {accounts.map((acc) => (
                            <SelectItem key={acc.id} value={acc.id}>
                                {acc.name} ({acc.currency})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {/* INPUT OCULTO para el FormData */}
                <input type="hidden" name="account_id" value={selectedAccountId} /> 
            </div>


            {/* 3. Archivo C43 */}
            <div className="space-y-1 pt-2">
                <Label htmlFor="c43_file" className="flex items-center">
                    <FileText className="h-4 w-4 mr-2"/> Selecciona Archivo Cuaderno 43
                </Label>
                <Input 
                    id="c43_file" 
                    name="c43_file" 
                    type="file" 
                    accept=".txt,.c43" // Aunque es un formato de texto, sugerimos extensiones comunes
                    required 
                />
                <p className="text-xs text-slate-500 mt-1">El archivo debe estar en formato N43 (Longitud fija, 160 bytes/línea).</p>
            </div>

            <SubmitButton />
        </form>
    );
}

// --- COMPONENTE PRINCIPAL ---

export function ImporterDialog({ accounts, children }: ImporterDialogProps) {
    const [open, setOpen] = useState(false)
    const [lastImportCount, setLastImportCount] = useState<number | null>(null);

    // Lógica para el Trigger (Patrón de Life-OS)
    const childElement = children as React.ReactElement<CloneableElementProps>;
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

    const handleImported = (count: number) => {
        setLastImportCount(count);
        // Podríamos decidir cerrar el diálogo o mantenerlo abierto
        // setOpen(false); 
    }


    return (
        <>
            {trigger}

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-md flex flex-col rounded-xl p-0 overflow-hidden bg-white">
                    <DialogHeader className="p-4 pb-2 border-b border-slate-100">
                        <DialogTitle className="flex items-center">
                            <Banknote className="w-5 h-5 mr-2 text-indigo-600"/> Importación Bancaria (C43)
                        </DialogTitle>
                    </DialogHeader>

                    <div className="p-4 space-y-4">
                        <ImporterForm accounts={accounts} onImported={handleImported} />

                        {lastImportCount !== null && (
                            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                                Última importación: **{lastImportCount}** movimientos añadidos.
                            </div>
                        )}
                        
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}