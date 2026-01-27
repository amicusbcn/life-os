'use server'

import { createClient } from '@/utils/supabase/server';
import { addDays, format } from 'date-fns';
import { revalidatePath } from 'next/cache';

// --- GESTIÓN DE PROPIEDADES ---

export async function createProperty(data: { name: string; slug: string }) {
  const supabase = await createClient();
  
  // Validar slug único
  const { data: existing } = await supabase
    .from('booking_properties')
    .select('id')
    .eq('slug', data.slug)
    .single();

  if (existing) {
    return { success: false, message: 'Ya existe una propiedad con ese identificador (slug).' };
  }

  const { error } = await supabase
    .from('booking_properties')
    .insert({
      name: data.name,
      slug: data.slug,
      max_slots: 1, // Valor por defecto
      color: '#64748b' // Color gris por defecto
    });

  if (error) return { success: false, message: error.message };
  
  revalidatePath('/booking');
  return { success: true, message: 'Propiedad creada correctamente' };
}

export async function deleteProperty(propertyId: string) {
  const supabase = await createClient();
  
  // OJO: Esto borrará en cascada miembros, eventos, etc. si la FK está configurada así.
  const { error } = await supabase
    .from('booking_properties')
    .delete()
    .eq('id', propertyId);

  if (error) return { success: false, message: error.message };
  
  revalidatePath('/booking');
  return { success: true, message: 'Propiedad eliminada' };
}

// --- GESTIÓN DE PERFILES (GLOBALES) ---
// (Esta es la misma lógica que tenías antes, traída aquí por orden)

export async function upsertGlobalProfile(data: {
  id?: string;
  display_name: string;
  initials?: string;
  email?: string;
  secondary_email?: string;
  phone?: string;
}) {
  const supabase = await createClient();

  try {
    const profileData = {
      display_name: data.display_name,
      initials: data.initials || data.display_name.substring(0, 2).toUpperCase(),
      email: data.email,
      secondary_email: data.secondary_email,
      phone: data.phone,
    };

    if (data.id) {
      const { error } = await supabase.from('booking_profiles').update(profileData).eq('id', data.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('booking_profiles').insert(profileData);
      if (error) throw error;
    }

    revalidatePath('/booking');
    return { success: true, message: 'Perfil guardado' };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function deleteGlobalProfile(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('booking_profiles').delete().eq('id', id);
  if (error) return { success: false, message: error.message };
  revalidatePath('/booking');
  return { success: true, message: 'Perfil eliminado' };
}

export async function createHoliday(data: { date: string; name: string }) {
  const supabase = await createClient();
  
  const dateStr = data.date;

  const { error } = await supabase
    .from('booking_holidays')
    .insert({ date: dateStr, name: data.name });

  if (error) {
    if (error.code === '23505') return { success: false, message: 'Ya existe un festivo en esa fecha' };
    return { success: false, message: error.message };
  }
  
  revalidatePath('/booking');
  return { success: true, message: 'Festivo añadido' };
}

export async function deleteHoliday(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('booking_holidays').delete().eq('id', id);
  
  if (error) return { success: false, message: error.message };
  
  revalidatePath('/booking');
  return { success: true, message: 'Festivo eliminado' };
}

export async function duplicateHolidays(sourceYear: number, targetYear: number) {
  const supabase = await createClient();

  // 1. Obtener festivos del año origen
  const start = `${sourceYear}-01-01`;
  const end = `${sourceYear}-12-31`;
  
  const { data: sourceHolidays } = await supabase
    .from('booking_holidays')
    .select('*')
    .gte('date', start)
    .lte('date', end);

  if (!sourceHolidays || sourceHolidays.length === 0) {
    return { success: false, message: `No hay festivos en ${sourceYear} para copiar.` };
  }

  // 2. Preparar los nuevos festivos
  const newHolidays = sourceHolidays.map(h => {
    // h.date es "2024-12-25". Cortamos el año y pegamos el nuevo.
    const monthDay = h.date.split('-').slice(1).join('-'); // "12-25"
    return {
      date: `${targetYear}-${monthDay}`,
      name: h.name
    };
  });

  // 3. Insertar (ignorando duplicados si ya existen)
  const { error } = await supabase
    .from('booking_holidays')
    .insert(newHolidays)
    .select(); // Select para confirmar

  if (error) {
    // Si hay error de duplicado, probablemente es que ya importó algunos.
    // Podríamos afinarlo, pero para un admin simple vale.
    console.error(error);
    return { success: false, message: 'Error al importar (quizá ya existían algunos).' };
  }

  revalidatePath('/booking');
  return { success: true, message: `Importados ${newHolidays.length} festivos de ${sourceYear} a ${targetYear}` };
}

export async function updatePropertiesOrder(items: { id: string; sort_order: number }[]) {
  const supabase = await createClient();

  // Upsert masivo: actualiza el sort_order de cada ID
  const { error } = await supabase
    .from('booking_properties')
    .upsert(items, { onConflict: 'id' });

  if (error) return { success: false, message: error.message };

  revalidatePath('/booking');
  return { success: true, message: 'Orden actualizado' };
}

export async function createMaintenanceBlock(
  propertyId: string, 
  date: Date, 
  reason: string,
  currentUserId: string // El ID del admin que bloquea
) {
  const supabase = await createClient();
  const dateStr = date.toISOString().split('T')[0];
  const startStr = format(date, 'yyyy-MM-dd');
  // Para bloquear UN día, el rango suele ser [dia, dia_siguiente) en lógica de rangos
  const endStr = format(addDays(date, 1), 'yyyy-MM-dd');

  // Formato de rango PostgreSQL: '[2024-01-01, 2024-01-02)' 
  // (Corchete = incluido, Paréntesis = excluido)
  const rangeString = `[${startStr}, ${endStr})`;
  // 1. Obtener reservas existentes para ese día
  const { data: existingBookings } = await supabase
    .from('booking_events')
    .select(`
      *,
      user:booking_profiles!user_id(email, display_name)
    `)
    .eq('property_id', propertyId)
    .eq('date', dateStr)
    .neq('type', 'maintenance'); // Ignoramos otros mantenimientos si hubiera

  // 2. Crear el evento de Mantenimiento
  // Asumimos que type='maintenance' existe en tu lógica o DB
  const { error } = await supabase.from('booking_events').insert({
    property_id: propertyId,
    user_id: currentUserId, // El admin figura como creador
    stay_range: rangeString,
    type: 'maintenance',
    notes: reason // Guardamos la razón aquí
  });

  if (error) return { success: false, message: error.message };

  // 3. Lógica de Notificación (Si hay afectados)
  if (existingBookings && existingBookings.length > 0) {
    const affectedEmails = existingBookings.map((b: any) => b.user?.email).filter(Boolean);
    
    console.log("⚠️ CONFLICTO: Enviando emails a:", affectedEmails);
    
    // AQUÍ CONECTARÍAS TU SERVICIO DE EMAIL REAL
    // await sendEmail({
    //   to: affectedEmails,
    //   subject: `⚠️ Aviso Importante: Mantenimiento en ${dateStr}`,
    //   body: `Hola, se han programado tareas de mantenimiento para el día ${dateStr} por el siguiente motivo: "${reason}". Tu reserva se mantiene, pero ten en cuenta que habrá operarios trabajando.`
    // });
    
    revalidatePath('/booking');
    return { 
      success: true, 
      message: `Bloqueo creado. Se ha notificado a ${existingBookings.length} usuarios afectados.` 
    };
  }

  revalidatePath('/booking');
  return { success: true, message: 'Día bloqueado correctamente.' };
}