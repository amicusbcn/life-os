'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

interface EventData {
  title: string
  date: string
  description?: string
  media_url?: string
  tag_ids?: number[]
  person_ids?: number[]
}

export async function updateTimelineEvent(eventId: string, data: EventData) {
  const supabase = await createClient()

  // 1. Actualizar los datos principales del evento
  const { error: eventError } = await supabase
    .from('timeline_events')
    .update({
      title: data.title,
      date: data.date,
      description: data.description,
      media_url: data.media_url,
    })
    .eq('id', eventId)

  if (eventError) return { error: eventError.message }

  // 2. Actualizar etiquetas (borrar las antiguas e insertar las nuevas)
  const { error: deleteTagsError } = await supabase
    .from('timeline_event_tags')
    .delete()
    .eq('event_id', eventId)

  if (deleteTagsError) return { error: deleteTagsError.message }

  if (data.tag_ids && data.tag_ids.length > 0) {
    const newTags = data.tag_ids.map(tag_id => ({ event_id: eventId, tag_id }))
    const { error: insertTagsError } = await supabase.from('timeline_event_tags').insert(newTags)
    if (insertTagsError) return { error: insertTagsError.message }
  }

  // 3. Actualizar personas (borrar las antiguas e insertar las nuevas)
  const { error: deletePeopleError } = await supabase
    .from('timeline_event_people')
    .delete()
    .eq('event_id', eventId)

  if (deletePeopleError) return { error: deletePeopleError.message }

  if (data.person_ids && data.person_ids.length > 0) {
    const newPeople = data.person_ids.map(person_id => ({ event_id: eventId, person_id }))
    const { error: insertPeopleError } = await supabase.from('timeline_event_people').insert(newPeople)
    if (insertPeopleError) return { error: insertPeopleError.message }
  }

  // 4. Revalidar la ruta para que se muestren los cambios
  revalidatePath('/timeline')
  return { success: true }
}