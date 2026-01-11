// app/travel/reports/[id]/components/DetailView.tsx
import { ReportSummary } from '@/utils/report-logic';

export const DetailView = ({ report, summaryData }: { report: any, summaryData: ReportSummary }) => {
  const { groupedForDetail } = summaryData;
  const isPaid = report.status === 'paid';

  return (
    <div className="relative space-y-6 text-slate-900 overflow-hidden">
      
      {/* SELLO DE PAGADO (Marca de agua para el detalle) */}
      {isPaid && (
        <div className="absolute top-60 left-1/2 -translate-x-1/2 -rotate-12 pointer-events-none opacity-[0.05] print:opacity-[0.08] select-none">
          <div className="border-[10px] border-green-700 px-10 py-2 rounded-2xl">
            <span className="text-8xl font-black text-green-700 tracking-tighter uppercase">
              Procesado
            </span>
          </div>
        </div>
      )}

      {/* Cabecera del Detalle */}
      <div className="flex justify-between items-end border-b-2 border-slate-900 pb-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">{report.name}</h1>
          <p className="text-sm text-slate-500 font-medium uppercase tracking-widest">
            Desglose Detallado de Movimientos
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Código Reporte</p>
          <p className="font-mono font-bold text-indigo-600">{report.code || 'S/N'}</p>
        </div>
      </div>

      {/* Listado por Categorías */}
      {Object.keys(groupedForDetail).map((catName) => {
        const expenses = groupedForDetail[catName];
        if (expenses.length === 0) return null;

        return (
          <div key={catName} className="break-inside-avoid pt-4">
            <h3 className="bg-slate-900 text-white px-3 py-1.5 font-bold uppercase text-[10px] tracking-widest mb-3 flex justify-between items-center">
              <span>{catName}</span>
              <span className="opacity-60">{expenses.length} movimientos</span>
            </h3>
            
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[9px] text-slate-400 uppercase border-b border-slate-200">
                  <th className="py-2 font-bold w-[12%] text-center">Fecha</th>
                  <th className="py-2 font-bold w-[63%]">Concepto / Referencia</th>
                  <th className="py-2 font-bold w-[25%] text-right">Importe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map((e) => (
                  <tr key={e.id} className="group hover:bg-slate-50 transition-colors">
                    <td className="py-3 text-[10px] font-mono text-slate-500 text-center">
                      {new Date(e.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                    </td>
                    <td className="py-3 pr-4">
                      <p className="text-[11px] font-bold text-slate-800 leading-tight">
                        {e.concept}
                      </p>
                      <div className="flex gap-2 mt-1">
                        <span className="text-[9px] text-indigo-500 font-medium px-1.5 py-0.5 bg-indigo-50 rounded">
                          {e.tripName}
                        </span>
                        {e.mileage_distance && (
                          <span className="text-[9px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded italic">
                            {e.mileage_distance} km recorridos
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 text-right">
                      <span className="text-xs font-black text-slate-900 font-mono">
                        {e.amount.toFixed(2)} €
                      </span>
                      {!e.is_reimbursable && (
                        <p className="text-[8px] font-bold text-orange-500 uppercase leading-none mt-1">
                          Pagado con Visa
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} className="py-2 text-[10px] font-bold text-slate-400 text-right uppercase pr-4">
                    Subtotal {catName}:
                  </td>
                  <td className="py-2 text-right border-t border-slate-200">
                    <span className="text-xs font-bold text-slate-700 font-mono">
                      {expenses.reduce((acc, curr) => acc + curr.amount, 0).toFixed(2)} €
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        );
      })}

      {/* Resumen Final de Pie de Página */}
      <div className="mt-12 pt-6 border-t-2 border-slate-900 flex justify-end">
        <div className="text-right space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Total Justificado en Detalle</p>
          <p className="text-2xl font-black text-slate-900 font-mono">
            {Object.values(groupedForDetail)
              .flat()
              .reduce((acc, curr) => acc + curr.amount, 0)
              .toFixed(2)} €
          </p>
        </div>
      </div>

      <footer className="mt-8 text-[8px] text-slate-300 italic text-center print:block">
        Fin del detalle de movimientos - Reporte generado por Life-OS
      </footer>
    </div>
  );
};