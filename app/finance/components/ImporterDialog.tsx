// app/finance/components/ImporterDialog.tsx
'use client';

import React, { useEffect, useState, PropsWithChildren } from 'react'; 
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FinanceAccount } from '@/types/finance'; 
import { importCsvTransactionsAction } from '../actions'; 
import { toast } from 'sonner';
import { CheckCircle2, AlertTriangle, FileText, ArrowRight, RotateCcw } from 'lucide-react';
import { getAccountFileLimitsAction } from '../actions/importers';

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
    const [delimiter, setDelimiter] = useState(';');
    const [headers, setHeaders] = useState<string[]>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [importMode, setImportMode] = useState<'new' | 'historic'>('new');
    const [fileOrder, setFileOrder] = useState<'newest_first' | 'oldest_first'>('newest_first');
    const [detectedCount, setDetectedCount] = useState(0);
    const [csvCheckBalance, setCsvCheckBalance] = useState<number | null>(null);
    const [csvNewestDate, setCsvNewestDate] = useState<string>('');
    const [csvOldestDate, setCsvOldestDate] = useState<string>('');

    // Extremos de lo que ya tenemos guardado en la App (Base de datos)
    const [appNewestDate, setAppNewestDate] = useState<string>('');
    const [appOldestDate, setAppOldestDate] = useState<string>('');
    const [invertAmount, setInvertAmount] = useState(false);
    const [isImporting, setIsImporting] = useState(false); // 💡 ARREGLADO: Estado de carga añadido

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
        setImportMode('new');
        setDetectedCount(0);
        setCsvCheckBalance(null);
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
        const balIdx = headers.indexOf(mapping['bank_balance']);
        const amIdx = headers.indexOf(mapping['amount']);
        
        const hasAmount = amIdx !== -1;
        if (dateIdx === -1 || !hasAmount) {
            toast.error("Faltan columnas críticas (Fecha/Importe) según la plantilla");
            return;
        }

        const parseSpanishFloat = (str: string) => {
            if (!str) return 0;
            let n = str.trim();
            if (n.includes('.') && !n.includes(',')) return parseFloat(n) || 0;
            const clean = n.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
            return parseFloat(clean) || 0;
        };

        if (csvLines.length === 0) return;

        const firstRowDate = csvLines[0][dateIdx]?.trim();
        const lastRowDate = csvLines[csvLines.length - 1][dateIdx]?.trim();

        if (fileOrder === 'newest_first') {
            setCsvNewestDate(firstRowDate || '');
            setCsvOldestDate(lastRowDate || '');
        } else {
            setCsvNewestDate(lastRowDate || '');
            setCsvOldestDate(firstRowDate || '');
        }

        // 1. Cálculo del saldo de apertura inicial del CSV (Se queda intacto)
        let minDateObj: Date | null = null;
        let balanceToCompare: number | null = null;
        const hasBalanceColumn = !(balIdx === -1 || mapping['bank_balance'] === undefined || mapping['bank_balance'] === '' || mapping['bank_balance'] === 'none');
        
        if (hasBalanceColumn) {
            csvLines.forEach((columns) => {
                const rawDate = columns[dateIdx];
                const rawBal = columns[balIdx];
                let amNum = parseSpanishFloat(columns[amIdx]);
                let balNum = parseSpanishFloat(rawBal);

                if (!rawDate) return;
                const parts = rawDate.split('/');
                const currentDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));

                if (!isNaN(currentDate.getTime())) {
                    if (!minDateObj || currentDate < minDateObj) {
                        minDateObj = currentDate;
                        balanceToCompare = (Math.round(balNum * 100) - Math.round(amNum * 100)) / 100;
                    } else if (currentDate.getTime() === minDateObj.getTime() && fileOrder === 'newest_first') {
                        balanceToCompare = (Math.round(balNum * 100) - Math.round(amNum * 100)) / 100;
                    }
                }
            });
            setCsvCheckBalance(balanceToCompare);
        } else {
            setCsvCheckBalance(null);
        }

        // 2. Consulta de extremos y determinación instantánea del modo
        try {
            const res = await getAccountFileLimitsAction(selectedAccountId);
            if (res.success) {
                setAppNewestDate(res.newestDate || 'Sin movimientos');
                setAppOldestDate(res.oldestDate || 'Sin movimientos');

                const parseNormalizedDate = (dStr: string) => {
                    if (!dStr || dStr === 'Sin movimientos') return null;
                    const cleanStr = dStr.replace(/[^\d/]/g, '').trim(); 
                    const parts = cleanStr.split('/');
                    return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
                };

                const dateNewestApp = parseNormalizedDate(res.newestDate || '');
                const dateNewestCsv = parseNormalizedDate(fileOrder === 'newest_first' ? firstRowDate : lastRowDate);

                // Determinamos el modo en una variable local para sincronía total
                let modeDetermined: 'new' | 'historic' = 'new';
                if (dateNewestApp && dateNewestCsv && dateNewestCsv.getTime() <= dateNewestApp.getTime()) {
                    modeDetermined = 'historic';
                }

                setImportMode(modeDetermined);
            } else {
                toast.error(res.error || 'Error al cargar límites de la app');
            }
        } catch (err) {
            console.error(err);
            toast.error('Error al obtener límites de fechas');
        }
        setStep('preview');
    };

    const executeImport = async () => {
        setIsImporting(true);
        const toastId = toast.loading("Sincronizando con la base de datos...");
        const formData = new FormData();
        formData.append('file', file!);
        formData.append('accountId', selectedAccountId);
        formData.append('importMode', importMode); 
        formData.append('invertAmount', String(invertAmount));
        formData.append('fileOrder', fileOrder);

        try {
            const result = await importCsvTransactionsAction(formData, { delimiter, settings: { column_map: { date: headers.indexOf(mapping['operation_date']), concept: headers.indexOf(mapping['concept']), amount: headers.indexOf(mapping['amount']), bank_balance: headers.indexOf(mapping['bank_balance']) }, invert_sign: invertAmount, has_two_columns: false } } as any);
            if (result.success) {
                toast.success("Importación finalizada", { id: toastId });
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
    
    const selectedAccount = accounts.find(a => a.id === selectedAccountId);

    // =================================================================
    // COMPONENT SCOPE: INDICES Y HELPERS ACCESIBLES
    // =================================================================
    const dateIdx = headers.indexOf(mapping['operation_date']);
    const balIdx = headers.indexOf(mapping['bank_balance']);
    const amIdx = headers.indexOf(mapping['amount']);

    const parseFloatLocal = (str: string) => {
        if (!str) return 0;
        let n = str.trim();
        const clean = n.includes('.') && !n.includes(',') ? n : n.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
        return parseFloat(clean) || 0;
    };

    const parseDateHelper = (dStr: string) => {
        if (!dStr || dStr === 'Sin movimientos') return null;
        const cleanStr = dStr.replace(/[^\d/]/g, '').trim();
        const parts = cleanStr.split('/');
        return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    };

    const dateLimiteAppOldest = parseDateHelper(appOldestDate);
    const dateLimiteAppNewest = parseDateHelper(appNewestDate);

    // 💡 DETERMINACIÓN EN TIEMPO REAL DEL MODO PARA EVITAR LAGS DE REACT
    // Si la fecha del archivo más nueva es estrictamente posterior al último movimiento de la app, es 'new'
    const csvFirstRowDateObj = csvLines.length > 0 && dateIdx !== -1 ? parseDateHelper(csvLines[0][dateIdx]) : null;
    const csvLastRowDateObj = csvLines.length > 0 && dateIdx !== -1 ? parseDateHelper(csvLines[csvLines.length - 1][dateIdx]) : null;
    
    let currentCsvNewestDateObj = csvFirstRowDateObj;
    if (csvLastRowDateObj && csvFirstRowDateObj && csvLastRowDateObj > csvFirstRowDateObj) {
        currentCsvNewestDateObj = csvLastRowDateObj;
    }

    const cuentaEstaVacia = appOldestDate === 'Sin movimientos' || appNewestDate === 'Sin movimientos';
    
    // El modo contable real en este instante de render
    const realRenderMode = (!dateLimiteAppNewest || !currentCsvNewestDateObj || currentCsvNewestDateObj.getTime() > dateLimiteAppNewest.getTime()) 
        ? 'new' 
        : 'historic';

    // 1. FILTRADO DINÁMICO DEL BUFFER SEGÚN EL MODO CALCULADO AL VUELO
    const lineasFiltradasNuevas = csvLines.filter(columns => {
        if (dateIdx === -1 || !columns[dateIdx]) return true;
        const rowDateObj = parseDateHelper(columns[dateIdx]);
        if (!rowDateObj) return true;

        if (realRenderMode === 'historic') {
            if (!dateLimiteAppOldest) return true;
            if (rowDateObj > dateLimiteAppOldest) return false; // Purgamos futuro
        } else {
            if (!dateLimiteAppNewest) return true;
            if (rowDateObj <= dateLimiteAppNewest) return false; // Purgamos pasado/solape
        }
        return true;
    });

    // 2. CÁLCULO DEL SALDO DE CIERRE REAL BASADO EN EL BUFFER FILTRADO
    let csvClosingBalance = 0;
    let tieneMovimientosNuevos = lineasFiltradasNuevas.length > 0;

    if (tieneMovimientosNuevos) {
        const lineasOrdenadas = [...lineasFiltradasNuevas].sort((a, b) => {
            const dateA = parseDateHelper(a[dateIdx])?.getTime() || 0;
            const dateB = parseDateHelper(b[dateIdx])?.getTime() || 0;
            return dateB - dateA;
        });

        const targetRow = lineasOrdenadas[0];
        if (targetRow && balIdx !== -1 && targetRow[balIdx]) {
            csvClosingBalance = parseFloatLocal(targetRow[balIdx]);
        }
    }

    const appCurrentBalance = selectedAccount?.current_balance ?? 0;
    const appInitialBalance = selectedAccount?.initial_balance ?? 0;

    // 3. SEMÁFOROS Y REGLAS DE BLOQUEO CONTABLE DE SEGURIDAD
    const hasNewGap = !cuentaEstaVacia && realRenderMode === 'new' && csvCheckBalance !== null && csvCheckBalance !== appCurrentBalance;
    const hasHistoricGap = !cuentaEstaVacia && realRenderMode === 'historic' && tieneMovimientosNuevos && csvClosingBalance !== appInitialBalance;
    
    const isBlockedByGap = !cuentaEstaVacia && ((realRenderMode === 'historic' && tieneMovimientosNuevos && hasHistoricGap) || (realRenderMode === 'new' && hasNewGap));

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
                                        Paso 3: Revisión de Continuidad Temporal
                                    </h3>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        Comprobando que el extracto enganche perfectamente con la línea de tiempo de la aplicación.
                                    </p>
                                </div>

                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] space-y-1.5">
                                    {importMode === 'new' ? (
                                        <>
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-500">💰 Saldo actual hoy en App (Cierre actual):</span>
                                                <span className="font-mono font-semibold text-slate-600">
                                                    {appCurrentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} €
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center pt-1.5 border-t border-dashed border-slate-200">
                                                <span className="text-slate-500 font-medium">📥 Saldo de Apertura del archivo (Inicio CSV):</span>
                                                <span className={`font-mono font-bold ${hasNewGap ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                    {csvCheckBalance?.toLocaleString(undefined, { minimumFractionDigits: 2 })} €
                                                </span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-500">🏛️ Saldo Inicial actual en App (Origen actual):</span>
                                                <span className="font-mono font-semibold text-slate-600">
                                                    {appInitialBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} €
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center pt-1.5 border-t border-dashed border-slate-200">
                                                <span className="text-slate-500 font-medium">📥 Saldo de Cierre del archivo histórico (Fin CSV):</span>
                                                <span className={`font-mono font-bold ${hasHistoricGap ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                    {csvClosingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} €
                                                </span>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* SEMÁFOROS BANNER DE AVISO / BLOQUEO */}
                                {isBlockedByGap ? (
                                    <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-[11px] space-y-3">
                                        <p className="font-black flex items-center gap-1.5 uppercase tracking-tight text-rose-800">
                                            <AlertTriangle className="w-4 h-4 text-rose-600 animate-pulse" /> 
                                            Bloqueo de Seguridad: Hueco Temporal Detectado
                                        </p>
                                        
                                        <div className="space-y-2 bg-white/60 p-3 rounded-lg border border-rose-100 font-medium text-rose-900 leading-relaxed">
                                            {importMode === 'new' ? (
                                                <>
                                                    <p>
                                                        🏛️ El saldo en la app a fecha <span className="font-bold underline">{appNewestDate}</span> (Último Cierre) es de: <span className="font-mono font-bold bg-rose-100/60 px-1.5 py-0.5 rounded text-rose-700">{appCurrentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} €</span>
                                                    </p>
                                                    <p>
                                                        📥 Mientras que el saldo inicial del archivo tiene fecha <span className="font-bold underline">{csvOldestDate}</span> (Inicio CSV) y requiere ser de: <span className="font-mono font-bold bg-rose-100/60 px-1.5 py-0.5 rounded text-rose-700">{(csvCheckBalance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} €</span>
                                                    </p>
                                                </>
                                            ) : (
                                                <>
                                                    <p>
                                                        🏛️ El saldo en la app a fecha <span className="font-bold underline">{appOldestDate}</span> (Primer Origen) es de: <span className="font-mono font-bold bg-rose-100/60 px-1.5 py-0.5 rounded text-rose-700">{appInitialBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} €</span>
                                                    </p>
                                                    <p>
                                                        📥 Mientras que el saldo final del archivo histórico tiene fecha <span className="font-bold underline">{csvNewestDate}</span> (Fin CSV) y termina dejando un saldo de: <span className="font-mono font-bold bg-rose-100/60 px-1.5 py-0.5 rounded text-rose-700">{csvClosingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} €</span>
                                                    </p>
                                                </>
                                            )}
                                        </div>

                                        <p className="font-bold text-rose-800 leading-normal">
                                            💡 Consejo: Te faltan transacciones entre el <span className="underline">{importMode === 'new' ? appNewestDate : csvNewestDate}</span> y el <span className="underline">{importMode === 'new' ? csvOldestDate : appOldestDate}</span>. Descarga ese extracto intermedio en tu banco para poder continuar la secuencia.
                                        </p>
                                    </div>
                                ) : (
                                    /* BANNER VERDE SI TODO ESTÁ PERFECTO */
                                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-[11px]">
                                        <p className="font-bold flex items-center gap-1.5">
                                            <CheckCircle2 className="w-3.5 h-3.5" /> Continuidad Temporal Confirmada
                                        </p>
                                        <p className="text-emerald-600/90 mt-0.5 leading-relaxed">
                                            Los eslabones del saldo encajan al céntimo. Las transacciones duplicadas exactas se omitirán automáticamente para proteger tu historial.
                                        </p>
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
                                        disabled={isBlockedByGap || isImporting}
                                        className={`text-xs h-8 font-bold px-4 ${
                                            isBlockedByGap
                                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                        }`}
                                    >
                                        {isImporting ? 'Procesando...' : 'Confirmar e Importar'}
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