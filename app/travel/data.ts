import { createClient } from '@/utils/supabase/server'
import { 
  TravelContext, 
  TripWithTotals, 
  TravelReportWithDetails,
  TravelEmployer,
  TripQueryResponse,
  ReportQueryResponse,
  TravelTrip,
  TripDbStatus,
  TravelMileageTemplate
} from '@/types/travel'
import { getTripState } from '@/utils/trip-logic'

export async function getTravelDashboardData(context: TravelContext) {
  const supabase = await createClient()

  // 1. Obtener Empresas
  const { data: employers } = await supabase
    .from('travel_employers')
    .select('id, name')
    .order('name')
    .returns<TravelEmployer[]>()

  // 2. Obtener Viajes filtrados por contexto
  const { data: rawTrips } = await supabase
    .from('travel_trips')
    .select(`
      id, name, start_date, end_date, status, employer_id, report_id, context,
      travel_employers ( name ),
      travel_reports ( id, name, status, code )
    `)
    .eq('context', context)
    .order('start_date', { ascending: false })
    .returns<TripQueryResponse[]>()

  // 3. Obtener Gastos del contexto para calcular totales de viajes
  // Esto sustituye al filtrado manual que hacías en el cliente
  const { data: expenses } = await supabase
    .from('travel_expenses')
    .select('trip_id, amount')
    .eq('context', context)

  // 4. Obtener Informes (Solo cargamos los que correspondan al contexto si fuera necesario, 
  // pero habitualmente los informes son de 'work')
  const { data: rawReports } = await supabase
    .from('travel_reports')
    .select(`
      *,
      travel_employers ( name ),
      travel_trips ( 
        id, 
        name, 
        travel_expenses ( amount ) 
      )
    `)
    .order('created_at', { ascending: false })
    .returns<ReportQueryResponse[]>()

  // --- MAPEO DE VIAJES (Recuperamos tu lógica de totales y visualStatus) ---
  
  const trips: TripWithTotals[] = rawTrips?.map((trip) => {
    // Calculamos el total de este viaje específico
    const tripExpenses = expenses?.filter((e) => e.trip_id === trip.id) || []
    const total = tripExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)

    // Preparamos objeto para getTripState (tu utilidad)
    const tripForLogic: TravelTrip = {
      id: trip.id,
      name: trip.name,
      employer_id: trip.employer_id,
      report_id: trip.report_id,
      start_date: trip.start_date,
      end_date: trip.end_date,
      status: trip.status as TripDbStatus,
      created_at: '', // Campos requeridos por el tipo pero no para la lógica
      user_id: '',
      context: trip.context
    }

    const { visualStatus } = getTripState(tripForLogic)

    return {
      ...tripForLogic,
      employer_name: trip.travel_employers?.name ?? 'Sin Empresa',
      report_name: trip.travel_reports?.name,
      report_status: trip.travel_reports?.status,
      total_amount: total,
      expense_count: tripExpenses.length,
      visual_status: visualStatus,
    }
  }) || []

  // --- MAPEO DE INFORMES ---

  const reports: TravelReportWithDetails[] = rawReports?.map(rep => {
    let total = 0
    let tripCount = rep.travel_trips?.length || 0
    rep.travel_trips?.forEach(t => {
      // @ts-ignore (por la estructura anidada de Supabase)
      t.travel_expenses?.forEach((e: any) => total += (e.amount || 0))
    })

    return {
      ...rep,
      status: rep.status as any,
      employer_name: rep.travel_employers?.name,
      trip_count: tripCount,
      total_amount: total
    }
  }) || []

  return {
    trips,
    reports,
    employers: employers || []
  }
}

export async function getMileageTemplates(): Promise<TravelMileageTemplate[]> {
    const supabase = await createClient();
    const { data } = await supabase
        .from('travel_mileage_templates')
        .select('*')
        .order('name');
    return data || [];
}