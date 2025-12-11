// app/utils/report-logic.ts
import { TravelReportWithDetails, TravelExpense } from '@/types/travel';

export interface ReportSummary {
  totalPropio: number;
  totalEmpresa: number;
  summary: Record<string, { propio: number; empresa: number; total: number }>;
  orderedKeys: string[];
  groupedForDetail: Record<string, any[]>;
  receipts: any[];
}

export function getReportSummary(report: TravelReportWithDetails | any): ReportSummary {
  const summary: Record<string, { propio: number; empresa: number; total: number }> = {};
  let totalPropio = 0;
  let totalEmpresa = 0;
  
  const groupedForDetail: Record<string, any[]> = {};
  const receipts: any[] = [];

  // Si no hay viajes, devolvemos estructura vacía
  const trips = report.travel_trips || [];

  trips.forEach((trip: any) => {
    const expenses = trip.travel_expenses || [];
    
    expenses.forEach((expense: any) => {
      // 1. Determinar Categoría
      const catName = expense.travel_categories?.name || 'Sin Categoría';
      
      // 2. Inicializar acumuladores si no existen
      if (!summary[catName]) {
        summary[catName] = { propio: 0, empresa: 0, total: 0 };
      }
      if (!groupedForDetail[catName]) {
        groupedForDetail[catName] = [];
      }

      // 3. Sumar importes
      const amount = Number(expense.amount) || 0;
      
      // Lógica: is_reimbursable = TRUE significa que pagó el empleado (Propio)
      // is_reimbursable = FALSE significa que pagó la empresa (Tarjeta Empresa)
      if (expense.is_reimbursable) {
        summary[catName].propio += amount;
        totalPropio += amount;
      } else {
        summary[catName].empresa += amount;
        totalEmpresa += amount;
      }
      summary[catName].total += amount;

      // 4. Preparar detalle
      groupedForDetail[catName].push({
        ...expense,
        tripName: trip.name
      });

      // 5. Detectar Ticket para el anexo
      if (expense.receipt_url) {
        receipts.push(expense);
      }
    });
  });

  // Ordenar claves alfabéticamente para el PDF
  const orderedKeys = Object.keys(summary).sort();

  return {
    totalPropio,
    totalEmpresa,
    summary,
    orderedKeys,
    groupedForDetail,
    receipts
  };
}