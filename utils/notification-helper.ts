import { createClient } from '@/utils/supabase/server'
import { NotificationType, NotificationPriority } from '@/types/notifications'

interface SendNotificationParams {
  recipientIds: string[]; // Array para permitir envíos múltiples (Fan-out)
  title: string;
  message?: string;
  type?: NotificationType;
  priority?: NotificationPriority;
  link_url?: string;
  sender_module: string; // 'travel', 'inventory', 'admin', etc.
}

/**
 * Función Maestra para enviar notificaciones desde el servidor.
 * Úsala en tus Server Actions.
 */
export async function sendNotification({
  recipientIds,
  title,
  message = '',
  type = 'info',
  priority = 'normal',
  link_url,
  sender_module
}: SendNotificationParams) {
  const supabase = await createClient()

  // Preparamos los datos para inserción masiva (bulk insert)
  const notificationsToInsert = recipientIds.map(userId => ({
    recipient_id: userId,
    title,
    message,
    type,
    priority,
    link_url,
    sender_module
  }))

  if (notificationsToInsert.length === 0) return { success: true }

  try {
    const { error } = await supabase
      .from('app_notifications')
      .insert(notificationsToInsert)
    
    if (error) throw error

    return { success: true, count: notificationsToInsert.length }
  } catch (error) {
    console.error('🔥 Error enviando notificación:', error)
    // No lanzamos error para no romper el flujo principal de la app
    // (ej: si falla el aviso, el gasto se guarda igual)
    return { success: false, error: 'Fallo al notificar' }
  }
}