import { createClient } from '@/utils/supabase/server'
import { TripListView } from './TripListView' 
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { ArrowLeft } from 'lucide-react'
import { getTripState } from '@/utils/trip-logic'
import { 
  TripWithTotals, 
  TravelReportWithDetails, 
  TravelEmployer, 
  TripQueryResponse, 
  ReportQueryResponse,
  TravelTrip,
  TripDbStatus
} from '@/types/travel'


export default async function TravelPage() {
  const supabase = await createClient()

  // 1. Obtener Empresas
  const { data: employers } = await supabase
    .from('travel_employers')
    .select('id, name')
    .order('name')
    .returns<TravelEmployer[]>()

  // 2. Obtener Viajes (Ordenados por fecha de inicio descendente)
  const { data: rawTrips } = await supabase
    .from('travel_trips')
    .select(`
      id, name, start_date, end_date, status, employer_id, report_id,
      travel_employers ( name ),
      travel_reports ( id, name, status, code )
    `)
    .order('start_date', { ascending: false })
    .returns<TripQueryResponse[]>()

  // 3. Obtener Gastos (Solo importes para totales)
  const { data: expenses } = await supabase
    .from('travel_expenses')
    .select('trip_id, amount')

  // 4. Obtener Reportes
  const { data: rawReports, error: reportsError } = await supabase 
    .from('travel_reports')
    .select(`
        *, 
        travel_employers(name),
        travel_trips (
            id, name, start_date, end_date,
            travel_expenses ( amount )
        )
    `) 
    .order('created_at', { ascending: false })
    .returns<ReportQueryResponse[]>()

  // AHORA SÍ FUNCIONARÁ ESTO:
  if (reportsError) console.error("❌ ERROR REPORTES:", reportsError)
  else console.log("✅ REPORTES RECIBIDOS:", rawReports?.length, rawReports)

  // --- TRANSFORMACIONES CON TU LÓGICA ---

  const tripsWithTotals: TripWithTotals[] = rawTrips?.map((trip) => {
    const tripExpenses = expenses?.filter((e) => e.trip_id === trip.id) || []
    const total = tripExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    
    const reportData = trip.travel_reports ? {
        id: trip.travel_reports.id,
        name: trip.travel_reports.name,
        status: trip.travel_reports.status as any,
        code: (trip.travel_reports as any).code 
    } : null;

    // Construimos el objeto base compatible con TravelTrip para pasarlo a tu utilidad
    const tripForLogic: TravelTrip = {
        id: trip.id,
        name: trip.name,
        employer_id: trip.employer_id,
        report_id: trip.report_id,
        start_date: trip.start_date,
        end_date: trip.end_date,
        status: trip.status as TripDbStatus,
        travel_reports: reportData
    };

    // USAMOS TU UTILIDAD
    const { visualStatus } = getTripState(tripForLogic);

    return {
      ...tripForLogic,
      employer_name: trip.travel_employers?.name ?? 'Sin Empresa',
      total_amount: total,
      visual_status: visualStatus, 
    }
  }) || []

  // Transformación de reportes
  const reportsWithTotals: TravelReportWithDetails[] = rawReports?.map((rep) => {
      let total = 0;
      let tripCount = 0;
      
      if (rep.travel_trips) {
        tripCount = rep.travel_trips.length;
        rep.travel_trips.forEach((t) => {
            // @ts-ignore
            t.travel_expenses?.forEach((e) => total += (e.amount || 0));
        });
      }

      return {
        id: rep.id,
        created_at: rep.created_at,
        name: rep.name,
        employer_id: rep.employer_id,
        user_id: rep.user_id,
        status: rep.status as any,
        code: rep.code, 
        
        url_summary: rep.url_summary, 
        url_detail: rep.url_detail,
        url_receipts: rep.url_receipts,
        
        employer_name: rep.travel_employers?.name,
        trip_count: tripCount,
        total_amount: total,
        trips_data: rep.travel_trips 
      };
  }) || [];

  return (
    <div className="min-h-screen bg-slate-100 font-sans pb-24">
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200/50 px-4 py-4 shadow-sm">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-200 -ml-2 rounded-full">
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </Button>
        </Link><h1 className="text-xl font-bold text-slate-800">Mis Viajes</h1>
      </div>
    </div>
    <main className="max-w-xl mx-auto p-4">
      <TripListView 
        trips={tripsWithTotals}
        reports={reportsWithTotals}
        employers={employers || []} 
        />
      </main>
    </div>
 )
}