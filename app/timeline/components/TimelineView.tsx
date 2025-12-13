// app/timeline/components/TimelineView.tsx
'use client';

// Imports necesarios
import { TimelineViewProps, TimelineEvent, TimelineTag, TimelinePerson } from '@/types/timeline';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link as LinkIcon } from 'lucide-react';

// Componentes Cliente (deben ser reubicados o definidos aquí)
import { NewEventDialog } from './NewEventDialog'; // Asegurar que este existe y es 'use client'
import { EditEventDialog } from './EditEventDialog'; // Asegurar que este existe y es 'use client'
import { DeleteEventButton } from './DeleteEventButton'; // Asegurar que este existe y es 'use client'
import { TimelineFilters } from './TimelineFilters'; // Asegurar que este existe y es 'use client'
import { TimelineSettings } from './TimelineSettings'; // Asegurar que este existe y es 'use client'


export function TimelineView({ 
    eventsByYear, 
    sortedYears, 
    allTags, 
    allPeople 
}: TimelineViewProps) {
    
    // Lógica para determinar si el array de eventos está vacío (considerando el objeto agrupado)
    const totalEvents = sortedYears.reduce((sum, year) => sum + eventsByYear[year].length, 0);

    return (
        <>
            <TimelineFilters allTags={allTags} allPeople={allPeople} />
            
            <main className="max-w-xl mx-auto p-4 pt-0"> {/* Eliminamos el padding top duplicado */}

                {(totalEvents === 0) ? (
                    <div className="text-center py-20 text-slate-400">No hay recuerdos con estos filtros.</div>
                ) : (
                    // ITERAMOS POR AÑOS
                    sortedYears.map(year => (
                        <div key={year} className="mb-8 relative">
                            
                            {/* ETIQUETA DEL AÑO (FLOTANTE IZQUIERDA) */}
                            <div className="sticky top-[100px] z-10 mb-4 ml-[-10px]"> {/* Ajustamos top para el nuevo header */}
                                <span className="bg-slate-800 text-white text-xs font-black px-3 py-1 rounded-r-full shadow-md">
                                    {year}
                                </span>
                            </div>

                            {/* LÍNEA VERTICAL DECORATIVA */}
                            <div className="absolute left-4 top-10 bottom-0 w-0.5 bg-slate-200 -z-10" />

                            <div className="space-y-6 pl-2">
                                {eventsByYear[year].map((event: TimelineEvent) => (
                                    <Card key={event.id} className="border-0 shadow-sm py-3 rounded-2xl overflow-hidden bg-white relative ml-2">
                                        
                                        {/* IMAGEN COMPLETA */}
                                        {event.media_url && (
                                            <div className="relative w-full aspect-video bg-slate-100">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={event.media_url} alt={event.title || "Evento de la línea de vida"} className="w-full h-full object-cover" />
                                                
                                                {/* BOTONES FLOTANTES SOBRE LA IMAGEN */}
                                                <div className="absolute top-2 right-2 flex gap-2">
                                                    <div className="bg-black/40 backdrop-blur-md rounded-full flex p-1">
                                                        <EditEventDialog event={event} allTags={allTags} allPeople={allPeople} />
                                                        <DeleteEventButton eventId={event.id} />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* CONTENIDO */}
                                        <div className="p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <div className="text-xs font-bold text-indigo-500 uppercase mb-0.5">
                                                        {new Date(event.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                                                    </div>
                                                    <h2 className="text-lg font-bold text-slate-900 leading-tight">{event.title}</h2>
                                                </div>
                                                
                                                {/* Si no hay foto, ponemos los botones aquí */}
                                                {!event.media_url && (
                                                    <div className="flex gap-1 -mt-2">
                                                        <EditEventDialog event={event} allTags={allTags} allPeople={allPeople} />
                                                        <DeleteEventButton eventId={event.id} />
                                                    </div>
                                                )}
                                            </div>

                                            {event.description && <p className="text-slate-600 text-sm mb-3">{event.description}</p>}

                                            {/* LINKS EXTERNOS (Necesitan tipado para mapear correctamente) */}
                                            {event.external_links && event.external_links.length > 0 && (
                                                <div className="flex flex-col gap-2 mb-3 bg-slate-50 p-2 rounded-lg">
                                                    {/* Debes asegurar que event.external_links es un array de { label: string, url: string } */}
                                                    {(event.external_links as { label: string; url: string; }[]).map((link, idx) => (
                                                        <a key={idx} href={link.url} target="_blank" className="flex items-center gap-2 text-sm text-indigo-600 font-medium hover:underline">
                                                            <LinkIcon className="h-3 w-3" /> {link.label}
                                                        </a>
                                                    ))}
                                                </div>
                                            )}

                                            {/* CHIPS */}
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {event.timeline_event_people?.map((rel) => (
                                                    <Badge key={rel.person.id} variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100">@{rel.person.name}</Badge>
                                                ))}
                                                {event.timeline_event_tags?.map((rel, idx) => (
                                                    <Badge 
                                                        key={idx} 
                                                        variant="outline" 
                                                        style={{
                                                            backgroundColor: rel.tag.color ? `${rel.tag.color}15` : '#f1f5f9',
                                                            color: rel.tag.color || '#64748b',
                                                            borderColor: rel.tag.color ? `${rel.tag.color}40` : '#e2e8f0'
                                                        }}
                                                        className="text-xs font-medium"
                                                        >
                                                            #{rel.tag.name}
                                                        </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </main>

            {/* Diálogo de Nuevo Evento debe estar en el cliente */}
            <NewEventDialog allTags={allTags} allPeople={allPeople} /> 
        </>
    );
}