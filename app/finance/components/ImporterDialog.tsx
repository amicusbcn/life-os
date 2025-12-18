'use client';

import React, { useState, useRef, useMemo, PropsWithChildren } from 'react'; 
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImporterTemplate, FinanceAccount } from '@/types/finance'; 
import { importCsvTransactionsAction } from '../actions'; 
import { toast } from 'sonner';

interface CloneableElementProps {
    onClick?: (e: React.MouseEvent) => void;
    onSelect?: (e: Event) => void; 
}

const REQUIRED_FIELDS = [
    { key: 'operation_date', label: 'Fecha de Operación' },
    { key: 'concept', label: 'Concepto / Descripción' },
    { key: 'amount', label: 'Importe' },
];

export function ImporterDialog({ accounts, children }: PropsWithChildren<{ accounts: FinanceAccount[] }>) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedAccountId, setSelectedAccountId] = useState<string>(''); // 🚨 Nuevo estado
    const [file, setFile] = useState<File | null>(null);
    const [delimiter, setDelimiter] = useState<string>(';');
    const [step, setStep] = useState<'upload' | 'mapping'>('upload');
    const [headers, setHeaders] = useState<string[]>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({});

    // 🚨 LÓGICA DE CLONACIÓN (Sin duplicar el botón)
    const childElement = children as React.ReactElement<CloneableElementProps>;
    const trigger = React.cloneElement(childElement, {
        onSelect: (e: Event) => {
            e.preventDefault(); 
            setIsOpen(true);
        },
        onClick: (e: React.MouseEvent) => {
            e.stopPropagation();
        },
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFile = e.target.files?.[0] || null;
        if (uploadedFile) {
            setFile(uploadedFile);
            const reader = new FileReader();
            reader.onload = (event) => {
                const content = event.target?.result as string;
                const lines = content.split('\n');
                let detectedHeaders: string[] = [];
                
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (line.length < 10 || line.startsWith('---')) continue; 
                    const potential = line.split(delimiter).map(h => h.trim().replace(/"/g, ''));
                    const hasFields = potential.some(h => h.toLowerCase().includes('importe') || h.toLowerCase().includes('fecha'));
                    if (hasFields && potential.length > 2) {
                        detectedHeaders = potential.filter(h => h.length > 0); 
                        break;
                    }
                }

                if (detectedHeaders.length > 1) {
                    setHeaders(detectedHeaders);
                    const initial: Record<string, string> = {};
                    REQUIRED_FIELDS.forEach(f => {
                        const match = detectedHeaders.find(h => h.toLowerCase().includes(f.key.split('_')[0]));
                        initial[f.key] = match || 'none';
                    });
                    setMapping(initial);
                    setStep('mapping');
                } else {
                    toast.error("No se detectaron cabeceras. Revisa el delimitador.");
                }
            };
            reader.readAsText(uploadedFile);
        }
    };
    
    const handleSubmit = async () => {
        if (!file || !selectedAccountId) {
            toast.error("Selecciona un archivo y una cuenta de destino.");
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('accountId', selectedAccountId); // 🚨 Enviamos la cuenta elegida

        const template = { name: file.name, delimiter, mapping };
        const result = await importCsvTransactionsAction(formData, template as any);
        
        if (result.success) {
            toast.success(`Importado con éxito en la cuenta seleccionada.`);
            setIsOpen(false);
            resetDialog();
        } else {
            toast.error(`Error: ${result.error}`);
        }
    };

    const resetDialog = () => {
        setFile(null);
        setStep('upload');
        setSelectedAccountId('');
    };

    return (
        <>
            {trigger}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Importar Transacciones</DialogTitle>
                    </DialogHeader>

                    {step === 'upload' && (
                        <div className="space-y-4 py-4">
                            {/* 🚨 SELECTOR DE CUENTA */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Cuenta de Destino</label>
                                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="¿A qué cuenta pertenece este archivo?" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {accounts.map(acc => (
                                            <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Delimitador</label>
                                    <Select value={delimiter} onValueChange={setDelimiter}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value=",">Coma (,)</SelectItem>
                                            <SelectItem value=";">Punto y Coma (;)</SelectItem>
                                            <SelectItem value="\t">Tabulación (TAB)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Archivo</label>
                                    <Input type="file" accept=".csv,.txt" onChange={handleFileChange} />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'mapping' && (
                        <div className="space-y-4 py-4">
                            <p className="text-xs text-slate-500 italic">Columnas: {headers.join(' | ')}</p>
                            {REQUIRED_FIELDS.map(f => (
                                <div key={f.key} className="flex items-center gap-4">
                                    <label className="w-1/3 text-sm">{f.label}</label>
                                    <Select value={mapping[f.key]} onValueChange={(v) => setMapping(p => ({...p, [f.key]: v}))}>
                                        <SelectTrigger className="w-2/3"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ))}
                            <Button className="w-full mt-4" onClick={handleSubmit}>Finalizar Importación</Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}