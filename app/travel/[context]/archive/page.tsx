// app/travel/[context]/archive/page.tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { UnifiedAppHeader } from '@/app/core/components/UnifiedAppHeader'
import { getArchivedTravelData } from '../../data'
import { ArchiveListView } from '../../components/ui/ArchiveListView'
import { TravelContext } from '@/types/travel'

interface PageProps {
  params: Promise<{ context: string }>;
}

export default async function TravelArchivePage({ params }: PageProps) {
  const { context } = await params;
  if (context !== 'work' && context !== 'personal') notFound();

  const travelContext = context as TravelContext;
  const trips = await getArchivedTravelData(travelContext);
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const title = `Histórico: ${travelContext === 'work' ? 'Trabajo' : 'Personal'}`;

  return (
    <div className="min-h-screen bg-slate-100 font-sans pb-10">
      <UnifiedAppHeader 
        title={title}
        backHref={`/travel/${context}`} 
        userEmail={user?.email || ''}
        userRole="admin" 
        maxWClass="max-w-xl"
      />

      <main className="max-w-xl mx-auto p-4">
        <ArchiveListView initialTrips={trips} context={travelContext} />
      </main>
    </div>
  )
}