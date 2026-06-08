// app/finance/import/import-client.tsx
'use client'

import { useState, useMemo } from 'react';
import Papa from 'papaparse';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { Upload, ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react';
import { importHistoricalBatchAction } from '@/app/finance/actions/historical-import';
import { UnifiedAppSidebar } from '@/components/layout/UnifiedAppSidebar';
import { FinanceMenu } from '@/app/finance/components/FinanceMenu';

export default function ImportClientPage({ accounts = [], categories = [], profile, modules }: any) {
  const [step, setStep] = useState<'upload' | 'map_accounts' | 'map_categories' | 'success'>('upload');
  const [csvData, setCsvData] = useState<any[]>([]);
  const [accountMapping, setAccountMapping] = useState<Record<string, string>>({});
  const [categoryMapping, setCategoryMapping] = useState<Record<string, string>>({});
  const [isImporting, setIsImporting] = useState(false);
  const [stats, setStats] = useState({ total: 0, inserted: 0 });

  // 1. Detectar columnas bancarias estándar (Excluimos 'INV' para tratarlo dinámicamente)
  const csvAccountColumns = useMemo(() => {
    if (!csvData.length) return [];
    const suspected = ['KUTXA', 'LC', 'IBER', 'N26', 'PA', 'MA', 'BIP', 'WZ', 'ECI', 'AE', 'DEUDA'];
    return Object.keys(csvData[0]).filter(k => suspected.includes(k));
  }, [csvData]);

  // 2. DETECTOR DINÁMICO DE INVERSIONES: Escanea la columna Cat2 cuando la cuenta es 'INV'
  const csvInvestmentNames = useMemo(() => {
    if (!csvData.length) return [];
    const investments = csvData
      .filter(row => (row.Cuenta === 'INV' || row.account === 'INV') && row.Cat2)
      .map(row => String(row.Cat2).trim());
    return Array.from(new Set(investments)) as string[];
  }, [csvData]);

  // 3. Detectar categorías únicas del Excel
  const csvUniqueCategories = useMemo(() => {
    return Array.from(new Set(csvData.map(row => row.Categoría || row.category).filter(Boolean))) as string[];
  }, [csvData]);

  const handleFileUpload = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true, // Convierte números manteniendo signos de origen (+ / -)
      complete: (results) => {
        setCsvData(results.data);
        setStep('map_accounts');
      }
    });
  };

  const executeImport = async () => {
    setIsImporting(true);

    // Capturamos el nombre real del archivo subido para alimentar finance_importers
    const fileInput = document.getElementById('csv-file') as HTMLInputElement;
    const realFileName = fileInput?.files?.[0]?.name || 'Contabilidad_Familiar_Movimientos.csv';

    // Delegamos de forma hermética el procesamiento completo a la Server Action
    const result = await importHistoricalBatchAction(
      csvData,
      accountMapping,
      categoryMapping,
      csvAccountColumns,
      realFileName
    );

    setIsImporting(false);

    if (result.success) {
      setStats({
        total: csvData.length,
        inserted: result.insertedCount || 0
      });
      setStep('success');
    } else {
      alert("Error crítico al ejecutar la importación histórica en el servidor: " + result.error);
    }
  };

  return (

      <div className="max-w-4xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
        <div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-slate-800">
            Migration <span className="text-indigo-600">Wizard</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">
            Procesamiento a nivel de servidor con trazabilidad e import_id integrado
          </p>
        </div>

        {/* PASO 1: SUBIDA */}
        {step === 'upload' && (
          <Card className="p-20 border-dashed border-2 flex flex-col items-center justify-center rounded-[3rem] bg-slate-50/50 hover:bg-slate-50 transition-colors border-slate-200">
            <input type="file" accept=".csv" onChange={handleFileUpload} id="csv-file" className="hidden" />
            <label htmlFor="csv-file" className="flex flex-col items-center cursor-pointer group">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform">
                <Upload className="text-indigo-600 w-6 h-6" />
              </div>
              <span className="font-black text-xs uppercase italic text-slate-700">Arrastra o selecciona Movimientos.csv</span>
            </label>
          </Card>
        )}

        {/* PASO 2: MAPEO DE CUENTAS */}
        {step === 'map_accounts' && (
          <Card className="p-8 rounded-[2.5rem] border-slate-100 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-black uppercase flex items-center gap-2 text-slate-800">
                <div className="w-1.5 h-5 bg-indigo-600 rounded-full" /> 
                1. Mapeo de cuentas bancarias y de deudas
              </h2>
              <p className="text-xs text-slate-400 font-medium">Asigna cada columna detectada a una cuenta real de tu App. Si la dejas en blanco, se ignorará.</p>
            </div>

            <div className="space-y-2">
              {csvAccountColumns.map(col => (
                <div key={col} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="font-mono font-black text-xs text-slate-600 pl-2">{col}</span>
                  <ArrowRight className="text-slate-300 w-4 h-4" />
                  <Select onValueChange={(val) => setAccountMapping(prev => ({...prev, [col]: val}))}>
                    <SelectTrigger className="w-[300px] rounded-xl border-none shadow-none bg-white font-bold text-xs text-slate-700">
                      <SelectValue placeholder="Ignorar columna (Dejar en blanco)..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {accounts.map((acc: any) => (
                        <SelectItem key={acc.id} value={acc.id} className="text-xs font-bold">{acc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {/* DESGLOSE AUTOMÁTICO DE INVERSIONES MEDIANTE CAT2 */}
            {csvInvestmentNames.length > 0 && (
              <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
                <div>
                  <h3 className="text-xs font-black uppercase text-indigo-600 tracking-wider">Desglose de carteras de Inversión detectadas (Columna Cat2)</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Hemos encontrado sub-cuentas dentro de la columna INV. Mapea cada una a su cuenta de inversión correspondiente.</p>
                </div>
                <div className="space-y-2">
                  {csvInvestmentNames.map(invName => (
                    <div key={invName} className="flex items-center justify-between p-3 bg-indigo-50/40 rounded-2xl border border-indigo-100/60">
                      <span className="font-sans font-bold text-xs text-indigo-950 pl-2">INV $\rightarrow$ {invName}</span>
                      <ArrowRight className="text-indigo-200 w-4 h-4" />
                      <Select onValueChange={(val) => setAccountMapping(prev => ({...prev, [`INV_${invName}`]: val}))}>
                        <SelectTrigger className="w-[300px] rounded-xl border-none shadow-none bg-white font-bold text-xs text-slate-700">
                          <SelectValue placeholder="Ignorar activo (Dejar en blanco)..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {accounts.map((acc: any) => (
                            <SelectItem key={acc.id} value={acc.id} className="text-xs font-bold">{acc.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button 
              className="w-full mt-4 rounded-2xl h-12 font-black uppercase italic tracking-wider bg-indigo-600 hover:bg-indigo-700 transition-colors text-white"
              onClick={() => setStep('map_categories')}
            >
              Siguiente: Mapear Categorías
            </Button>
          </Card>
        )}

        {/* PASO 3: MAPEO DE CATEGORÍAS */}
        {step === 'map_categories' && (
          <Card className="p-8 rounded-[2.5rem] border-slate-100 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-black uppercase flex items-center gap-2 text-slate-800">
                <div className="w-1.5 h-5 bg-indigo-600 rounded-full" /> 
                2. Mapeo de Categorías únicas del Excel
              </h2>
              <p className="text-xs text-slate-400 font-medium">Cruza tus etiquetas del Excel antiguo con las categorías estructurales de tu Life-OS.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {csvUniqueCategories.map(cat => (
                <div key={cat} className="flex flex-col p-4 bg-slate-50 rounded-2xl gap-2 border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{cat}</span>
                  <Select onValueChange={(val) => setCategoryMapping(prev => ({...prev, [cat]: val}))}>
                    <SelectTrigger className="rounded-xl border-none shadow-none bg-white font-bold text-xs text-slate-700 h-10">
                      <SelectValue placeholder="Omitir movimientos de esta categoría..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {categories.map((c: any) => (
                        <SelectItem key={c.id} value={c.id} className="text-xs font-bold">{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <Button 
              className="w-full mt-4 rounded-2xl h-12 font-black uppercase italic tracking-wider bg-slate-900 text-white hover:bg-black flex items-center justify-center gap-2"
              onClick={executeImport}
              disabled={isImporting}
            >
              {isImporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Ejecutando Server Action histórica en lote...
                </>
              ) : 'Ejecutar Importación Masiva Segura'}
            </Button>
          </Card>
        )}

        {/* PASO 4: ÉXITO */}
        {step === 'success' && (
          <Card className="p-12 rounded-[3rem] border-slate-100 shadow-sm flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black uppercase italic text-slate-800">¡Histórico Sincronizado!</h2>
            <p className="text-sm font-medium text-slate-500 max-w-md">
              Se han procesado y guardado correctamente <span className="font-bold text-indigo-600">{stats.inserted}</span> transacciones estructuradas con enlazado bidireccional en tu base de datos de Supabase.
            </p>
            <Button 
              className="mt-4 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-xs uppercase tracking-wider h-10 px-6"
              onClick={() => window.location.href = '/finance/analytics'}
            >
              Ir al Panel de Analítica
            </Button>
          </Card>
        )}
      </div>
  );
}