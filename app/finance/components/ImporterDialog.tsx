// app/finance/components/ImporterDialog.tsx
'use client';

import React, { useEffect,useState, PropsWithChildren } from 'react'; 
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
export function ImporterDialog({ accounts,templates, children }: PropsWithChildren<{ accounts: FinanceAccount[], templates: any[] }>) {
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [delimiter, setDelimiter] = useState(';');
    const [headers, setHeaders] = useState<string[]>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [importMode, setImportMode] = useState<'new' | 'historic'>('new');
    const [saveAsTemplate, setSaveAsTemplate] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState('');
    const [fileOrder, setFileOrder] = useState<'newest_first' | 'oldest_first'>('newest_first');
    const [detectedCount, setDetectedCount] = useState(0);
    const [csvCheckBalance, setCsvCheckBalance] = useState<number | null>(null);
    const [csvNewestDate, setCsvNewestDate] = useState<string>('');
    const [csvOldestDate, setCsvOldestDate] = useState<string>('');

    // Extremos de lo que ya tenemos guardado en la App (Base de datos)
    const [appNewestDate, setAppNewestDate] = useState<string>('');
    const [appOldestDate, setAppOldestDate] = useState<string>('');
    const [invertAmount, setInvertAmount] = useState(false);
    const [isCreditCard, setIsCreditCard] = useState(false);
    const [templateId, setTemplateId] = useState<string | null>(null);
    const childElement = React.Children.only(children) as React.ReactElement<TriggerProps>;
    useEffect(() => {
        const account = accounts.find(a => a.id === selectedAccountId);
        if (account?.importer_id) { // Asumiendo que añadiste esta columna a finance_accounts
            const template = templates.find(t => t.id === account.importer_id);
            if (template) {
                const s = template.settings;
                setDelimiter(s.delimiter || ';');
                setInvertAmount(s.invert_sign || false);
                
                // Mapeo automático desde el template
                const newMap: Record<string, string> = {};
                // Mapeamos los índices de columna a los nombres de headers si ya se cargó el archivo
                if (headers.length > 0) {
                   newMap['operation_date'] = headers[s.column_map.date] || 'none';
                   newMap['concept'] = headers[s.column_map.concept] || 'none';
                   
                   if (s.has_two_columns) {
                       // Lógica para dos columnas: podemos mapear 'amount' al cargo o crédito temporalmente
                       // o ajustar tu lógica ALL_FIELDS para soportar esto.
                       newMap['amount'] = headers[s.column_map.charge] || 'none'; 
                   } else {
                       newMap['amount'] = headers[s.column_map.amount] || 'none';
                   }
                }
                setMapping(newMap);
                setTemplateId(template.id);
            }
        }
    }, [selectedAccountId, headers, accounts, templates]);
    const trigger = React.cloneElement(childElement, {
        onSelect: (e: any) => {
            // Algunos componentes de UI (como los de Shadcn) usan onSelect
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

            // 💡 AUTO-DETECCIÓN CRONOLÓGICA REAL POR FECHA
            if (dataRows.length >= 2) {
                const dateIdx = foundHeaders.findIndex(h => {
                    const header = h.toLowerCase();
                    return header.includes('fec') || header.includes('date') || header.includes('operación');
                });

                if (dateIdx !== -1) {
                    // Función rápida para convertir DD/MM/YYYY en objeto Date ejecutable
                    const parseRowDate = (dateStr: string) => {
                        if (!dateStr) return null;
                        const parts = dateStr.trim().split('/');
                        if (parts.length !== 3) return null;
                        return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
                    };

                    const firstDateObj = parseRowDate(dataRows[0][dateIdx]);
                    const lastDateObj = parseRowDate(dataRows[dataRows.length - 1][dateIdx]);

                    if (firstDateObj && lastDateObj && !isNaN(firstDateObj.getTime()) && !isNaN(lastDateObj.getTime())) {
                        // Si la fecha de arriba es estrictamente mayor (más nueva) que la de abajo
                        if (firstDateObj.getTime() > lastDateObj.getTime()) {
                            setFileOrder('newest_first');
                        } 
                        // Si la fecha de abajo es mayor (más nueva) que la de arriba
                        else if (firstDateObj.getTime() < lastDateObj.getTime()) {
                            setFileOrder('oldest_first');
                        }
                        // NOTA: Si las fechas de la primera y última fila son idénticas (porque todo el CSV ocurre el mismo día),
                        // el sistema no puede adivinarlo solo con las fechas, así que por defecto deja 'newest_first'
                        // y el usuario podrá ajustarlo si ve el desfase en la pantalla.
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
        // 1. Buscamos si la cuenta tiene un template asociado
        const account = accounts.find(a => a.id === selectedAccountId);
        const template = templates?.find(t => t.id === account?.importer_id);
        const s = template?.settings;

        const dateIdx = s ? s.column_map.date : headers.indexOf(mapping['operation_date']);
        const balIdx = headers.indexOf(mapping['bank_balance']); // El saldo suele ser manual siempre
        
        // IMPORTANTE: Si hay doble columna en template, ignoramos el amIdx manual
        const amIdx = headers.indexOf(mapping['amount']);
        const chargeIdx = s?.has_two_columns ? s.column_map.charge : -1;
        const creditIdx = s?.has_two_columns ? s.column_map.credit : -1;

        // Validación básica: necesitamos fecha y alguna forma de importe
        const hasAmount = s?.has_two_columns ? (chargeIdx !== -1 || creditIdx !== -1) : amIdx !== -1;
        if (dateIdx === -1 || !hasAmount) {
            toast.error("Faltan columnas críticas (Fecha/Importe) según la plantilla");
            return;
        }

        let minDateObj: Date | null = null;
        let balanceToCompare: number | null = null;

        const parseSpanishFloat = (str: string) => {
            if (!str) return 0;
            let n = str.trim();
            if (n.includes('.') && !n.includes(',')) {
                return parseFloat(n) || 0;
            }
            const clean = n.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
            return parseFloat(clean) || 0;
        };

        if (csvLines.length === 0) return;

        // 1. Extraer los extremos del CSV de forma segura según el orden físico
        const firstRowDate = csvLines[0][dateIdx]?.trim();
        const lastRowDate = csvLines[csvLines.length - 1][dateIdx]?.trim();

        if (fileOrder === 'newest_first') {
            setCsvNewestDate(firstRowDate || '');
            setCsvOldestDate(lastRowDate || '');
        } else {
            setCsvNewestDate(lastRowDate || '');
            setCsvOldestDate(firstRowDate || '');
        }

        const hasBalanceColumn = !(balIdx === -1 || mapping['bank_balance'] === undefined || mapping['bank_balance'] === '' || mapping['bank_balance'] === 'none');
        
        if (hasBalanceColumn) {
            csvLines.forEach((columns) => {
                const rawDate = columns[dateIdx];
                const rawBal = columns[balIdx];
                
                let amNum = 0;
                if (s?.has_two_columns) {
                    const charge = parseSpanishFloat(columns[chargeIdx]); 
                    const credit = parseSpanishFloat(columns[creditIdx]); 
                    amNum = credit - charge;
                } else {
                    amNum = parseSpanishFloat(columns[amIdx]);
                }

                if (invertAmount || s?.invert_sign) {
                    amNum = amNum * -1;
                }

                let balNum = parseSpanishFloat(rawBal);

                if (!rawDate) return;
                const parts = rawDate.split('/');
                const currentDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));

                if (!isNaN(currentDate.getTime())) {
                    if (!minDateObj || currentDate < minDateObj) {
                        minDateObj = currentDate;
                        const res = (Math.round(balNum * 100) - Math.round(amNum * 100)) / 100;
                        balanceToCompare = res;
                    } else if (currentDate.getTime() === minDateObj.getTime()) {
                        if (fileOrder === 'newest_first') {
                            const res = (Math.round(balNum * 100) - Math.round(amNum * 100)) / 100;
                            balanceToCompare = res;
                        }
                    }
                }
            });
            setCsvCheckBalance(balanceToCompare);
        } else {
            // Si no tiene columna de saldo (Tarjetas), forzamos null de forma segura
            setCsvCheckBalance(null);
        }

        try {
            const res = await getAccountFileLimitsAction(selectedAccountId);
            if (res.success) {
                setAppNewestDate(res.newestDate || 'Sin movimientos');
                setAppOldestDate(res.oldestDate || 'Sin movimientos');
            } else {
                toast.error(res.error || 'Error al cargar límites de la app');
            }
        } catch (err) {
            console.error(err);
            toast.error('Error al conectar con el servidor');
        }
        setStep('preview');
    };

    const executeImport = async (mode: 'new' | 'historic') => {
        const toastId = toast.loading("Sincronizando con la base de datos...");
        const formData = new FormData();
        formData.append('file', file!);
        formData.append('accountId', selectedAccountId);
        formData.append('importMode', mode); // 💡 Aquí viaja el modo automático que calculamos
        formData.append('invertAmount', String(invertAmount));
        formData.append('templateId', templateId || '');
        formData.append('fileOrder', fileOrder); // Enviamos el orden también

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
            const parseNormalizedDate = (dStr: string) => {
            if (!dStr || dStr === 'Sin movimientos') return null;
            const [d, m, y] = dStr.split('/');
            return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        };

        const dateFA = parseNormalizedDate(appNewestDate);
        const dateFa = parseNormalizedDate(appOldestDate);
        const dateFI = parseNormalizedDate(csvNewestDate);
        const dateFi = parseNormalizedDate(csvOldestDate);

        // 💡 TU REGLA DE ORO AUTOMÁTICA:
        // Si no hay movimientos en la app, por defecto es 'new'. Si FA < fi, es 'new'. Si no, es 'historic'.
        const calculatedMode = (!dateFA || !dateFi || dateFA < dateFi) ? 'new' : 'historic';

        // Bandera para detectar si se mete en medio
        const isHistoricalOverlap = calculatedMode === 'historic' && dateFI && dateFa && dateFI >= dateFa;
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
                                {/* ... (Cabecera de registros detectados sin cambios) ... */}
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Detectados: {detectedCount} registros</span>
                                    <Button variant="link" className="h-auto p-0 text-[10px] text-indigo-600 font-bold" onClick={() => setStep('upload')}>Cambiar archivo</Button>
                                </div>

                                {/* ... (Mapeo de campos sin cambios) ... */}
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

                                {/* 💡 SECCIÓN MEJORADA: AJUSTES E INTELIGENCIA */}
                                <div className="space-y-2 mt-4">
                                    {/* Switch de Invertir Signo (Existente) */}
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

                                    {/* ✨ CANELA FINA: GUARDAR COMO PLANTILLA */}
                                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-tight">Guardar como plantilla</p>
                                                <p className="text-[9px] text-indigo-700/60 leading-tight">Aprender este mapeo para el futuro</p>
                                            </div>
                                            <input 
                                                type="checkbox" 
                                                checked={saveAsTemplate} 
                                                onChange={(e) => setSaveAsTemplate(e.target.checked)}
                                                className="w-4 h-4 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                        </div>
                                        
                                        {saveAsTemplate && (
                                            <div className="animate-in slide-in-from-top-1 duration-200">
                                                <Input 
                                                    placeholder="Nombre de la plantilla (ej: Mi Banco CSV)" 
                                                    value={newTemplateName}
                                                    onChange={(e) => setNewTemplateName(e.target.value)}
                                                    className="h-9 text-xs bg-white border-indigo-200 focus:border-indigo-500"
                                                />
                                                <p className="text-[8px] text-indigo-400 mt-1 ml-1 uppercase font-bold">
                                                    Se vinculará automáticamente a esta cuenta
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <Button className="w-full h-12 bg-slate-900 text-white font-bold mt-4" onClick={preparePreview}>
                                    Continuar a Revisión <ArrowRight className="ml-2 w-4 h-4" />
                                </Button>
                            </div>
                        )}

                        {step === 'preview' && (
                            <div className="space-y-4">
                                {/* PANEL INTELIGENTE DE DIAGNÓSTICO (Sustituye a la validación antigua) */}
                                <div className={`p-5 rounded-2xl border-2 transition-all ${
                                    calculatedMode === 'new' 
                                        ? isBalanceOk ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'
                                        : isHistoricalOverlap ? 'bg-red-50 border-red-100' : 'bg-indigo-50 border-indigo-100'
                                }`}>
                                    <div className="space-y-1 mb-4">
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Análisis de Línea de Tiempo</p>
                                        <h4 className="text-sm font-black text-slate-800 uppercase italic">
                                            {calculatedMode === 'new' ? '🚀 Modo: Movimientos Nuevos' : '📜 Modo: Datos Históricos'}
                                        </h4>
                                    </div>

                                    {/* TABLA DE FECHAS */}
                                    <div className="space-y-2 text-[11px] pb-3 border-b border-black/5">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">📅 Último movimiento en App (FA):</span>
                                            <span className="font-mono font-bold text-slate-700">{appNewestDate}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">📥 Primer movimiento del archivo (fi):</span>
                                            <span className="font-mono font-bold text-indigo-600">{csvOldestDate}</span>
                                        </div>
                                    </div>

                                    {/* EXPLICACIONES PRO-ACTIVAS "A PRUEBA DE TONTOS" */}
                                    <div className="text-[11px] pt-3 leading-snug space-y-2">
                                        {calculatedMode === 'new' && (
                                            <>
                                                <p className="text-slate-600">
                                                    El sistema ha detectado que este archivo continúa la línea de tiempo de tu cuenta.
                                                </p>
                                                {!isBalanceOk && csvCheckBalance !== null && (
                                                    <p className="text-amber-700 font-medium bg-amber-100/50 p-2.5 rounded-lg border border-amber-200">
                                                        ⚠️ <strong>Desfase de saldo detectado:</strong> Se tendrá en cuenta el saldo importado del banco por decreto. Esto suele significar que **te faltan movimientos intermedios por importar** entre el {appNewestDate} y el {csvOldestDate}.
                                                    </p>
                                                )}
                                            </>
                                        )}

                                        {calculatedMode === 'historic' && isHistoricalOverlap && (
                                            <div className="text-red-700 font-medium bg-red-100/50 p-2.5 rounded-lg border border-red-200 space-y-1">
                                                <p>⚠️ <strong>PELIGRO DE SOLAPE:</strong> El archivo termina el {csvNewestDate} (FI) y tu app ya tiene datos desde el {appOldestDate} (fa).</p>
                                                <p className="text-[10px] text-red-600/80">Estás metiendo datos "en medio" de un periodo existente. Podrían duplicarse transacciones si ya las importaste antes. El saldo actual hoy no se modificará.</p>
                                            </div>
                                        )}

                                        {calculatedMode === 'historic' && !isHistoricalOverlap && (
                                            <p className="text-indigo-700 font-medium bg-indigo-100/50 p-2.5 rounded-lg border border-indigo-200">
                                                ℹ️ <strong>Histórico Limpio:</strong> Vas a importar datos antiguos previos al {appOldestDate}. El saldo de tu cuenta de hoy se mantendrá intacto y seguro, y se ajustará automáticamente el saldo inicial de la cuenta en el pasado.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* TABLA DE EXTRACTOS DE FECHAS Y SALDOS (Reactiva y dinámica) */}
                                <div className="space-y-2 pt-3 border-t border-black/5 text-[11px]">
                                    
                                    {/* SECCIÓN 1: CRONOLOGÍA (FECHAS) */}
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500">
                                            {calculatedMode === 'new' ? '📅 Último movimiento en App (FA):' : '📅 Movimiento más antiguo en App (fa):'}
                                        </span>
                                        <span className="font-mono font-bold text-slate-700 bg-slate-200/60 px-2 py-0.5 rounded">
                                            {calculatedMode === 'new' ? appNewestDate : appOldestDate}
                                        </span>
                                    </div>
                                    
                                    <div className="flex justify-between items-center pb-2 border-b border-dashed border-slate-200">
                                        <span className="text-slate-500">
                                            {calculatedMode === 'new' ? '📥 Primer movimiento del archivo (fi):' : '📥 Último movimiento del archivo (FI):'}
                                        </span>
                                        <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                            {calculatedMode === 'new' ? csvOldestDate : csvNewestDate}
                                        </span>
                                    </div>

                                    {/* SECCIÓN 2: CONTROL DE SALDOS DE CONTINUIDAD (Solo si el CSV tiene saldo) */}
                                    {csvCheckBalance !== null && (
                                        <div className="pt-1 space-y-1 bg-slate-50/50 p-2 rounded-xl mt-1">
                                            {calculatedMode === 'new' ? (
                                                <>
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-500">💰 Saldo actual hoy en App (Cierre):</span>
                                                        <span className="font-mono text-slate-600">
                                                            {selectedAccount?.current_balance?.toLocaleString(undefined, { minimumFractionDigits: 2 })} €
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between font-medium">
                                                        <span className="text-slate-500">📥 Saldo de Apertura del archivo (Inicio):</span>
                                                        <span className="font-mono text-indigo-600">
                                                            {csvCheckBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} €
                                                        </span>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-500">🏛️ Saldo Inicial actual en App (Apertura actual):</span>
                                                        <span className="font-mono text-slate-600">
                                                            {selectedAccount?.initial_balance?.toLocaleString(undefined, { minimumFractionDigits: 2 })} €
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between font-medium">
                                                        <span className="text-slate-500">📥 Saldo de Cierre del archivo histórico (Fin):</span>
                                                        <span className="font-mono text-indigo-600">
                                                            {/* 💡 En histórico, queremos verificar el saldo al final del extracto antiguo */}
                                                            {(() => {
                                                                // 1. Buscamos el índice mapeado para el saldo
                                                                const balIdx = headers.indexOf(mapping['bank_balance']);
                                                                if (balIdx === -1) return '0,00';
                                                                
                                                                // 2. Extraemos la fila cronológicamente más reciente (FI) 
                                                                // Si lo más nuevo está arriba, es el primer registro ([0]). Si está abajo, es el último.
                                                                const targetRow = fileOrder === 'newest_first' ? csvLines[0] : csvLines[csvLines.length - 1];
                                                                if (!targetRow) return '0,00';
                                                                
                                                                // 💡 CORRECCIÓN: Como targetRow ya es un array de columnas/celdas, 
                                                                // leemos directamente la columna del saldo sin hacer .split()
                                                                const rawBal = targetRow[balIdx];
                                                                if (!rawBal) return '0,00';
                                                                
                                                                // 3. Formateamos el número para la pantalla usando tu lógica limpia
                                                                let n = rawBal.trim();
                                                                const clean = n.includes('.') && !n.includes(',') ? n : n.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
                                                                return (parseFloat(clean) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
                                                            })()} €
                                                        </span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* BOTONES DE ACCIÓN */}
                                <div className="flex gap-3 pt-2">
                                    <Button variant="outline" className="flex-1 h-12 font-bold" onClick={() => setStep('mapping')}>Atrás</Button>
                                    <Button 
                                        className={`flex-[2] h-12 text-white font-black ${isHistoricalOverlap ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`} 
                                        onClick={() => {
                                            // Pasamos el modo calculado dinámicamente en el momento de hacer click
                                            executeImport(calculatedMode); 
                                        }}
                                    >
                                        {isHistoricalOverlap ? 'ENTENDIDO, IMPORTAR CON RIESGO' : 'CONFIRMAR E IMPORTAR'}
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