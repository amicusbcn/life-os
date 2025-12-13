// app/timeline/page.tsx (Server Component)

import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server'; // Necesario para Auth/User
import { UnifiedAppHeader } from '@/app/core/components/UnifiedAppHeader';
import { UserMenuProps } from '@/types/common'; // Para el header

// Componentes y datos Server-Side
import { getTimelineData } from './data'; // <-- NUEVA CAPA DE DATOS
import { TimelineView } from './components/TimelineView'; // <-- NUEVO COMPONENTE CLIENTE
import { TimelineMenu} from './components/TimelineMenu'; // <-- NUEVO COMPONENTE SERVER
import { SearchParams, TimelineEvent } from '@/types/timeline';


// Eliminamos: import Link, Button, ArrowLeft, Badge, Card, LinkIcon, TimelineSettings, TimelineFilters, NewEventDialog, EditEventDialog, DeleteEventButton

export default async function TimelinePage({ searchParams = {} }: { searchParams: SearchParams }) {    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Manejo de autenticación
    if (!user) {
        return redirect('/login');
    }

    // 2. Obtener datos del perfil/rol (para el Header)
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
        
    const userRole = profile?.role || 'user';

    // 3. Obtener todos los datos del Timeline y filtrar
    const { events, tags, people } = await getTimelineData(searchParams);
    // 4. AGRUPACIÓN POR AÑO (Mantenemos esta lógica en el Server Component para simplicidad)
    const eventsByYear = events.reduce((acc: Record<number, TimelineEvent[]>, event: TimelineEvent) => {
        // Usar new Date(event.date) es seguro porque Supabase devuelve date como string
        const year = new Date(event.date).getFullYear(); 
        if (!acc[year]) acc[year] = [];
        acc[year].push(event);
        return acc;
    }, {});
    
    const sortedYears = Object.keys(eventsByYear).map(Number).sort((a, b) => b - a);

    // 5. Renderizar la UI
    return (
        <div className="min-h-screen bg-slate-100 font-sans pb-24">
            {/* 🚨 REEMPLAZO DEL HEADER UNIFICADO */}
            <UnifiedAppHeader
                title="Línea de Vida"
                backHref="/"
                userEmail={user.email || ''}
                userRole={userRole}
                maxWClass='max-w-xl'
                moduleMenu={
                    <TimelineMenu 
                        allTags={tags} 
                        allPeople={people} 
                    />
                } 
            />

            {/* 6. Delegamos el renderizado y la lógica interactiva al componente cliente */}
            <TimelineView 
                eventsByYear={eventsByYear}
                sortedYears={sortedYears}
                allTags={tags} 
                allPeople={people} 
            />
            
            {/* NewEventDialog también debe estar en el CLIENTE para que use Server Actions */}
        </div>
    );
}