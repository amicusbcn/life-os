// app/timeline/page.tsx (Server Component)

import { notFound } from 'next/navigation';
import { getUserData } from '@/utils/security';
import { UnifiedAppSidebar } from '@/components/layout/UnifiedAppSidebar';

// Componentes y datos Server-Side
import { getTimelineData } from './data';
import { TimelineView } from './components/TimelineView';
import { TimelineMenu } from './components/TimelineMenu';
import { SearchParams, TimelineEvent } from '@/types/timeline';

interface PageProps {
  searchParams: Promise<SearchParams>;
}

export default async function TimelinePage({ searchParams }: PageProps) {
    const sParams = await searchParams;

    // 1. Seguridad y Datos de Usuario centralizados
    // Validamos acceso al módulo 'timeline'
    const { profile, accessibleModules } = await getUserData('timeline');

    // 2. Obtener datos del Timeline y filtrar (Capa de datos centralizada)
    const { events, tags, people } = await getTimelineData(sParams);

    // 3. AGRUPACIÓN POR AÑO
    const eventsByYear = events.reduce((acc: Record<number, TimelineEvent[]>, event: TimelineEvent) => {
        const year = new Date(event.date).getFullYear(); 
        if (!acc[year]) acc[year] = [];
        acc[year].push(event);
        return acc;
    }, {});
    
    const sortedYears = Object.keys(eventsByYear).map(Number).sort((a, b) => b - a);

    return (
        <UnifiedAppSidebar
            title="Línea de Vida"
            profile={profile}
            modules={accessibleModules}
            backLink="/"
            // Inyectamos la acción principal de añadir eventos
            moduleMenu={
                <TimelineMenu 
                    mode="operative"
                    allTags={tags} 
                    allPeople={people} 
                />
            }
            // Inyectamos la configuración de maestros (Tags y Personas) en el pie
            moduleSettings={
                <TimelineMenu 
                    mode="settings"
                    allTags={tags} 
                    allPeople={people} 
                />
            }
        >
            <main className="max-w-xl mx-auto">
                {/* Delegamos el renderizado de la lista y los filtros al componente cliente */}
                <TimelineView 
                    eventsByYear={eventsByYear}
                    sortedYears={sortedYears}
                    allTags={tags} 
                    allPeople={people} 
                />
            </main>
        </UnifiedAppSidebar>
    );
}