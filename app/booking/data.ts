'use server'

import { createClient } from '@/utils/supabase/server';
import { BookingEvent, BookingProperty, BookingPropertyMember } from '@/types/booking';
import { startOfMonth, endOfMonth } from 'date-fns';

export async function getBookingProperties() {
  const supabase = await createClient();
  const { data } = await supabase.from('booking_properties').select(`
      *,
      members:booking_property_members(
        *, 
        profile:booking_profiles(display_name, initials, color)
      )
    `).order('sort_order', { ascending: true }) 
    .order('name', { ascending: true });

  return (data || []) as BookingProperty[];
}

export async function getPropertyBySlug(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('booking_properties')
    .select('*')
    .eq('slug', slug)
    .single();
  
  return data as BookingProperty | null;
}

export async function getMonthEvents(propertyId: string, date: Date) {
  const supabase = await createClient();
  
  const startDate = startOfMonth(date);
  const endDate = endOfMonth(date);
  const rangeQuery = `[${startDate.toISOString()},${endDate.toISOString()})`;

  const { data, error } = await supabase
    .from('booking_events')
    .select(`*, user:booking_profiles(*)`)
    .eq('property_id', propertyId)
    .overlaps('stay_range', rangeQuery)
    // 🚨 AQUÍ SOLUCIONAMOS EL PUNTO 3:
    // Solo traemos lo confirmado o maintenance. Lo 'released' o 'cancelled' lo ignoramos en la vista principal.
    .in('status', ['confirmed']); 

  if (error) {
    console.error(error);
    return [];
  }

  return data as BookingEvent[];
}

// Obtener avisos pendientes de una casa
export async function getActiveHandovers(propertyId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('booking_handovers')
    .select(`
        *,
        author:booking_profiles!author_id (display_name, initials, color)
    `)
    .eq('property_id', propertyId)
    .is('resolved_at', null) // Solo los pendientes
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching handovers:', error);
    return [];
  }
  
  return data;
}

// En src/app/(app)/booking/data.ts
export async function getPropertyMembers(propertyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('booking_property_members')
    .select(`
      *,
      profile:booking_profiles(*)
    `)
    .eq('property_id', propertyId)
    .order('initials', { foreignTable: 'profile', ascending: true });
    
  if (!data) return [];

  // 2. Ordenamos en Javascript
  // Esto maneja mejor los nulos y asegura el orden correcto
  const sortedMembers = data.sort((a, b) => {
      // Accedemos al perfil anidado de forma segura
      const initA = a.profile?.initials || ''; 
      const initB = b.profile?.initials || '';

      // localeCompare con 'numeric: true' ordena bien números ("2" irá antes que "10")
      return initA.localeCompare(initB, undefined, { numeric: true, sensitivity: 'base' });
  });
   
  return sortedMembers;
}

import { addYears, endOfYear } from 'date-fns';
import { parseBookingRange } from '@/utils/range-parser';

export async function getExistingBlocks(propertyId: string, startDate: Date) {
  const supabase = await createClient();
  const endDate = endOfYear(startDate); // Por defecto miramos hasta fin de año

  // 1. Obtener Exenciones (Tipo 'special')
  const { data: exemptions } = await supabase
    .from('booking_exemptions')
    .select('name, start_date, end_date, type')
    .eq('property_id', propertyId)
    .gte('start_date', startDate.toISOString())
    .lte('end_date', endDate.toISOString());

  // 2. Obtener Mantenimientos (Eventos tipo 'maintenance')
  const { data: rawMaintenance } = await supabase
    .from('booking_events')
    .select('notes, stay_range')
    .eq('property_id', propertyId)
    .eq('type', 'maintenance')
    .filter('stay_range', 'ov', `[${startDate.toISOString()}, ${endDate.toISOString()})`);

  const maintenanceBlocks = (rawMaintenance || []).map(m => {
      // Aquí es donde ocurría el error: parseamos el string manualmente
      const { start, end } = parseBookingRange(m.stay_range);
      
      return {
        name: m.notes || 'Mantenimiento',
        start_date: start, // Ahora es un Date válido
        end_date: end,     // Ahora es un Date válido
        type: 'maintenance' as const
      };
  });
  // Unificamos formato para el Wizard
  const blocks = [
    ...(exemptions || []).map(e => ({
      name: e.name,
      start_date: new Date(e.start_date),
      end_date: new Date(e.end_date),
      type: e.type as 'special' | 'maintenance' // Asumiendo que guardaste 'special' en DB
    })),
    ...maintenanceBlocks
  ];

  return blocks;
}