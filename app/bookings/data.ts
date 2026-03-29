// app/booking/data.ts
import { createClient } from '@/utils/supabase/server';
import { CalendarEvent } from '@/types/calendar';

import { format, startOfMonth, endOfMonth } from 'date-fns';
import { BookingEvent } from '@/types/bookings';

export async function getCalendarEvents(propertyId: string, month: number, year: number): Promise<BookingEvent[]> {
  const supabase = await createClient();
  
  // 1. Definimos el rango del mes como strings "YYYY-MM-DD"
  // Esto evita que la propia consulta a la DB falle por desfases horarios
  const viewDate = new Date(year, month - 1, 1);
  const startStr = format(startOfMonth(viewDate), 'yyyy-MM-dd');
  const endStr = format(endOfMonth(viewDate), 'yyyy-MM-dd');

  const { data, error } = await supabase
    .from('booking_events_v2')
    .select(`
      *,
      member:property_members (
        id,
        name,
        color,
        initials,
        role,
        avatar_url
      )
    `)
    .eq('property_id', propertyId)
    .gte('start_date', startStr) // Filtrado exacto por fecha plana
    .lte('end_date', endStr);

  if (error) {
    console.error("Error fetching bookings:", error);
    return [];
  }

  // 2. Mapeo con "Vacuna de Timezone"
  return data.map(evt => {
    // SEPARAR EL STRING MANUALMENTE
    // "2026-03-01" -> [2026, 3, 1]
    const [sYear, sMonth, sDay] = evt.start_date.split('-').map(Number);
    const [eYear, eMonth, eDay] = evt.end_date.split('-').map(Number);

    return {
      id: evt.id,
      title: evt.type === 'maintenance' ? (evt.title || 'Mantenimiento') : (evt.member?.name || 'Invitado'),
      description: evt.description,
      type: evt.type as any,
      status: evt.status as any,
      color: evt.color || evt.member?.color || '#3b82f6',
      range: {
        // CONSTRUCTOR LOCAL: new Date(year, monthIndex, day)
        // Esto garantiza que el evento empiece a las 00:00:00 de tu hora local
        start: new Date(sYear, sMonth - 1, sDay, 0, 0, 0),
        end: new Date(eYear, eMonth - 1, eDay, 23, 59, 59)
      },
      payload: {
        ...evt,
        member: evt.member 
      },
      property_id: evt.property_id,
      member_id: evt.member_id
    };
  });
}

export async function getExemptions(propertyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('booking_exemptions_v2')
    .select('*')
    .eq('property_id', propertyId);

  if (error) {
    console.error("Error cargando exenciones:", error);
    return []; 
  }

  return data || []; 
}

export async function getSchedulerSettings(propertyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('booking_scheduler_settings_v2')
    .select('*')
    .eq('property_id', propertyId)
    .maybeSingle(); 

  return data; 
}
