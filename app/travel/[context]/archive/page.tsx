// app/travel/[context]/archive/page.tsx
import { notFound } from 'next/navigation'
import { getUserData, validateModuleAccess } from '@/utils/security'
import { UnifiedAppSidebar } from '@/components/layout/UnifiedAppSidebar'
import { getArchivedTravelData } from '../../data'
import { ArchiveListView } from '../../components/ui/ArchiveListView'
import { TravelContext } from '@/types/travel'
import { TravelModuleMenu } from '../../components/ui/TravelModuleMenu'

interface PageProps {
  params: Promise<{ context: string }>;
}

export default async function TravelArchivePage({ params }: PageProps) {
  const { context } = await params;
  if (context !== 'work' && context !== 'personal') notFound();

  const travelContext = context as TravelContext;
  
  // 1. Validación de seguridad y carga de datos de usuario/módulos
  await validateModuleAccess('travel');
  const { profile, accessibleModules } = await getUserData('travel');
  
  // 2. Carga de datos del archivo
  const trips = await getArchivedTravelData(travelContext);

  const title = `Histórico ${travelContext === 'work' ? 'Laboral' : 'Personal'}`;

  return (
    <UnifiedAppSidebar
      title={title}
      profile={profile}
      modules={accessibleModules}
      backLink={`/travel/${context}`}
      moduleMenu={null}
    >
      <main className="p-4 md:p-8 space-y-8 max-w-4xl mx-auto">
        <header className="space-y-2">
          <h1 className="text-2xl md:text-4xl font-black tracking-tight text-slate-900">
            Archivo de Viajes
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Consulta y gestiona las expediciones finalizadas en el contexto {travelContext}.
          </p>
        </header>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <ArchiveListView initialTrips={trips} context={travelContext} />
        </div>
      </main>
    </UnifiedAppSidebar>
  )
}