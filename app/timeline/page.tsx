import { createClient } from '@/utils/supabase/server'
import { NewEventDialog } from './NewEventDialog'
import { EditEventDialog } from './EditEventDialog' // <--- NUEVO
import { TimelineFilters } from './TimelineFilters'
import { DeleteEventButton } from './DeleteEventButton'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { ArrowLeft, Link as LinkIcon } from 'lucide-react'
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { TimelineSettings } from './TimelineSettings'

export default async function TimelinePage(props: { searchParams: Promise<{ tag?: string, person?: string }> }) {
  const searchParams = await props.searchParams
  const supabase = await createClient()

  const { data: tags } = await supabase.from('timeline_tags').select('*').order('name')
  const { data: people } = await supabase.from('timeline_people').select('*').order('name')

  // ... (LÓGICA DE FILTRADO IGUAL QUE ANTES, CÓPIALA SI LA TIENES, O USO LA BÁSICA AQUÍ) ...
  const tagModifier = searchParams.tag ? '!inner' : ''
  const personModifier = searchParams.person ? '!inner' : ''
  let query = supabase.from('timeline_events').select(`*, timeline_event_tags${tagModifier}(tag:timeline_tags(*)), timeline_event_people${personModifier}(person:timeline_people(*))`)
  if (searchParams.tag) query = query.eq('timeline_event_tags.tag_id', searchParams.tag)
  if (searchParams.person) query = query.eq('timeline_event_people.person_id', searchParams.person)
  const { data: events } = await query.order('date', { ascending: false })

  // --- AGRUPACIÓN POR AÑO ---
  const eventsByYear = (events || []).reduce((acc: any, event: any) => {
    const year = new Date(event.date).getFullYear()
    if (!acc[year]) acc[year] = []
    acc[year].push(event)
    return acc
  }, {})
  
  const sortedYears = Object.keys(eventsByYear).sort((a, b) => Number(b) - Number(a))

  return (
    <div className="min-h-screen bg-slate-100 font-sans pb-24">
      {/* HEADER */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-slate-200 px-4 py-3 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/"><Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-200 -ml-2 rounded-full">
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Button></Link>
          <h1 className="text-xl font-bold text-slate-800">Línea de Vida</h1>
        </div>
        
        {/* MENÚ DE CONFIGURACIÓN (NUEVO) */}
        <TimelineSettings allTags={tags || []} allPeople={people || []} />
      </div>

      <TimelineFilters allTags={tags || []} allPeople={people || []} />

      <main className="max-w-xl mx-auto p-4">
        {(!events || events.length === 0) ? (
            <div className="text-center py-20 text-slate-400">No hay recuerdos con estos filtros.</div>
        ) : (
            // ITERAMOS POR AÑOS
            sortedYears.map(year => (
                <div key={year} className="mb-8 relative">
                    
                    {/* ETIQUETA DEL AÑO (FLOTANTE IZQUIERDA) */}
                    <div className="sticky top-[130px] z-10 mb-4 ml-[-10px]">
                        <span className="bg-slate-800 text-white text-xs font-black px-3 py-1 rounded-r-full shadow-md">
                            {year}
                        </span>
                    </div>

                    {/* LÍNEA VERTICAL DECORATIVA */}
                    <div className="absolute left-4 top-10 bottom-0 w-0.5 bg-slate-200 -z-10" />

                    <div className="space-y-6 pl-2">
                        {eventsByYear[year].map((event: any) => (
                            <Card key={event.id} className="border-0 shadow-sm py-3 rounded-2xl overflow-hidden bg-white relative ml-2">
                                
                                {/* IMAGEN COMPLETA */}
                                {event.media_url && (
                                    <div className="relative w-full aspect-video bg-slate-100">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={event.media_url} alt="" className="w-full h-full object-cover" />
                                        
                                        {/* BOTONES FLOTANTES SOBRE LA IMAGEN */}
                                        <div className="absolute top-2 right-2 flex gap-2">
                                            <div className="bg-black/40 backdrop-blur-md rounded-full flex p-1">
                                                <EditEventDialog event={event} allTags={tags || []} allPeople={people || []} />
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
                                                <EditEventDialog event={event} allTags={tags || []} allPeople={people || []} />
                                                <DeleteEventButton eventId={event.id} />
                                            </div>
                                        )}
                                    </div>

                                    {event.description && <p className="text-slate-600 text-sm mb-3">{event.description}</p>}

                                    {/* LINKS EXTERNOS */}
                                    {event.external_links && event.external_links.length > 0 && (
                                        <div className="flex flex-col gap-2 mb-3 bg-slate-50 p-2 rounded-lg">
                                            {event.external_links.map((link: any, idx: number) => (
                                                <a key={idx} href={link.url} target="_blank" className="flex items-center gap-2 text-sm text-indigo-600 font-medium hover:underline">
                                                    <LinkIcon className="h-3 w-3" /> {link.label}
                                                </a>
                                            ))}
                                        </div>
                                    )}

                                    {/* CHIPS */}
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {event.timeline_event_people?.map((rel: any) => (
                                            <Badge key={rel.person.id} variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100">@{rel.person.name}</Badge>
                                        ))}
                                          {event.timeline_event_tags?.map((rel: any, idx: number) => (
                                            <Badge 
                                            key={idx} 
                                            variant="outline" 
                                            // ESTILO DINÁMICO PARA EL COLOR
                                            style={{
                                                backgroundColor: rel.tag.color ? `${rel.tag.color}15` : '#f1f5f9', // 15 es transparencia hex (aprox 10%)
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

      <NewEventDialog allTags={tags || []} allPeople={people || []} />
    </div>
  )
}