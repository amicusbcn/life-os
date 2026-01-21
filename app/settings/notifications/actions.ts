// app/settings/notifications/actions.ts
'use server'
import { createClient } from '@/utils/supabase/server'
import { ActionResponse } from '@/types/common'
import { revalidatePath } from 'next/cache'
import { FeedbackCategory } from '@/types/settings';
import { AppFeedback } from '@/types/settings';
import { sendNotification } from '@/utils/notification-helper'
import { AppNotification,NotificationType, NotificationPriority } from '@/types/notifications'
export async function getMyNotifications(limit = 20) {
  const supabase = await createClient()

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('app_notifications')
      .select('*')
      .eq('recipient_id', user.id)
      .is('is_archived', false) // Opcional: si decidimos archivar en lugar de borrar
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return { success: true, data: data as AppNotification[] }
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return { success: false, error: 'Could not load notifications' }
  }
}

export async function markNotificationAsRead(notificationId: string) {
  const supabase = await createClient()
  
  try {
    const { error } = await supabase
      .from('app_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)

    if (error) throw error
    
    // No revalidamos path globalmente para no recargar toda la página, 
    // gestionaremos el estado optimista en el cliente.
    return { success: true }
  } catch (error) {
    console.error('Error marking notification:', error)
    return { success: false, error: 'Failed to update notification' }
  }
}

export async function markAllAsRead() {
  const supabase = await createClient()
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false }

    const { error } = await supabase
      .from('app_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('recipient_id', user.id)
      .is('read_at', null)

    if (error) throw error
    
    revalidatePath('/') // Aquí sí vale la pena refrescar cachés
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to mark all as read' }
  }
}

export async function sendManualNotification(formData: FormData) {
  const supabase = await createClient()
  
  // 1. Verificar seguridad (Solo admins)
  // TODO: Ajusta esto según cómo gestiones tus roles (tabla user_roles o metadata)
  // Por ahora, verificamos que el usuario exista.
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  // 2. Extraer datos
  const target = formData.get('target') as string // 'all' | 'me'
  const title = formData.get('title') as string
  const message = formData.get('message') as string
  const type = formData.get('type') as NotificationType
  const priority = formData.get('priority') as NotificationPriority
  const link = formData.get('link') as string

  let recipients: string[] = []

  // 3. Resolver Destinatarios
  if (target === 'me') {
    recipients = [user.id]
  } else if (target === 'all') {
    // Obtenemos TODOS los usuarios del sistema
    // NOTA: Esto requiere permisos de admin en la DB para leer auth.users o una tabla publica de perfiles
    // Si no tienes tabla de perfiles publica, esto fallará. 
    // Asumiremos que usas una tabla 'users' o 'profiles' pública vinculada a auth.
    /* const { data } = await supabase.from('profiles').select('id')
       recipients = data?.map(u => u.id) || []
    */
    // Para la prueba, enviamos solo a ti mismo aunque digas 'all' para no romper nada
    recipients = [user.id] 
    console.warn('🚧 TODO: Implementar lógica de obtener todos los IDs reales')
  }

  // 4. Enviar usando el Protocolo
  const result = await sendNotification({
    recipientIds: recipients,
    title,
    message,
    type,
    priority,
    link_url: link || undefined,
    sender_module: 'system' // Las manuales siempre son del sistema
  })

  return result.success 
    ? { success: true, message: `Enviado a ${recipients.length} usuarios` }
    : { error: 'Error al enviar' }
}