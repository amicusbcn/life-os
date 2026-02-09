import { createClient } from '@/utils/supabase/server';
import { Property, PropertyAlert, PropertyContact, PropertyLocation, ZoneWithRooms } from '@/types/properties';

export async function getPropertyBySlug(slug: string): Promise<Property | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('properties')
    .select('*')
    .eq('slug', slug)
    .single();
  
  return data as Property;
}

export async function getProperties(): Promise<Property[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('properties')
    .select('*')
    .order('name');
  
  return (data || []) as Property[];
}

export async function getPropertyById(id: string): Promise<Property | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .single();
  
  return data as Property;
}

export async function getPropertyLocations(propertyId: string): Promise<ZoneWithRooms[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('property_locations')
    .select('*')
    .eq('property_id', propertyId)
    .order('sort_order', { ascending: true }) 
    .order('name', { ascending: true });

  if (!data) return [];

  const allLocations = data as PropertyLocation[];
  
  // Agrupamos en memoria para facilitar la UI (Padres e Hijos)
  const zones = allLocations.filter(l => l.type === 'zone');
  const rooms = allLocations.filter(l => l.type === 'room');

  return zones.map(zone => ({
    ...zone,
    rooms: rooms.filter(room => room.parent_id === zone.id)
  }));
}

import { PropertyMember } from '@/types/properties';

export async function getPropertyMembers(propertyId: string): Promise<PropertyMember[]> {
  const supabase = await createClient();

  // 1. Hacemos la consulta con JOIN
  // Pedimos todo de 'property_members' Y los datos clave de 'profiles' usando user_id
  const { data, error } = await supabase
    .from('property_members')
    .select(`
      *,
      profiles:user_id (
        full_name,
        email,
        avatar_url
      )
    `)
    .eq('property_id', propertyId);

  if (error) {
    console.error("Error fetching members:", error);
    return [];
  }

  // 2. Mapeamos (Aplanamos) los datos para que el Frontend no sufra
  // Prioridad: Datos de Profile Real > Datos Locales (Fantasma)
  const members = data.map((m: any) => ({
    id: m.id,
    property_id: m.property_id,
    user_id: m.user_id,
    role: m.role,
    created_at: m.created_at,
    
    // AQUÍ ESTÁ LA MAGIA:
    // Si hay perfil (usuario real), usamos su nombre real.
    // Si no (usuario fantasma/guest), usamos el nombre guardado en la tabla members.
    name: m.profiles?.full_name || m.name || 'Sin Nombre',
    email: m.profiles?.email || m.email,
    avatar_url: m.profiles?.avatar_url || m.avatar_url
  }));

  return members as PropertyMember[];
}

export async function getPropertyContacts(propertyId: string): Promise<PropertyContact[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('property_contacts')
    .select('*')
    .eq('property_id', propertyId)
    .order('name'); // Orden alfabético
    
  return (data as PropertyContact[]) || [];
}
export async function getPropertyAlerts(propertyId: string): Promise<PropertyAlert[]> {
    const supabase = await createClient();
    const { data } = await supabase
        .from('property_alerts')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });
    
    return (data as PropertyAlert[]) || [];
}