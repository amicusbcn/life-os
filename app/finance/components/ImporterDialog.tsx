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
import { CheckCircle2, AlertTriangle, FileText, ArrowRight, RotateCcw, Info, ShieldAlert } from 'lucide-react';
import { getAccountFileLimitsAction } from '../actions/importers';
import { analyzeCsvImport, AppBounds, CsvImportSettings } from '../actions/importEngine';

const ALL_FIELDS = [
    { key: 'operation_date', label: 'Fecha de Operación' },
    { key: 'concept', label: 'Concepto / Descripción' },
    { key: 'amount', label: 'Importe' },
    { key: 'bank_balance', label: 'Saldo (Opcional)' },
];

interface TriggerProps {
    onSelect?: (e: any) => void;
    onClick?: (e: React.MouseEvent) => void;
}

export function ImporterDialog({ accounts, children }: PropsWithChildren<{ accounts: FinanceAccount[] }>) {
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [delimiter] = useState(';');
    const [headers, setHeaders] = useState<string[]>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [fileOrder, setFileOrder] = useState<'newest_first' | 'oldest_first'>('newest_first');
    const [detectedCount, setDetectedCount] = useState(0);

    // Extremos y saldos calculados dinámicamente desde el Libro Diario (finance_transactions)
    const [appNewestDate, setAppNewestDate] = useState<string | null>(null);
    const [appOldestDate, setAppOldestDate] = useState<string | null>(null);
    const [appCurrentBalance, setAppCurrentBalance] = useState<number>(0);
    const [appInitialBalance, setAppInitialBalance] = useState<number>(0);

    const [invertAmount, setInvertAmount] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    const childElement = React.Children.only(children) as React.ReactElement<TriggerProps>;
    
    const trigger = React.cloneElement(childElement, {
        onSelect: (e: any) => {
            if (e?.preventDefault) e.preventDefault();
            setIsOpen(true);
        },
        onClick: (e: React.MouseEvent) => {
            e.stopPropagation();
            setIsOpen(true);
        },
    });

    const resetDialog = () => {
        setFile(null);
        setStep('upload');
        setSelectedAccountId('');
        setDetectedCount(0);
        setIsImporting(false);
    };

    const [csvLines, setCsvLines] = useState<string[][]>([]);

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

            if (dataRows.length >= 2) {
                const dateIdx = foundHeaders.findIndex(h => {
                    const header = h.toLowerCase();
                    return header.includes('fec') || header.includes('date') || header.includes('operación');
                });

                if (dateIdx !== -1) {
                    const parseRowDate = (dateStr: string) => {
                        if (!dateStr) return null;
                        const parts = dateStr.trim().split('/');
                        if (parts.length !== 3) return null;
                        return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
                    };

                    const firstDateObj = parseRowDate(dataRows[0][dateIdx]);
                    const lastDateObj = parseRowDate(dataRows[dataRows.length - 1][dateIdx]);

                    if (firstDateObj && lastDateObj && !isNaN(firstDateObj.getTime()) && !isNaN(lastDateObj.getTime())) {
                        if (firstDateObj.getTime() > lastDateObj.getTime()) {
                            setFileOrder('newest_first');
                        } else if (firstDateObj.getTime() < lastDateObj.getTime()) {
                            setFileOrder('oldest_first');
                        }
                    }
                }
            }
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

    const preparePreview = async () => {
        const dateIdx = headers.indexOf(mapping['operation_date']);
        const amIdx = headers.indexOf(mapping['amount']);
        
        if (dateIdx === -1 || amIdx === -1) {
            toast.error("Faltan columnas críticas (Fecha/Importe) según la plantilla");
            return;
        }

        if (csvLines.length === 0) return;

        try {
            const res = await getAccountFileLimitsAction(selectedAccountId);
            if (res.success) {
                setAppNewestDate(res.newestDate || null);
                setAppOldestDate(res.oldestDate || null);
                setAppCurrentBalance(res.currentBalance ?? 0);
                setAppInitialBalance(res.initialBalance ?? 0);
            } else {
                toast.error(res.error || 'Error al cargar límites de la app');
            }
        } catch (err) {
            console.error(err);
            toast.error('Error al obtener límites de fechas de la base de datos');
        }
        setStep('preview');
    };

    // =================================================================
    // ANÁLISIS EN TIEMPO REAL MEDIANTE EL MOTOR PURO (importEngine.ts)
    // =================================================================
    const settings: CsvImportSettings = {
        dateIdx: headers.indexOf(mapping['operation_date']),
        conceptIdx: headers.indexOf(mapping['concept']),
        amountIdx: headers.indexOf(mapping['amount']),
        balanceIdx: headers.indexOf(mapping['bank_balance']),
        invertAmount,
        fileOrder
    };

    const appBounds: AppBounds = {
        appNewestDate,
        appOldestDate,
        appCurrentBalance, // 💡 CORREGIDO: Leemos el estado dinámico sincronizado de la BD
        appInitialBalance  // 💡 CORREGIDO: Leemos el estado dinámico sincronizado de la BD
    };

    // Ejecutamos la función pura de análisis del motor
    const analysis = analyzeCsvImport(csvLines, settings, appBounds);

    const executeImport = async () => {
        if (analysis.isBlocked || analysis.rowsToInsert.length === 0) return;

        setIsImporting(true);
        const toastId = toast.loading("Sincronizando con la base de datos...");
        const formData = new FormData();
        formData.append('file', file!);
        formData.append('accountId', selectedAccountId);
        formData.append('importMode', analysis.realMode); 
        formData.append('invertAmount', String(invertAmount));
        formData.append('fileOrder', fileOrder);

        try {
            const result = await importCsvTransactionsAction(formData, { 
                delimiter, 
                settings: { 
                    column_map: { 
                        date: settings.dateIdx, 
                        concept: settings.conceptIdx, 
                        amount: settings.amountIdx, 
                        bank_balance: settings.balanceIdx 
                    }, 
                    invert_sign: invertAmount, 
                    has_two_columns: false 
                } 
            } as any);

            if (result.success) {
                toast.success("Importación finalizada con éxito", { id: toastId });
                setIsOpen(false);
                resetDialog();
            } else {
                toast.error(result.error, { id: toastId });
            }
        } catch (err) {
            toast.error("Error al procesar la importación", { id: toastId });
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <>
            {trigger}
            <Dialog open={isOpen} onOpenChange={(open) => { if(!open) resetDialog(); setIsOpen(open); }}>
                <DialogContent className="sm:max-w-lg bg-white p-0 overflow-hidden border-none shadow-2xl">
                    <DialogHeader className="p-6 bg-slate-900 text-white flex flex-row items-center justify-between space-y-0">
                        <DialogTitle className="text-xl font-black italic tracking-tighter flex items-center gap-2">
                            <FileText className="w-5 h-5 text-indigo-400" /> IMPORTADOR BANCARIO
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
                                    <label className="text-[10px] font-black uppercase text-slate-400 italic">2. Archivo CSV</label>
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

                                <div className="space-y-2 mt-4">
                                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <p className="text-[10px] font-black text-amber-600 uppercase tracking-tight">Invertir signo</p>
                                            <p className="text-[9px] text-amber-700/60 leading-tight">Activa si los gastos salen en positivo</p>
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            checked={invertAmount} 
                                            onChange={(e) => setInvertAmount(e.target.checked)}
                                            className="w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                                        />
                                    </div>
                                </div>

                                <Button className="w-full h-12 bg-slate-900 text-white font-bold mt-4" onClick={preparePreview}>
                                    Continuar a Revisión <ArrowRight className="ml-2 w-4 h-4" />
                                </Button>
                            </div>
                        )}

                        {step === 'preview' && (
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-black uppercase text-slate-700 tracking-tight">
                                        Paso 3: Diagnóstico e Integridad
                                    </h3>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        Evaluación del extracto contra la línea temporal de la cuenta.
                                    </p>
                                </div>

                                {/* MÉTRICAS DE TRANSPARENCIA */}
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-center">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">Leídos</p>
                                        <p className="text-base font-black text-slate-700 font-mono">{analysis.totalCsvRows}</p>
                                    </div>
                                    <div className="p-2.5 bg-indigo-50/60 border border-indigo-100 rounded-xl text-center">
                                        <p className="text-[9px] font-bold text-indigo-500 uppercase">A Insertar</p>
                                        <p className="text-base font-black text-indigo-700 font-mono">{analysis.rowsToInsert.length}</p>
                                    </div>
                                    <div className="p-2.5 bg-amber-50/60 border border-amber-100 rounded-xl text-center">
                                        <p className="text-[9px] font-bold text-amber-600 uppercase">Omitidos</p>
                                        <p className="text-base font-black text-amber-700 font-mono">{analysis.dupesCount + analysis.unmatchedInBetweenCount}</p>
                                    </div>
                                </div>

                                {/* BANNER DE RESULTADO DINÁMICO */}
                                {analysis.bannerType === 'success' && (
                                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-[11px] space-y-1">
                                        <p className="font-bold flex items-center gap-1.5 uppercase text-emerald-900 tracking-tight">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {analysis.bannerTitle}
                                        </p>
                                        <p className="text-emerald-700/90 leading-relaxed">{analysis.bannerMessage}</p>
                                    </div>
                                )}

                                {analysis.bannerType === 'warning' && (
                                    <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-[11px] space-y-1">
                                        <p className="font-bold flex items-center gap-1.5 uppercase text-amber-900 tracking-tight">
                                            <AlertTriangle className="w-4 h-4 text-amber-600" /> {analysis.bannerTitle}
                                        </p>
                                        <p className="text-amber-700/90 leading-relaxed">{analysis.bannerMessage}</p>
                                    </div>
                                )}

                                {analysis.bannerType === 'error' && (
                                    <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-[11px] space-y-1.5">
                                        <p className="font-bold flex items-center gap-1.5 uppercase text-rose-900 tracking-tight">
                                            <ShieldAlert className="w-4 h-4 text-rose-600" /> {analysis.bannerTitle}
                                        </p>
                                        <p className="text-rose-700/90 leading-relaxed font-medium">{analysis.bannerMessage}</p>
                                    </div>
                                )}

                                {analysis.bannerType === 'info' && (
                                    <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-[11px] space-y-1">
                                        <p className="font-bold flex items-center gap-1.5 uppercase text-blue-900 tracking-tight">
                                            <Info className="w-4 h-4 text-blue-600" /> {analysis.bannerTitle}
                                        </p>
                                        <p className="text-blue-700/90 leading-relaxed">{analysis.bannerMessage}</p>
                                    </div>
                                )}

                                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                                    <Button
                                        variant="outline"
                                        onClick={() => setStep('mapping')}
                                        disabled={isImporting}
                                        className="text-xs h-8"
                                    >
                                        Atrás
                                    </Button>
                                    <Button
                                        onClick={executeImport}
                                        disabled={analysis.isBlocked || analysis.rowsToInsert.length === 0 || isImporting}
                                        className={`text-xs h-8 font-bold px-4 ${
                                            analysis.isBlocked || analysis.rowsToInsert.length === 0
                                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                        }`}
                                    >
                                        {isImporting ? 'Procesando...' : analysis.rowsToInsert.length === 0 ? 'Sin cambios' : 'Confirmar e Importar'}
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