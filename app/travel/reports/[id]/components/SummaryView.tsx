// app/travel/reports/[id]/components/SummaryView.tsx
import { ReportSummary } from '@/utils/report-logic';

export const SummaryView = ({ report, summaryData, employeeName }: { 
  report: any, summaryData: ReportSummary, employeeName: string 
}) => {
  const { summary, totalPropio, totalEmpresa, orderedKeys } = summaryData;
  const isPaid = report.status === 'paid';
  const dateStr = new Date(report.created_at).toLocaleDateString('es-ES', { month: '2-digit', year: 'numeric' });

  return (
    <div className="relative space-y-8 text-slate-900 overflow-hidden">
      
      {/* SELLO DE PAGADO (Marca de agua) */}
      {isPaid && (
        <div className="absolute top-40 left-1/2 -translate-x-1/2 -rotate-12 pointer-events-none opacity-[0.08] print:opacity-[0.12]">
          <div className="border-[12px] border-green-700 px-12 py-4 rounded-3xl">
            <span className="text-9xl font-black text-green-700 tracking-tighter uppercase">
              Pagado
            </span>
          </div>
          <div className="text-center mt-2 text-green-800 font-bold text-2xl">
            {report.paid_at ? new Date(report.paid_at).toLocaleDateString() : ''}
          </div>
        </div>
      )}

      {/* Cabecera Estilo Tabla */}
      <div className="border border-slate-900">
        <div className="flex border-b border-slate-900">
          <div className="w-1/4 bg-slate-100 p-2 font-bold text-[10px] uppercase border-r border-slate-900">Nombre</div>
          <div className="w-3/4 p-2 text-sm">{employeeName}</div>
        </div>
        <div className="flex border-b border-slate-900">
          <div className="w-1/4 bg-slate-100 p-2 font-bold text-[10px] uppercase border-r border-slate-900">Número</div>
          <div className="w-3/4 p-2 text-sm text-indigo-700 font-mono">JA {dateStr.replace('/', ' ')}</div>
        </div>
        <div className="flex">
          <div className="w-1/4 bg-slate-100 p-2 font-bold text-[10px] uppercase border-r border-slate-900">Concepto</div>
          <div className="w-3/4 p-2 text-sm font-bold">{report.employer_name} - {report.name}</div>
        </div>
      </div>

      <h1 className="text-xl font-bold text-center underline uppercase tracking-tight">Gastos de Viaje (Resumen)</h1>

      {/* Tabla de Gastos */}
      <table className="w-full border-collapse border border-slate-900 text-[11px]">
        <thead className="bg-slate-200 font-bold uppercase text-[9px]">
          <tr>
            <th className="border border-slate-900 p-2 text-left w-[40%]">Concepto</th>
            <th className="border border-slate-900 p-2 text-right w-[20%]">Propio</th>
            <th className="border border-slate-900 p-2 text-right w-[20%]">Empresa</th>
            <th className="border border-slate-900 p-2 text-right w-[20%] bg-slate-300">Total</th>
          </tr>
        </thead>
        <tbody>
          {orderedKeys.map(key => {
            const row = summary[key];
            if (row.total === 0) return null; // Limpiamos filas vacías
            return (
              <tr key={key} className="hover:bg-slate-50">
                <td className="border border-slate-900 p-2 font-bold">{key.toUpperCase()}</td>
                <td className="border border-slate-900 p-2 text-right font-mono">{row.propio > 0 ? row.propio.toFixed(2) : '-'}</td>
                <td className="border border-slate-900 p-2 text-right font-mono">{row.empresa > 0 ? row.empresa.toFixed(2) : '-'}</td>
                <td className="border border-slate-900 p-2 text-right font-bold bg-slate-50 font-mono">{row.total.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="bg-slate-200 font-bold border-t-2 border-slate-900">
          <tr>
            <td className="border border-slate-900 p-2">TOTALES (€)</td>
            <td className="border border-slate-900 p-2 text-right font-mono">{totalPropio.toFixed(2)}</td>
            <td className="border border-slate-900 p-2 text-right font-mono">{totalEmpresa.toFixed(2)}</td>
            <td className="border border-slate-900 p-2 text-right font-mono text-base">{(totalPropio + totalEmpresa).toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>

      {/* Cuadro de Liquidación */}
      <div className="w-[60%] ml-auto border border-slate-900 text-sm">
        <div className="bg-slate-900 text-white p-2 font-bold text-center border-b border-slate-900 uppercase text-[10px] tracking-widest">
          Resumen Liquidación
        </div>
        <div className="flex justify-between p-2 border-b border-dashed border-slate-300">
          <span>Total Gastado:</span>
          <span className="font-mono">{(totalPropio + totalEmpresa).toFixed(2)} €</span>
        </div>
        <div className="flex justify-between p-2 border-b border-dashed border-slate-300 text-slate-500 italic">
          <span>(-) Pagado por Empresa (Visa/Directo):</span>
          <span className="font-mono">{totalEmpresa.toFixed(2)} €</span>
        </div>
        <div className="flex justify-between p-3 bg-slate-100 font-bold text-lg items-center">
          <span className="text-sm">TOTAL A REEMBOLSAR:</span>
          <span className="text-2xl text-indigo-700 underline decoration-double underline-offset-4 font-mono">
            {totalPropio.toFixed(2)} €
          </span>
        </div>
      </div>

      {/* Firmas y Footer */}
      <div className="flex justify-between mt-24">
        <div className="w-[40%] border-t border-slate-900 pt-2 text-center">
          <p className="font-bold text-[10px] uppercase">Firma del Empleado</p>
          <div className="h-16 flex items-end justify-center">
             <p className="text-[9px] text-slate-400 italic font-mono mb-2">Firmado el {new Date(report.submitted_at || report.created_at).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="w-[40%] border-t border-slate-900 pt-2 text-center">
          <p className="font-bold text-[10px] uppercase">Vº Bº Empresa / Gerencia</p>
          <div className="h-16 flex items-end justify-center">
             {isPaid && <p className="text-[9px] text-green-600 font-bold border border-green-600 px-2 py-0.5 rounded mb-2">AUTORIZADO & PAGADO</p>}
          </div>
        </div>
      </div>

      <footer className="mt-12 text-center text-[8px] text-slate-400 uppercase tracking-widest print:block">
        Este documento es un reporte de gastos generado automáticamente por el sistema de gestión de viajes.
      </footer>
    </div>
  );
};