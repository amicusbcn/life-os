import { createClient } from '@/utils/supabase/server'
import { 
  TravelContext, 
  TripWithTotals, 
  TravelReportWithDetails,
  TravelEmployer,
  TripQueryResponse,
  ReportQueryResponse,
  TravelTrip,
  TripDetailData,
  TripDbStatus,
  TravelMileageTemplate,
  TravelCategory,
  TravelExpense,
  ReportStatus
} from '@/types/travel'
import { getTripState } from '@/utils/trip-logic'

export async function getTravelDashboardData(context: TravelContext) {
  const supabase = await createClient()

  // 1. Obtener Empresas
  const { data: employers } = await supabase
    .from('travel_employers')
    .select('id, name','color')
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
    .neq('status', 'archived')
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
          start_date,
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
  
  const tripsData = rep.travel_trips?.map(t => {
    // @ts-ignore (por la estructura anidada)
    const tripExpenses = t.travel_expenses || []
    const tripTotal = tripExpenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0)
    total += tripTotal

    return {
      id: t.id,
      name: t.name,
      start_date: (t as any).start_date, // Forzamos el acceso ya que ahora viene en la query
      travel_expenses: tripExpenses
    }
  }) || []

  return {
    ...rep,
    status: rep.status as ReportStatus,
    employer_name: rep.travel_employers?.name,
    trip_count: tripsData.length,
    total_amount: total,
    trips_data: tripsData
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

export async function getTripDetails(tripId: string, context: TravelContext): Promise<TripDetailData | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('travel_trips')
    .select('*, travel_employers(name)')
    .eq('id', tripId)
    .eq('context', context)
    .single()
  
  if (error || !data) return null
  return data as unknown as TripDetailData
}

export async function getTravelCategories(context: TravelContext): Promise<TravelCategory[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('travel_categories')
    .select('*')
    .eq('context', context)
    .order('name')
  
  return (data as TravelCategory[]) || []
}

export async function getTripExpenses(tripId: string): Promise<TravelExpense[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('travel_expenses')
    .select('*, finance_transactions(id)')
    .eq('trip_id', tripId)
    .order('date', { ascending: false })
  
  return (data as TravelExpense[]) || []
}

export async function getArchivedTravelData(context: TravelContext) {
  const supabase = await createClient()

  const { data: rawTrips } = await supabase
    .from('travel_trips')
    .select(`
      *,
      travel_employers ( name,color ),
      travel_reports ( id, name, status, code, url_receipts, url_summary, url_detail ),
      travel_expenses (
        id, date, concept, amount, is_reimbursable, mileage_distance,
        travel_categories ( name, icon_key )
      )
    `)
    .eq('context', context)
    .eq('status', 'archived')
    .order('start_date', { ascending: false })
  const trips = rawTrips?.map(trip => {
    const total = trip.travel_expenses?.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0) || 0;
    return {
      ...trip,
      total_amount: total // Ahora total_amount tendrá el valor correcto
    }
  })
  return trips || []
}