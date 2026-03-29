'use server'

import { createClient } from '@/utils/supabase/server';
import { BookingEvent, BookingProfile, BookingProperty } from '@/types/booking';
import { startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { parseBookingRange } from '@/utils/range-parser';

/**
 * 🏠 OBTENER PROPIEDADES (Desde la tabla central)
 * Filtramos solo las que tienen el módulo de bookings activo
 */
export async function getBookingProperties() {
  const supabase = await createClient();
  
  const { data } = await supabase
    .from('properties') // <--- Tabla Core
    .select(`
      *,
      members:property_members( 
        *, 
        profile:profiles(full_name, avatar_url, color)
      )
    `)
    // Filtro PostgREST para JSONB: que 'bookings' sea true
    .eq('active_modules->>bookings', 'true') 
    .order('name', { ascending: true });

  return (data || []) as any[]; // Aquí mapearías a tu tipo BookingProperty
}

/**
 * 🔍 OBTENER PROPIEDAD POR SLUG
 */
export async function getPropertyBySlug(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('properties') // <--- Tabla Core
    .select('*')
    .eq('slug', slug)
    .single();
  
  return data;
}

/**
 * 📅 EVENTOS DEL MES
 * Ahora apuntan a la tabla de propiedades central
 */
export async function getMonthEvents(propertyId: string, date: Date) {
  const supabase = await createClient();
  
  const startDate = startOfMonth(date);
  const endDate = endOfMonth(date);
  const rangeQuery = `[${startDate.toISOString()},${endDate.toISOString()})`;

  const { data, error } = await supabase
    .from('booking_events')
    .select(`*, user:profiles(*)`) // Usamos profiles central
    .eq('property_id', propertyId) // Este ID ahora es el de 'properties'
    .overlaps('stay_range', rangeQuery)
    .in('status', ['confirmed']); 

  if (error) {
    console.error(error);
    return [];
  }

  return data as BookingEvent[];
}

/**
 * 👥 MIEMBROS DE LA PROPIEDAD
 * Usamos la tabla unificada property_members
 */
export async function getPropertyMembers(propertyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('property_members') // <--- Cambiado
    .select(`
      *,
      profile:profiles(*)
    `)
    .eq('property_id', propertyId);
    
  if (!data) return [];

  // Ordenamos por el nombre del perfil central
  return data.sort((a, b) => {
      const nameA = a.profile?.full_name || ''; 
      const nameB = b.profile?.full_name || '';
      return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
  });
}

/**
 * 🏖️ FESTIVOS (Usando la tabla unificada que vimos antes)
 */
export async function getHolidays() {
  const supabase = await createClient();
  // Nota: Aquí podrías usar el RPC 'get_calendar_holidays' que creamos antes
  const { data, error } = await supabase
    .from('app_holidays')
    .select('*')
    .order('holiday_date');

  if (error || !data) {
    console.error("Error fetching holidays:", error);
    return [];
  }
  return data;
}

/**
 * 🧱 BLOQUEOS EXISTENTES (Mantenimiento y Especiales)
 */
export async function getExistingBlocks(propertyId: string, startDate: Date) {
  const supabase = await createClient();
  const endDate = endOfMonth(addMonths(startDate, 12)); // Miramos un año vista

  const { data: exemptions } = await supabase
    .from('booking_exemptions')
    .select('*')
    .eq('property_id', propertyId)
    .gte('start_date', startDate.toISOString());

  const { data: rawMaintenance } = await supabase
    .from('booking_events')
    .select('notes, stay_range')
    .eq('property_id', propertyId)
    .eq('type', 'maintenance');

  const maintenanceBlocks = (rawMaintenance || []).map(m => {
      const { start, end } = parseBookingRange(m.stay_range);
      return {
        name: m.notes || 'Mantenimiento',
        start_date: start,
        end_date: end,
        type: 'maintenance' as const
      };
  });

  return [
    ...(exemptions || []).map(e => ({
      name: e.name,
      start_date: new Date(e.start_date),
      end_date: new Date(e.end_date),
      type: e.type
    })),
    ...maintenanceBlocks
  ];
}

/**
 * 📦 ENTREGAS/AVISOS PENDIENTES (Handovers)
 * Cambiamos el join de 'booking_profiles' a 'profiles'
 */
export async function getActiveHandovers(propertyId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('booking_handovers')
    .select(`
        *,
        author:profiles!author_id (full_name, avatar_url, color) 
    `)
    .eq('property_id', propertyId)
    .is('resolved_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching handovers:', error);
    return [];
  }
  
  return data;
}

/**
 * 👤 TODOS LOS PERFILES CON SUS PROPIEDADES
 * Ahora buscamos en la tabla de 'profiles' central y vemos
 * en qué 'property_members' están inscritos.
 */
export async function getAllBookingProfiles() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('profiles') // <--- Tabla Core
    .select(`
      *,
      property_members (
        property:properties (id, name, color)
      )
    `)
    .eq('is_active', true); // Asumiendo que mantienes este campo en profiles

  if (error || !data) {
    console.error("Error fetching unified profiles:", error);
    return [];
  }

  // Ordenamos por nombre real
  return data.sort((a, b) => 
    (a.full_name || '').localeCompare(b.full_name || '', undefined, { sensitivity: 'base' })
  );
}