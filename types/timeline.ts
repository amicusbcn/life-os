// app/types/timeline.ts

// Tipos base para las tablas de relación
export interface TimelineTag {
    id: string;
    name: string;
    color: string | null;
}

export interface TimelinePerson {
    id: string;
    name: string;
}

// Tipos para las relaciones N:M (usados en el SELECT de Supabase)
interface EventTagRelation {
    tag: TimelineTag;
}

interface EventPersonRelation {
    person: TimelinePerson;
}

// Tipo principal del Evento (coincide con el SELECT)
export interface TimelineEvent {
    id: string;
    user_id: string;
    date: string; // Se usará para agrupar por año
    title: string;
    description: string | null;
    media_url: string | null;
    external_links: { label: string; url: string; }[] | null; // Asumiendo que es JSONB o similar
    
    // Relaciones (N:M)
    timeline_event_tags: EventTagRelation[];
    timeline_event_people: EventPersonRelation[];
}

// Props que el Server Component pasa al Cliente principal (TimelineView)
export interface TimelineViewProps {
    eventsByYear: Record<number, TimelineEvent[]>; // Eventos agrupados por año
    sortedYears: number[];
    allTags: TimelineTag[];
    allPeople: TimelinePerson[];
    // Podrías añadir searchParams aquí si TimelineView fuera responsable del fetching, pero lo haremos Server-Side
}

// Tipos para el Server Action del filtro de búsqueda
export interface SearchParams {
    tag?: string;
    person?: string;
}

export interface TimelineMenuProps {
    allTags: TimelineTag[];
    allPeople: TimelinePerson[];
}
