'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// --- HELPER: SUBIR FOTO ---
async function uploadMedia(supabase: any, file: File) {
  if (!file || file.size === 0) return null
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}.${fileExt}` // Nombre simple por fecha
  const { error } = await supabase.storage.from('timeline').upload(fileName, file)
  if (error) {
    console.error('Upload error:', error)
    return null
  }
  const { data } = supabase.storage.from('timeline').getPublicUrl(fileName)
  return data.publicUrl
}

// --- CREAR EVENTO ---
export async function createTimelineEvent(formData: FormData) {
  const supabase = await createClient()
  const user = (await supabase.auth.getUser()).data.user

  // 1. Recoger datos básicos
  const title = formData.get('title') as string
  const date = formData.get('date') as string
  const description = formData.get('description') as string
  const visibility = formData.get('visibility') as string // 'family' o 'private'
  
  // 2. Gestionar Foto
  const file = formData.get('media_file') as File
  const media_url = await uploadMedia(supabase, file)

  // 3. Insertar Evento
  const { data: event, error } = await supabase
    .from('timeline_events')
    .insert({
      title,
      date,
      description,
      visibility,
      media_url,
      user_id: user?.id, // Autor
      created_by: user?.id
    })
    .select()
    .single()

  if (error) return { error: 'Error creando evento: ' + error.message }

  // 4. GESTIONAR RELACIONES (Etiquetas y Personas)
  // Vienen como strings separados por comas de los selectores múltiples
  // Ej: "tag_id_1,tag_id_2"
  const tagIds = (formData.get('tags') as string).split(',').filter(Boolean)
  const peopleIds = (formData.get('people') as string).split(',').filter(Boolean)

  if (tagIds.length > 0) {
    const tagsToInsert = tagIds.map(tagId => ({ event_id: event.id, tag_id: tagId }))
    await supabase.from('timeline_event_tags').insert(tagsToInsert)
  }

  if (peopleIds.length > 0) {
    const peopleToInsert = peopleIds.map(personId => ({ event_id: event.id, person_id: personId }))
    await supabase.from('timeline_event_people').insert(peopleToInsert)
  }

  revalidatePath('/timeline')
  return { success: true }
}

// --- ACCIONES RÁPIDAS PARA CREAR METADATOS AL VUELO ---

export async function createTag(name: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.from('timeline_tags').insert({ name }).select().single()
  if (error) return { error: error.message }
  return { success: true, tag: data }
}

export async function createPerson(name: string) {
  const supabase = await createClient()
  // Creamos persona simple, luego se podrá editar fecha nacimiento
  const { data, error } = await supabase.from('timeline_people').insert({ name }).select().single()
  if (error) return { error: error.message }
  return { success: true, person: data }
}
// ...

export async function deleteTimelineEvent(eventId: string) {
  const supabase = await createClient()
  const user = (await supabase.auth.getUser()).data.user

  // 1. Obtener evento para ver si tiene foto y borrarla
  const { data: event } = await supabase
    .from('timeline_events')
    .select('media_url, created_by')
    .eq('id', eventId)
    .single()

  if (!event) return { error: "Evento no encontrado" }
  
  // Seguridad extra: Solo el dueño puede borrar
  if (event.created_by !== user?.id) return { error: "No tienes permiso" }

  // 2. Borrar archivo del Storage (si existe)
  if (event.media_url) {
    try {
      const urlParts = event.media_url.split('/timeline/')
      if (urlParts.length > 1) {
        const filePath = decodeURIComponent(urlParts[1])
        await supabase.storage.from('timeline').remove([filePath])
      }
    } catch (e) {
      console.error("Error borrando foto:", e)
    }
  }

  // 3. Borrar registro (Las relaciones tags/people se borran solas por el 'cascade')
  const { error } = await supabase.from('timeline_events').delete().eq('id', eventId)

  if (error) return { error: error.message }

  revalidatePath('/timeline')
  return { success: true }
}

// === ACTUALIZAR EVENTO ===
export async function updateTimelineEvent(formData: FormData) {
  const supabase = await createClient()
  const eventId = formData.get('event_id') as string
  
  // 1. Datos básicos
  const title = formData.get('title') as string
  const date = formData.get('date') as string
  const description = formData.get('description') as string
  const visibility = formData.get('visibility') as string
  
  // 2. Links (Vienen como string JSON desde el formulario)
  const linksRaw = formData.get('external_links') as string
  let external_links = []
  try {
    external_links = JSON.parse(linksRaw || '[]')
  } catch (e) {}

  // 3. Foto (Solo si suben una nueva)
  const file = formData.get('media_file') as File
  let media_url = undefined // undefined = no tocar en la BD
  
  if (file && file.size > 0) {
    media_url = await uploadMedia(supabase, file) // Reutilizamos tu función helper
  }

  // 4. Preparar objeto de actualización
  const updateData: any = {
    title, date, description, visibility, external_links
  }
  if (media_url) updateData.media_url = media_url

  // 5. Actualizar tabla principal
  const { error } = await supabase
    .from('timeline_events')
    .update(updateData)
    .eq('id', eventId)

  if (error) return { error: 'Error actualizando: ' + error.message }

  // 6. ACTUALIZAR RELACIONES (Borrar y crear de nuevo es lo más fácil)
  const tagIds = (formData.get('tags') as string).split(',').filter(Boolean)
  const peopleIds = (formData.get('people') as string).split(',').filter(Boolean)

  // Etiquetas
  await supabase.from('timeline_event_tags').delete().eq('event_id', eventId)
  if (tagIds.length > 0) {
    await supabase.from('timeline_event_tags').insert(tagIds.map(t => ({ event_id: eventId, tag_id: t })))
  }

  // Personas
  await supabase.from('timeline_event_people').delete().eq('event_id', eventId)
  if (peopleIds.length > 0) {
    await supabase.from('timeline_event_people').insert(peopleIds.map(p => ({ event_id: eventId, person_id: p })))
  }

  revalidatePath('/timeline')
  return { success: true }
}

// ...

// === GESTIÓN DE ETIQUETAS ===
export async function updateTag(tagId: string, name: string, color: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('timeline_tags').update({ name, color }).eq('id', tagId)
  if (error) return { error: error.message }
  revalidatePath('/timeline')
  return { success: true }
}

export async function deleteTag(tagId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('timeline_tags').delete().eq('id', tagId)
  if (error) return { error: error.message }
  revalidatePath('/timeline')
  return { success: true }
}

// === GESTIÓN DE PERSONAS (Mejorada) ===
export async function updatePerson(formData: FormData) {
  const supabase = await createClient()
  const personId = formData.get('id') as string
  const name = formData.get('name') as string
  
  const updateData: any = { name }

  // Gestión de Avatar (Si suben foto)
  const file = formData.get('avatar_file') as File
  if (file && file.size > 0) {
    // 1. Subir archivo
    const fileExt = file.name.split('.').pop()
    const fileName = `avatars/${personId}-${Date.now()}.${fileExt}`
    
    // Usamos el mismo bucket 'timeline' pero en carpeta 'avatars'
    const { error: uploadError } = await supabase.storage
      .from('timeline')
      .upload(fileName, file)
      
    if (!uploadError) {
      // 2. Obtener URL pública
      const { data } = supabase.storage.from('timeline').getPublicUrl(fileName)
      updateData.avatar_url = data.publicUrl
    }
  }

  // Actualizar base de datos
  const { error } = await supabase.from('timeline_people').update(updateData).eq('id', personId)
  
  if (error) return { error: error.message }
  
  revalidatePath('/timeline')
  return { success: true }
}

export async function deletePerson(personId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('timeline_people').delete().eq('id', personId)
  if (error) return { error: error.message }
  revalidatePath('/timeline')
  return { success: true }
}