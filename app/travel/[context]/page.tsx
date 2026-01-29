// app/travel/[context]/page.tsx
import { notFound } from 'next/navigation'
import { TripListView } from '../components/ui/TripListView'
import { getTravelDashboardData, getMileageTemplates, getTravelCategories } from '../data'
import { TravelContext } from '@/types/travel'
import { UnifiedAppSidebar } from '@/components/layout/UnifiedAppSidebar'
import { TravelModuleMenu } from '../components/ui/TravelModuleMenu'
import { getUserData, validateModuleAccess } from '@/utils/security'

interface PageProps {
  params: Promise<{ context: string }>;
}

export default async function TravelPage({ params }: PageProps) {
  const { context } = await params
  if (context !== 'work' && context !== 'personal') notFound()
  const logtext= await validateModuleAccess('travel/'+context);
  
  // 1. Seguridad Centralizada
  // Obtenemos perfil, módulos accesibles y rol específico para 'travel'
  const { profile, accessibleModules, userRole } = await getUserData('travel');

  const travelContext = context as TravelContext

  // 2. Obtener los datos desde el "cerebro" (data.ts)
  const [dashboardData, templates, categories] = await Promise.all([
    getTravelDashboardData(travelContext),
    getMileageTemplates(),
    getTravelCategories(travelContext)
  ])

  const { trips, reports, employers } = dashboardData
  
  // 3. Configuración visual dinámica
  const title = travelContext === 'work' ? 'Viajes de Trabajo' : 'Viajes Personales'

  return (
    <UnifiedAppSidebar
      title={title}
      profile={profile}
      modules={accessibleModules}
      // Slot Cuerpo: Operativa (Histórico de viajes)
      moduleMenu={
        <TravelModuleMenu 
          mode="operative"
          context={travelContext} 
          templates={templates} 
          categories={categories} 
          employers={employers}
        />
      }
      // Slot Pie: Configuración (Recorridos y Categorías)
      moduleSettings={
        <TravelModuleMenu 
          mode="settings"
          context={travelContext} 
          templates={templates} 
          categories={categories}
          employers={employers}
        />
      }
    >
      <main className="max-w-xl mx-auto">
        <TripListView 
          trips={trips}
          reports={reports}
          employers={employers}
          context={travelContext}
        />
      </main>
    </UnifiedAppSidebar>
  )
}