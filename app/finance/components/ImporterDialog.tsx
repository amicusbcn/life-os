// app/finance/components/ImporterDialog.tsx
'use client';

import React, { useState, PropsWithChildren } from 'react'; 
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FinanceAccount } from '@/types/finance'; 
import { importCsvTransactionsAction } from '../actions'; 
import { toast } from 'sonner';
import { CheckCircle2, AlertTriangle, FileText, ArrowRight, RotateCcw } from 'lucide-react';

const ALL_FIELDS = [
    { key: 'operation_date', label: 'Fecha de Operación' },
    { key: 'concept', label: 'Concepto / Descripción' },
    { key: 'amount', label: 'Importe' },
    { key: 'bank_balance', label: 'Saldo (Opcional)' },
];

export function ImporterDialog({ accounts, children }: PropsWithChildren<{ accounts: FinanceAccount[] }>) {
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [delimiter, setDelimiter] = useState(';');
    const [headers, setHeaders] = useState<string[]>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [importMode, setImportMode] = useState<'new' | 'historic'>('new');
    
    const [detectedCount, setDetectedCount] = useState(0);
    const [csvCheckBalance, setCsvCheckBalance] = useState<number | null>(null);

    const childElement = children as React.ReactElement;
    const trigger = React.cloneElement(childElement, {
        onSelect: (e: Event) => { e.preventDefault(); setIsOpen(true); },
        onClick: (e: React.MouseEvent) => { e.stopPropagation(); setIsOpen(true); },
    });

    const resetDialog = () => {
        setFile(null);
        setStep('upload');
        setSelectedAccountId('');
        setImportMode('new');
        setDetectedCount(0);
        setCsvCheckBalance(null);
    };

    const [csvLines, setCsvLines] = useState<string[][]>([]); // Guardamos las filas para procesarlas luego

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFile = e.target.files?.[0];
        if (!uploadedFile) return;
        setFile(uploadedFile);

        const reader = new FileReader();
        reader.onload = (event) => {
            const lines = (event.target?.result as string).split('\n');
            let foundHeaders: string[] = [];
            const dataRows: string[][] = [];

            for (let line of lines) {
                const trimmed = line.trim();
                if (trimmed.length < 10 || trimmed.startsWith('---')) continue;
                const columns = trimmed.split(delimiter).map(c => c.trim().replace(/"/g, ''));

                if (foundHeaders.length === 0 && columns.some(c => {
                    const h = c.toLowerCase();
                    return h.includes('importe') || h.includes('fecha') || h.includes('date') || h.includes('amount');
                })) {
                    foundHeaders = columns.filter(c => c.length > 0);
                    continue;
                }

                if (foundHeaders.length > 0) {
                    dataRows.push(columns);
                }
            }

            setHeaders(foundHeaders);
            setCsvLines(dataRows);
            setDetectedCount(dataRows.length);

            const initialMap: Record<string, string> = {};
            ALL_FIELDS.forEach(f => {
                const key = f.key.toLowerCase();
                const match = foundHeaders.find(h => {
                    const header = h.toLowerCase();
                    if (key.includes('date')) return header.includes('fec') || header.includes('date') || header.includes('operación');
                    if (key.includes('concept')) return header.includes('concep') || header.includes('descrip') || header.includes('detalle') || header.includes('movimiento');
                    if (key.includes('amount')) return header.includes('imp') || header.includes('amount') || header.includes('cuant');
                    if (key.includes('balance')) return header.includes('sal') || header.includes('bal') || header.includes('disp');
                    return false;
                });
                initialMap[f.key] = match || 'none';
            });

            setMapping(initialMap);
            setStep('mapping');
        };
        reader.readAsText(uploadedFile);
    };

const preparePreview = () => {
    const dateIdx = headers.indexOf(mapping['operation_date']);
    const balIdx = headers.indexOf(mapping['bank_balance']);
    const amIdx = headers.indexOf(mapping['amount']);

    if (dateIdx === -1 || amIdx === -1) {
        toast.error("Debes mapear al menos Fecha e Importe");
        return;
    }

    let minDateObj: Date | null = null;
    let balanceToCompare: number | null = null;
    let infoOldest = {}; // Para el log final

    csvLines.forEach((columns, index) => {
        const rawDate = columns[dateIdx];
        const rawBal = columns[balIdx];
        const rawAm = columns[amIdx];
        
        const parseSpanishFloat = (str: string, label: string) => {
            if (!str) return 0;
            let n = str.trim();
            // Eliminamos puntos de millar, cambiamos coma por punto
            const clean = n.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
            const result = parseFloat(clean) || 0;
            
            // LOG DE TRADUCCIÓN (Solo para la primera línea o si sospechamos)
            // console.log(`[Fila ${index}] ${label}: "${str}" -> "${clean}" -> ${result}`);
            
            return result;
        };

        const balNum = parseSpanishFloat(rawBal, "Saldo");
        const amNum = parseSpanishFloat(rawAm, "Importe");

        const parts = rawDate.split('/');
        const currentDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));

        if (!isNaN(currentDate.getTime())) {
            if (!minDateObj || currentDate < minDateObj) {
                minDateObj = currentDate;
                
                // Cálculo con céntimos
                const res = (Math.round(balNum * 100) - Math.round(amNum * 100)) / 100;
                balanceToCompare = res;
                
                infoOldest = {
                    fila: index,
                    fecha: rawDate,
                    saldo_original: rawBal,
                    saldo_parseado: balNum,
                    importe_original: rawAm,
                    importe_parseado: amNum,
                    calculo_previo: res
                };
            }
        }
    });

    // REVELACIÓN EN CONSOLA
    console.log("🔍 DIAGNÓSTICO MOVIMIENTO MÁS ANTIGUO:", infoOldest);

    setCsvCheckBalance(balanceToCompare);
    setStep('preview');
};

    const executeImport = async () => {
        const toastId = toast.loading("Sincronizando con la base de datos...");
        const formData = new FormData();
        formData.append('file', file!);
        formData.append('accountId', selectedAccountId);
        formData.append('importMode', importMode);

        const result = await importCsvTransactionsAction(formData, { name: file!.name, delimiter, mapping } as any);
        if (result.success) {
            toast.success("Importación finalizada", { id: toastId });
            setIsOpen(false);
            resetDialog();
        } else {
            toast.error(result.error, { id: toastId });
        }
    };

    const selectedAccount = accounts.find(a => a.id === selectedAccountId);
    // Comparación con margen de error de 1 céntimo
    const isBalanceOk = csvCheckBalance === null || Math.abs((selectedAccount?.current_balance || 0) - csvCheckBalance) < 0.01;

    return (
        <>
            {trigger}
            <Dialog open={isOpen} onOpenChange={(open) => { if(!open) resetDialog(); setIsOpen(open); }}>
                <DialogContent className="sm:max-w-lg bg-white p-0 overflow-hidden border-none shadow-2xl">
                    <DialogHeader className="p-6 bg-slate-900 text-white flex flex-row items-center justify-between space-y-0">
                        <DialogTitle className="text-xl font-black italic tracking-tighter flex items-center gap-2">
                            <FileText className="w-5 h-5 text-indigo-400" /> IMPORTADOR
                        </DialogTitle>
                        {step !== 'upload' && (
                            <Button variant="ghost" size="sm" onClick={resetDialog} className="text-slate-400 hover:text-white h-8 text-[10px] font-bold uppercase">
                                <RotateCcw className="w-3 h-3 mr-1" /> Reiniciar
                            </Button>
                        )}
                    </DialogHeader>

                    <div className="p-6 space-y-6">
                        {step === 'upload' && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 italic">1. Cuenta Destino</label>
                                    <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                                        <SelectTrigger className="h-12 border-slate-200"><SelectValue placeholder="Selecciona cuenta..." /></SelectTrigger>
                                        <SelectContent>{accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 italic">2. Archivo</label>
                                    <Input type="file" accept=".csv" onChange={handleFileChange} className="h-12 pt-2.5 cursor-pointer" />
                                </div>
                            </div>
                        )}

                        {step === 'mapping' && (
                            <div className="space-y-4">
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Detectados: {detectedCount} registros</span>
                                    <Button variant="link" className="h-auto p-0 text-[10px] text-indigo-600 font-bold" onClick={() => setStep('upload')}>Cambiar archivo</Button>
                                </div>
                                <div className="space-y-3">
                                    {ALL_FIELDS.map(f => (
                                        <div key={f.key} className="flex items-center gap-4">
                                            <label className="text-xs font-bold text-slate-600 w-1/3">{f.label}</label>
                                            <Select value={mapping[f.key] || 'none'} onValueChange={(v) => setMapping(p => ({...p, [f.key]: v}))}>
                                                <SelectTrigger className="w-2/3 h-9 text-xs"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">-- Ignorar --</SelectItem>
                                                    {headers.map(h => <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    ))}
                                </div>
                                <Button className="w-full h-12 bg-slate-900 text-white font-bold mt-4" onClick={preparePreview}>
                                    Continuar a Revisión <ArrowRight className="ml-2 w-4 h-4" />
                                </Button>
                            </div>
                        )}

                        {step === 'preview' && (
                            <div className="space-y-4">
                                <div className={`p-5 rounded-2xl border-2 transition-all ${isBalanceOk ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase text-slate-400">Validación de Saldo</p>
                                            <p className={`text-sm font-bold ${isBalanceOk ? 'text-emerald-700' : 'text-amber-700'}`}>
                                                {isBalanceOk ? '✅ Los saldos encajan' : '⚠️ Desfase detectado'}
                                            </p>
                                        </div>
                                        {isBalanceOk ? <CheckCircle2 className="text-emerald-500 w-8 h-8" /> : <AlertTriangle className="text-amber-500 w-8 h-8" />}
                                    </div>

                                    <div className="space-y-2 pt-2 border-t border-black/5">
                                        <div className="flex justify-between text-[11px]">
                                            <span className="text-slate-500">Saldo actual en App:</span>
                                            <span className="font-mono font-bold">{selectedAccount?.current_balance.toLocaleString(undefined, {minimumFractionDigits: 2})} €</span>
                                        </div>
                                        <div className="flex justify-between text-[11px]">
                                            <span className="text-slate-500">Saldo previo según Banco:</span>
                                            <span className="font-mono font-bold">{csvCheckBalance?.toLocaleString(undefined, {minimumFractionDigits: 2}) || 'N/A'} €</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                    <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block italic">¿Cómo quieres procesar esto?</label>
                                    <Select value={importMode} onValueChange={(v: any) => setImportMode(v)}>
                                        <SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="new">🚀 Como movimientos nuevos</SelectItem>
                                            <SelectItem value="historic">📜 Como datos históricos</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <Button variant="outline" className="flex-1 h-12 font-bold" onClick={() => setStep('mapping')}>Atrás</Button>
                                    <Button className="flex-[2] h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black" onClick={executeImport}>
                                        CONFIRMAR E IMPORTAR
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}