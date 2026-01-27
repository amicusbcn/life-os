'use server'

import { createClient } from '@/utils/supabase/server';
import { GenerateScheduleInput } from '@/types/booking';
import { addWeeks, isBefore, startOfDay, areIntervalsOverlapping, isAfter } from 'date-fns';
import { revalidatePath } from 'next/cache';

type BookingEventInsert = {
  property_id: string;
  user_id: string | null;
  stay_range: string;
  type: 'turn' | 'maintenance';
  status: 'confirmed';
  notes?: string;
};

export async function generateYearlySchedule(input: GenerateScheduleInput) {
  const supabase = await createClient();
  const { propertyId, startDate, endDate, turnDurationWeeks, exemptions, cyclePattern, cycleLengthWeeks } = input;

  console.log('--- INICIO GENERACIÓN (MODO CLEAN SLATE) ---');

  try {
    const rangeString = `[${startDate.toISOString()}, ${endDate.toISOString()})`;

    // 1. EL GRAN BORRADO (DELETE ALL)
    // Borramos TODO lo que toque el rango. Sin piedad.
    // Al ser un insert masivo posterior, esto evita conflictos de capacidad.
    
    // A. Eventos (Turnos y Mantenimientos)
    const { error: delEvents } = await supabase.from('booking_events')
       .delete()
       .eq('property_id', propertyId)
       .filter('stay_range', 'ov', rangeString); // 'ov' = Overlaps
    
    if (delEvents) throw new Error(`Error borrando eventos: ${delEvents.message}`);

    // B. Exenciones
    const { error: delExempt } = await supabase.from('booking_exemptions')
       .delete()
       .eq('property_id', propertyId)
       .gte('start_date', startDate.toISOString())
       .lte('end_date', endDate.toISOString());

    if (delExempt) throw new Error(`Error borrando exenciones: ${delExempt.message}`);

    
    // 2. REINSERCIÓN DE BLOQUEOS (La nueva verdad)
    const specialExemptions = exemptions.filter(e => e.type === 'special');
    const maintenanceBlocks = exemptions.filter(e => e.type === 'maintenance');

    // Insertar Exenciones
    if (specialExemptions.length > 0) {
        await supabase.from('booking_exemptions').insert(specialExemptions.map(e => ({
            property_id: propertyId, 
            name: e.name, 
            start_date: e.start_date.toISOString(), 
            end_date: e.end_date.toISOString(),
            type: 'special' 
        })));
    }

    // Insertar Mantenimientos (Ahora no chocarán porque hemos borrado todo)
    if (maintenanceBlocks.length > 0) {
        const maintenanceEvents: BookingEventInsert[] = maintenanceBlocks.map(block => ({
            property_id: propertyId,
            user_id: null, 
            stay_range: `[${block.start_date.toISOString()}, ${block.end_date.toISOString()})`,
            type: 'maintenance',
            status: 'confirmed',
            notes: block.name
        }));
        
        const { error } = await supabase.from('booking_events').insert(maintenanceEvents);
        if (error) throw new Error(`Error insertando mantenimientos: ${error.message}`);
    }


    // 3. GENERACIÓN DE TURNOS (Recorte alrededor de los bloqueos)
    const newEvents: BookingEventInsert[] = [];
    let currentDate = startOfDay(new Date(startDate));
    const finalDate = startOfDay(new Date(endDate));
    let globalWeekCounter = 0; 
    
    const blockingIntervals = exemptions.map(e => ({
        start: startOfDay(new Date(e.start_date)),
        end: startOfDay(new Date(e.end_date))
    }));

    while (isBefore(currentDate, finalDate)) {
       const theoreticalStart = currentDate;
       const theoreticalEnd = addWeeks(currentDate, turnDurationWeeks);
       if (isBefore(finalDate, theoreticalEnd)) break;

       let actualStart = theoreticalStart;
       let actualEnd = theoreticalEnd;
       let isFullyBlocked = false;

       // Lógica de recorte (Trimming)
       for (const block of blockingIntervals) {
           if (areIntervalsOverlapping({ start: actualStart, end: actualEnd }, block)) {
               // Bloqueo total
               if (
                   (isBefore(block.start, actualStart) || block.start.getTime() === actualStart.getTime()) && 
                   (isAfter(block.end, actualEnd) || block.end.getTime() === actualEnd.getTime())
               ) {
                   isFullyBlocked = true;
                   break;
               }
               // Recortes parciales
               if (isAfter(block.end, actualStart) && isBefore(block.end, actualEnd)) actualStart = block.end;
               if (isAfter(block.start, actualStart) && isBefore(block.start, actualEnd)) actualEnd = block.start;
           }
       }

       if (!isFullyBlocked && isBefore(actualStart, actualEnd)) {
          const cycleIndex = globalWeekCounter % cycleLengthWeeks;
          const assignedInThisSlot = cyclePattern.filter(p => p.weekIndex === cycleIndex);

          assignedInThisSlot.forEach(assignment => {
              newEvents.push({
                 property_id: propertyId,
                 user_id: assignment.userId,
                 stay_range: `[${actualStart.toISOString()}, ${actualEnd.toISOString()})`,
                 type: 'turn',
                 status: 'confirmed'
              });
          });
       }
       globalWeekCounter++;
       currentDate = theoreticalEnd;
    }

    if (newEvents.length > 0) {
       const { error } = await supabase.from('booking_events').insert(newEvents);
       if (error) throw error;
    }

    revalidatePath(`/booking/schedule`);
    return { success: true, message: `Generación completada. Calendario reseteado.` };

  } catch (error: any) {
    console.error('ERROR FATAL:', error);
    return { success: false, message: error.message };
  }
}