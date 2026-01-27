'use server'

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { MemberRole, MemberResponsibility } from '@/types/booking';

// --- PROPIEDAD ---

// Definimos el tipo de entrada para tener autocompletado y seguridad
type PropertySettingsData = {
  name: string;
  max_slots: number;
  default_turn_duration: number; // <--- NUEVO
  address?: string;              // <--- NUEVO
  image_url?: string;            // <--- NUEVO
  color?: string;                // <--- NUEVO
};

export async function updatePropertySettings(propertyId: string, data: PropertySettingsData) {
  const supabase = await createClient();
  
  // Aquí iría tu verificación de seguridad (Admin check)
  
  const { error } = await supabase
    .from('booking_properties')
    .update({ 
      name: data.name,
      max_slots: data.max_slots,
      // Mapeamos los nuevos campos a las columnas de la BD
      default_turn_duration: data.default_turn_duration,
      address: data.address,
      image_url: data.image_url,
      color: data.color
    })
    .eq('id', propertyId);

  if (error) {
    console.error("Error actualizando propiedad:", error);
    return { success: false, message: error.message };
  }
  
  // Refrescamos la ruta para que se vea el nuevo color/nombre al instante
  revalidatePath('/booking'); 
  return { success: true, message: 'Configuración guardada correctamente' };
}

// --- MIEMBROS ---

export async function upsertMember(data: {
  propertyId: string;
  memberId?: string; 
  displayName: string;
  initials?: string;
  email?: string;          
  secondary_email?: string;
  phone?: string;
  role: MemberRole;
  responsibilities: MemberResponsibility[];
}) {
  const supabase = await createClient();

  try {
    let profileId: string;

    // PREPARAR DATOS DEL PERFIL
    // Usamos las iniciales que vienen del form, o si vienen vacías, las generamos
    const profileData = {
        display_name: data.displayName,
        initials: data.initials || data.displayName.substring(0, 2).toUpperCase(),
        email: data.email,
        secondary_email: data.secondary_email,
        phone: data.phone
    };

    // A. GESTIÓN DEL PERFIL (Booking Profile)
    if (data.memberId) {
      // 1. Si editamos miembro existente, obtenemos su profile_id
      const { data: member } = await supabase
        .from('booking_property_members')
        .select('profile_id')
        .eq('id', data.memberId)
        .single();
      
      if (!member) throw new Error('Miembro no encontrado');
      profileId = member.profile_id;

      // Actualizamos TODOS los campos del perfil
      const { error: updateError } = await supabase
        .from('booking_profiles')
        .update(profileData) // <--- Aquí pasamos el objeto completo
        .eq('id', profileId);

      if (updateError) throw updateError;

    } else {
      // 2. Si es NUEVO miembro, creamos perfil
      const { data: newProfile, error: profError } = await supabase
        .from('booking_profiles')
        .insert(profileData) // <--- Aquí pasamos el objeto completo
        .select()
        .single();

      if (profError) throw profError;
      profileId = newProfile.id;
    }

    // B. GESTIÓN DE LA MEMBRESÍA (Relación)
    const membershipData = {
      role: data.role,
      responsibilities: data.responsibilities,
    };

    if (data.memberId) {
      // UPDATE
      const { error } = await supabase
        .from('booking_property_members')
        .update(membershipData)
        .eq('id', data.memberId);
      if (error) throw error;

    } else {
      // INSERT
      const { count } = await supabase.from('booking_property_members')
        .select('*', { count: 'exact', head: true })
        .eq('property_id', data.propertyId);
        
      const { error } = await supabase
        .from('booking_property_members')
        .insert({
          property_id: data.propertyId,
          profile_id: profileId,
          turn_order: (count || 0) + 1,
          ...membershipData
        });
      if (error) throw error;
    }

    revalidatePath('/booking');
    return { success: true, message: 'Miembro guardado correctamente' };

  } catch (error: any) {
    console.error(error);
    return { success: false, message: error.message };
  }
}

export async function upsertMembership(data: {
  propertyId: string;
  profileId: string;     // El perfil global que vamos a vincular
  memberId?: string;     // Si existe, es que ya está en la casa y solo cambiamos rol
  role: MemberRole;
  responsibilities: MemberResponsibility[];
}) {
  const supabase = await createClient();

  try {
    // 1. Si es una VINCULACIÓN NUEVA (Insert), verificamos que no esté ya dentro
    if (!data.memberId) {
       const { data: existing } = await supabase
         .from('booking_property_members')
         .select('id')
         .eq('property_id', data.propertyId)
         .eq('profile_id', data.profileId)
         .single();
       
       if (existing) {
         // Si ya existe, en realidad podríamos hacer un update silencioso, 
         // pero por seguridad avisamos o actualizamos su ID.
         data.memberId = existing.id; 
       }
    }

    // 2. PREPARAR DATOS
    const membershipData = {
      role: data.role,
      responsibilities: data.responsibilities,
    };

    if (data.memberId) {
      // UPDATE: Solo actualizamos permisos
      const { error } = await supabase
        .from('booking_property_members')
        .update(membershipData)
        .eq('id', data.memberId);
      if (error) throw error;

    } else {
      // INSERT: Creamos el vínculo
      // Calculamos el orden para ponerlo al final
      const { count } = await supabase.from('booking_property_members')
        .select('*', { count: 'exact', head: true })
        .eq('property_id', data.propertyId);
        
      const { error } = await supabase
        .from('booking_property_members')
        .insert({
          property_id: data.propertyId,
          profile_id: data.profileId,
          turn_order: (count || 0) + 1,
          ...membershipData
        });
      if (error) throw error;
    }

    revalidatePath('/booking');
    return { success: true, message: 'Permisos actualizados correctamente' };

  } catch (error: any) {
    console.error(error);
    return { success: false, message: error.message };
  }
}

export async function removeMember(memberId: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('booking_property_members')
    .delete()
    .eq('id', memberId);

  if (error) return { success: false, message: error.message };
  
  revalidatePath('/booking');
  return { success: true, message: 'Miembro desvinculado de la propiedad' };
}