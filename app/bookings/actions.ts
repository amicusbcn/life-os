// app/booking/actions.ts
'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { addWeeks, startOfWeek, endOfWeek, isBefore, format, eachWeekOfInterval, getWeekOfMonth } from 'date-fns';
import { BookingEvent } from '@/types/bookings';

export async function createExemption(propertyId: string, formData: FormData) {
  const supabase = await createClient();

  // 1. Extraemos los datos
  const name = formData.get('name') as string;
  const start_date = formData.get('start_date') as string;
  const end_date = formData.get('end_date') as string;
  const type = formData.get('type') as string;

  // 2. Validación de seguridad para evitar RangeError y Nulls
  if (!name || !start_date || !end_date) {
    console.error("❌ Datos incompletos:", { name, start_date, end_date });
    return { error: "Faltan datos obligatorios" };
  }

  // 3. Inserción en la tabla v2
  const { error } = await supabase
    .from('booking_exemptions_v2')
    .insert([{
      property_id: propertyId,
      name,
      start_date,
      end_date,
      type: type || 'special'
    }]);

  if (error) {
    console.error("❌ Error DB:", error);
    throw new Error(error.message);
  }

  // 4. Revalidamos la ruta para que el calendario se actualice
  revalidatePath(`/properties/[slug]/booking`, 'layout');
}

export async function saveAndSyncSchedule(propertyId: string, template: any, members: any, range: { start: string, end: string }) {
  const supabase = await createClient();

  // 1. GUARDAR CONFIGURACIÓN (Igual que antes)
  await supabase.from('booking_scheduler_settings_v2').upsert({
    property_id: propertyId,
    template: template,
    cycle_start_date: range.start
  });

  // 2. GENERAR TURNOS
  // Forzamos que el inicio del intervalo sea el miércoles de esa semana 
  // para no perder días si el usuario elige un lunes.
  const startDate = startOfWeek(new Date(range.start), { weekStartsOn: 3 });
  const endDate = new Date(range.end);
  
  // Obtenemos todos los miércoles (inicio de turno)
  const weeks = eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 3 });

  const newEvents = [] as any[];

  for (const weekStart of weeks) {
    // Calculamos qué número de semana del mes es, considerando que la semana empieza el miércoles
    const weekIndex = getWeekOfMonth(weekStart, { weekStartsOn: 3 });
    const weekPattern = template[weekIndex];

    if (weekPattern) {
      weekPattern.forEach((memberId: string | null, index: number) => {
        if (memberId) {
          const member = members.find((m: any) => m.id === memberId);
          
          // El fin de semana es el martes siguiente
          const weekEnd = endOfWeek(weekStart, { weekStartsOn: 3 });

          newEvents.push({
            title: member?.name || 'Turno Rueda', 
            property_id: propertyId,
            member_id: memberId,
            color: member?.color,
            start_date: format(weekStart, 'yyyy-MM-dd'),
            end_date: format(weekEnd, 'yyyy-MM-dd'),
            type: 'rotation',
            status: 'confirmed',
          }); 
        }
      });
    }
  }

  // 3. LIMPIAR E INSERTAR
  await supabase.from('booking_events_v2')
    .delete()
    .eq('property_id', propertyId)
    .eq('type', 'rotation')
    .gte('start_date', range.start);
  
  const { error: insertError } = await supabase.from('booking_events_v2').insert(newEvents);
  if (insertError) throw insertError;

  revalidatePath('/properties/[slug]/booking', 'layout');
}
export async function checkExistingRotation(propertyId: string, range: { start: string, end: string }) {
  const supabase = await createClient();
  
  const { count, error } = await supabase
    .from('booking_events_v2')
    .select('*', { count: 'exact', head: true }) // Solo queremos el número, no los datos
    .eq('property_id', propertyId)
    .eq('type', 'rotation')
    .gte('start_date', range.start)
    .lte('end_date', range.end);

  return { count: count || 0, error };
}