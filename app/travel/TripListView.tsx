'use client'

import Link from 'next/link'
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MapPin, Calendar, Briefcase, FileText, Download } from 'lucide-react'
import { getTripVisuals } from '@/utils/trip-logic'
import { NewReportDialog } from './NewReportDialog' // <--- NUEVO
import { Button } from '@/components/ui/button'

// Tipos
interface TripWithTotal {
  id: string
  name: string
  start_date: string
  end_date: string
  status: string
  employer_name: string
  total_amount: number
}

interface Report {
  id: string
  name: string
  status: string
  created_at: string
  employer_name?: string
  trip_count?: number
  total_amount?: number
}

interface Employer { id: string; name: string }

export function TripListView({ trips, reports, employers }: { trips: TripWithTotal[], reports: Report[], employers: Employer[] }) {
  
  const activeTrips = trips.filter(t => {
    const visuals = getTripVisuals(t)
    return visuals.displayStatus === 'planned' || visuals.displayStatus === 'active'
  })

  const historyTrips = trips.filter(t => {
    const visuals = getTripVisuals(t)
    return visuals.displayStatus === 'completed' || visuals.displayStatus === 'closed'
  })

  // RENDER VIAJE (Igual que antes)
  const renderTripCard = (trip: TripWithTotal) => {
    const visuals = getTripVisuals(trip)
    const isClosed = trip.status === 'closed'
    return (
      <Link key={trip.id} href={`/travel/${trip.id}`} className="block mb-3">
        <Card className={`border-0 shadow-sm ring-1 ring-slate-200 rounded-xl overflow-hidden active:scale-[0.98] ${isClosed ? 'opacity-70 bg-slate-50' : 'bg-white'}`}>
          <CardContent className="p-0">
            <div className="p-4 pb-2 flex justify-between items-start gap-3">
              <div className="flex-1 min-w-0">
                <h3 className={`text-lg font-bold leading-tight mb-1 ${isClosed ? 'text-slate-600' : 'text-slate-800'}`}>{trip.name}</h3>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Briefcase className="h-3 w-3" /> <span className="font-medium">{trip.employer_name}</span>
                </div>
              </div>
              <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-1 rounded-full border uppercase tracking-wide ${visuals.className}`}>{visuals.label}</span>
            </div>
            <div className="mx-4 h-px bg-slate-100" />
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <div className={`p-1.5 rounded-md ${isClosed ? 'bg-slate-200' : 'bg-orange-50 text-orange-600'}`}><Calendar className="h-3.5 w-3.5" /></div>
                <div className="flex flex-col"><span className="font-semibold text-slate-700">{new Date(trip.start_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span><span className="text-[10px]">{new Date(trip.start_date).getFullYear()}</span></div>
              </div>
              <div className="text-right"><span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total</span><span className={`text-lg font-black ${isClosed ? 'text-slate-600' : 'text-slate-900'}`}>{trip.total_amount.toFixed(2)} €</span></div>
            </div>
          </CardContent>
        </Card>
      </Link>
    )
  }

// RENDER REPORTE
  const renderReportCard = (report: Report) => {
    // Traductor de estados
    const statusMap: Record<string, string> = {
        'draft': 'Borrador',
        'submitted': 'Enviado',
        'paid': 'Pagado'
    }
    const label = statusMap[report.status] || report.status

    return (
        <Link key={report.id} href={`/travel/reports/${report.id}`} className="block mb-3">
            <Card className="border-0 shadow-sm ring-1 ring-indigo-100 bg-indigo-50/30 hover:bg-indigo-50/60 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-indigo-500" />
                            {report.name}
                        </h3>
                        <div className="text-xs text-slate-500 mt-1 flex gap-3">
                            <span>{new Date(report.created_at).toLocaleDateString()}</span>
                            <span>• {report.trip_count} viajes</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="block text-xl font-black text-indigo-900">{report.total_amount?.toFixed(2)} €</span>
                        <span className={`text-[10px] border px-2 py-0.5 rounded-full uppercase font-bold tracking-wide ${report.status === 'draft' ? 'bg-white text-slate-500 border-slate-200' : 'bg-green-100 text-green-700 border-green-200'}`}>
                            {label}
                        </span>
                    </div>
                </CardContent>
            </Card>
        </Link>
    )
  }

  return (
    <Tabs defaultValue="active" className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-6">
        <TabsTrigger value="active">Activos</TabsTrigger>
        <TabsTrigger value="history">Historial</TabsTrigger>
        <TabsTrigger value="reports">Informes</TabsTrigger>
      </TabsList>
      
      <TabsContent value="active" className="space-y-4 min-h-[300px]">
        {activeTrips.length > 0 ? activeTrips.map(renderTripCard) : <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-200"><p className="text-slate-400 text-sm">Nada activo.</p></div>}
      </TabsContent>
      
      <TabsContent value="history" className="space-y-4">
        {historyTrips.length > 0 ? historyTrips.map(renderTripCard) : <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-200"><p className="text-slate-400 text-sm">Historial vacío.</p></div>}
      </TabsContent>

      <TabsContent value="reports" className="space-y-4">
         <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide">Mis Hojas de Gasto</h3>
            {/* AQUÍ ESTÁ EL ASISTENTE INTELIGENTE */}
            <NewReportDialog employers={employers} />
         </div>

         {reports.length > 0 ? reports.map(renderReportCard) : (
             <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-200">
                <p className="text-slate-400 text-sm">No has generado ninguna hoja aún.</p>
             </div>
         )}
      </TabsContent>
    </Tabs>
  )
}