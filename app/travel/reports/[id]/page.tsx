// app/travel/reports/[id]/page.tsx
import { createClient } from '@/utils/supabase/server';
import { getReportSummary } from '@/utils/report-logic';
import { notFound } from 'next/navigation';
import { SummaryView } from './components/SummaryView';
import { DetailView } from './components/DetailView';
import { PrintButton } from './components/PrintButton';
// Definimos los tipos correctamente para Next.js 15
interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}

export default async function ReportPage(props: PageProps) {
  // UNWRAP de las promesas (Crucial para corregir tu error)
  const params = await props.params;
  const searchParams = await props.searchParams;
  
  const id = params.id;
  const viewType = searchParams.type || 'summary';

  const supabase = await createClient();

  const { data: report } = await supabase
    .from('travel_reports')
    .select(`
        *,
        travel_employers ( name ),
        travel_trips!report_id (
            id, name, start_date, end_date,
            travel_expenses (*, travel_categories(name))
        )
    `)
    .eq('id', id)
    .single();

  if (!report) notFound();

  const summaryData = getReportSummary(report);
  const employeeName = 'Jesús';

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10 font-sans print:bg-white print:p-0">
      <div className="mx-auto max-w-4xl bg-white p-8 shadow-sm border border-slate-200 print:shadow-none print:border-none relative">
        {viewType === 'summary' ? (
          <SummaryView report={report} summaryData={summaryData} employeeName={employeeName} />
        ) : (
          <DetailView report={report} summaryData={summaryData} />
        )}
      </div>
      
      {/* Script simple para imprimir, ya que window.print() no funciona en server components directo */}
      <PrintButton />
    </div>
  );
}

