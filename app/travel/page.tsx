import { createClient } from '@/utils/supabase/server'
import { NewTripDialog } from './NewTripDialog'
import { TripListView } from './TripListView' // <--- ESTA ERA LA QUE FALTABA
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { ArrowLeft } from 'lucide-react'

export default async function TravelPage() {
  const supabase = await createClient()

  // 1. Obtener Empresas
  const { data: employers } = await supabase
    .from('travel_employers')
    .select('id, name')
    .order('name')

  // 2. Obtener Viajes (traemos también el report_id)
  const { data: trips } = await supabase
    .from('travel_trips')
    .select(`
      id, name, start_date, end_date, status, employer_id, report_id,
      travel_employers ( name )
    `)
    .order('start_date', { ascending: false })

  // 3. Obtener Gastos para totales
  const { data: expenses } = await supabase
    .from('travel_expenses')
    .select('trip_id, amount')

  // 4. Obtener Reportes
  const { data: reportsData } = await supabase
    .from('travel_reports')
    .select('*, travel_employers(name)')
    .order('created_at', { ascending: false })

  // --- CÁLCULOS ---

  // A. Totales por Viaje
  const tripsWithTotals = trips?.map((trip) => {
    const tripExpenses = expenses?.filter(e => e.trip_id === trip.id) || []
    const total = tripExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)

    return {
      id: trip.id,
      name: trip.name,
      start_date: trip.start_date,
      end_date: trip.end_date,
      status: trip.status,
      employer_name: (trip.travel_employers as any)?.name,
      total_amount: total
    }
  }) || []

  // B. Totales por Reporte
  const reportsWithTotals = reportsData?.map(rep => {
      // Buscamos qué viajes de nuestra lista pertenecen a este reporte
      const includedTrips = tripsWithTotals.filter(t => {
         // Buscamos el viaje original para ver su report_id
         const rawTrip = trips?.find(rt => rt.id === t.id)
         return rawTrip?.report_id === rep.id
      })
      
      const total = includedTrips.reduce((sum, t) => sum + t.total_amount, 0)
      
      return {
          id: rep.id,
          name: rep.name,
          status: rep.status,
          created_at: rep.created_at,
          trip_count: includedTrips.length,
          total_amount: total
      }
  }) || []

  return (
    <div className="min-h-screen bg-slate-100 font-sans pb-24">
      
      {/* HEADER SUPERIOR */}
      <div className="sticky top-0 z-10 bg-slate-100/90 backdrop-blur-sm border-b border-slate-200/50 px-4 py-3 shadow-sm">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-200 -ml-2 rounded-full">
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-slate-800">Mis Viajes</h1>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-xl mx-auto p-4">
        {/* Aquí pasamos los datos a las pestañas */}
        <TripListView 
            trips={tripsWithTotals} 
            reports={reportsWithTotals} 
            employers={employers || []} 
        />
      </main>

      {/* BARRA INFERIOR FIJA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 z-20 safe-area-bottom shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
         <div className="max-w-xl mx-auto">
            <NewTripDialog employers={employers || []} />
         </div>
      </div>

    </div>
  )
}