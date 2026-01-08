// app/travel/[context]/page.tsx

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { TravelSettingsButton } from '../components/ui/TravelSettingsButton' 
import { TripListView } from '../components/ui/TripListView'
import { getTravelDashboardData, getMileageTemplates } from '../data'
import { TravelContext } from '@/types/travel'

interface PageProps {
  params: Promise<{ context: string }>;
}
export default async function TravelPage({ params }: PageProps) {
  const { context } = await params;

  // 1. Validar que el contexto sea permitido
  if (context !== 'work' && context !== 'personal') {
    notFound()
  }

  const travelContext = context as TravelContext

  // 2. Obtener los datos ya transformados y filtrados desde el "cerebro" (data.ts)
  const { trips, reports, employers } = await getTravelDashboardData(travelContext)
  const templates = await getMileageTemplates();
  // 3. Configuración visual dinámica
  const title = travelContext === 'work' ? 'Viajes de Trabajo' : 'Viajes Personales'

  return (
    <div className="min-h-screen bg-slate-100 font-sans pb-24">
      {/* HEADER ESTÁTICO */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200/50 px-4 py-4 shadow-sm">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-200 -ml-2 rounded-full">
                <ArrowLeft className="h-5 w-5 text-slate-600" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-slate-800">{title}</h1>
          </div>
          
          {/* Le pasamos el contexto si el botón necesita filtrar algo internamente */}
          <TravelSettingsButton context={travelContext} templates={templates} />
        </div>
      </div>

      <main className="max-w-xl mx-auto p-4">
        {/* Pasamos los datos a la vista de lista */}
        <TripListView 
          trips={trips}
          reports={reports}
          employers={employers}
          context={travelContext} // <-- Importante pasar el contexto hacia abajo
        />
      </main>
    </div>
  )
}