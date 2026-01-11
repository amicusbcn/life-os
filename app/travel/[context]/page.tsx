// app/travel/[context]/page.tsx

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { TravelSettingsButton } from '../components/ui/TravelSettingsButton' 
import { TripListView } from '../components/ui/TripListView'
import { getTravelDashboardData, getMileageTemplates, getTravelCategories } from '../data'
import { TravelContext } from '@/types/travel'
import { UnifiedAppHeader } from '@/app/core/components/UnifiedAppHeader'
import { TravelModuleMenu } from '../components/ui/TravelModuleMenu'
import { createClient } from '@/utils/supabase/server'

interface PageProps {
  params: Promise<{ context: string }>;
}
export default async function TravelPage({ params }: PageProps) {
  const { context } = await params
  if (context !== 'work' && context !== 'personal') notFound()

  // Necesitamos el usuario para el Header unificado
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  // 1. Validar que el contexto sea permitido
  if (context !== 'work' && context !== 'personal') {
    notFound()
  }

  const travelContext = context as TravelContext

  // 2. Obtener los datos ya transformados y filtrados desde el "cerebro" (data.ts)
  const [dashboardData, templates, categories, { data: userData }] = await Promise.all([
    getTravelDashboardData(travelContext),
    getMileageTemplates(),
    getTravelCategories(travelContext),
    supabase.auth.getUser()
  ])

  // EXTRAEMOS LAS VARIABLES QUE DABAN ERROR
  const { trips, reports, employers } = dashboardData
  // 3. Configuración visual dinámica
  const title = travelContext === 'work' ? 'Viajes de Trabajo' : 'Viajes Personales'

  return (
    <div className="min-h-screen bg-slate-100 font-sans pb-24">
      {/* HEADER UNIFICADO */}
      <UnifiedAppHeader 
        title={title}
        backHref="/" 
        userEmail={user?.email || ''}
        userRole="admin" 
        maxWClass="max-w-xl"
        moduleMenu={
          <TravelModuleMenu 
            context={travelContext} 
            templates={templates} 
            categories={categories} // <-- Pasamos las categorías aquí
          />
        }
      />

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