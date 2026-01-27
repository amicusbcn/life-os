'use server'

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { addDays } from 'date-fns';
import { MemberRole } from '@/types/booking';

// Acción para LIBERAR un turno (lo pone en 'released' para que otro lo coja)
export async function releaseTurn(eventId: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('booking_events')
    .update({ status: 'released' })
    .eq('id', eventId);

  if (error) return { error: error.message };
  
  revalidatePath('/booking');
  return { success: true };
}

// Acción para RESERVAR (Crea un evento nuevo)
// Por defecto, reservamos el fin de semana si se selecciona un viernes/sábado
export async function createBooking(
  propertyId: string, 
  profileId: string, 
  startDate: Date, 
  endDate: Date
) {
  const supabase = await createClient();

  // Formato Range de Postgres: [inicio, fin)
  const range = `[${startDate.toISOString()},${endDate.toISOString()})`;

  try {
    const { error } = await supabase
      .from('booking_events')
      .insert({
        property_id: propertyId,
        user_id: profileId,
        stay_range: range,
        type: 'request',     // Es una petición voluntaria, no un turno obligado
        status: 'confirmed'
      });

    if (error) {
      // Capturamos el error del Trigger de Postgres (Casa llena)
      if (error.message.includes('Casa llena')) {
         return { error: '¡Lo siento! La casa ya está llena para esas fechas.' };
      }
      if (error.message.includes('CERRADA')) {
         return { error: 'La casa está cerrada por mantenimiento en esas fechas.' };
      }
      throw error;
    }

    revalidatePath('/booking');
    return { success: true };

  } catch (err: any) {
    return { error: err.message || 'Error desconocido al reservar' };
  }
}

// Acción para CANCELAR una reserva voluntaria (borrarla del todo)
export async function cancelBooking(eventId: string) {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('booking_events')
      .delete()
      .eq('id', eventId);
  
    if (error) return { error: error.message };
    
    revalidatePath('/booking');
    return { success: true };
}

// Crear nuevo aviso
export async function createHandover(propertyId: string, authorId: string, message: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('booking_handovers')
    .insert({
      property_id: propertyId,
      author_id: authorId,
      message: message
    });

  if (error) return { error: error.message };
  
  revalidatePath('/booking');
  return { success: true };
}

// Marcar como resuelto (lo quita de la lista)
export async function resolveHandover(handoverId: string, resolverId: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('booking_handovers')
    .update({
      resolved_at: new Date().toISOString(),
      resolved_by: resolverId
    })
    .eq('id', handoverId);

  if (error) return { error: error.message };
  
  revalidatePath('/booking');
  return { success: true };
}

export async function updateMemberConfig(
  memberId: string, 
  data: { role: MemberRole; turn_order: number | null }
) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('booking_property_members')
    .update(data)
    .eq('id', memberId);

  if (error) return { error: error.message };
  
  revalidatePath('/booking');
  return { success: true };
}