// app/timeline/data.ts

import { createClient } from '@/utils/supabase/server';
import { TimelineEvent, TimelineTag, TimelinePerson, SearchParams } from '@/types/timeline'; 

// Las funciones se agrupan en un solo lugar
export async function getTimelineData(searchParams: SearchParams = {}) {
    const supabase = await createClient();

    // 1. OBTENER DATOS DE FILTROS (TAGS y PERSONAS)
    const { data: tags } = await supabase.from('timeline_tags').select('*').order('name');
    const { data: people } = await supabase.from('timeline_people').select('*').order('name');

    // 2. CONSTRUIR QUERY DE EVENTOS (incluyendo la lógica de filtrado existente)
    const tagModifier = searchParams.tag ? '!inner' : '' // <-- ¡Esta línea ya no falla!
    const personModifier = searchParams.person ? '!inner' : ''
    
    let query = supabase.from('timeline_events').select(`
        *, 
        timeline_event_tags${tagModifier}(tag:timeline_tags(*)), 
        timeline_event_people${personModifier}(person:timeline_people(*))
    `);

    if (searchParams.tag) query = query.eq('timeline_event_tags.tag_id', searchParams.tag);
    if (searchParams.person) query = query.eq('timeline_event_people.person_id', searchParams.person);
    
    const { data: events, error } = await query.order('date', { ascending: false });

    if (error) {
        console.error("Error fetching timeline data:", error);
        return { 
            events: [], 
            tags: tags || [], 
            people: people || [] 
        };
    }
    
    // 3. RETORNAR TODOS LOS DATOS REQUERIDOS
    return { 
        events: events as TimelineEvent[], 
        tags: tags as TimelineTag[] || [], 
        people: people as TimelinePerson[] || [] 
    };
}