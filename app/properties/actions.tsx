'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// --- CREATE ---
export async function createProperty(formData: FormData) {
  const supabase = await createClient();
  const user = await supabase.auth.getUser();

  if (!user.data.user) throw new Error('Unauthorized');

  const name = formData.get('name') as string;
  const slugRaw = formData.get('slug') as string;
  const slug = slugRaw || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  // CORRECCIÓN: Construimos el objeto exacto para tu tabla
  const payload = {
    name,
    slug,
    address: formData.get('address'),
    description: formData.get('description'),
    // Mapeamos a las columnas JSONB separadas
    wifi_info: {
        ssid: formData.get('wifi_ssid'),
        password: formData.get('wifi_pass'),
    },
    insurance_info: {
        company: formData.get('ins_company'),
        policy: formData.get('ins_policy'),
        phone: formData.get('ins_phone'),
    },
    // Dejamos que active_modules use el valor por defecto de la BBDD
  };

  const { data: newProp, error } = await supabase
    .from('properties')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("🛑 ERROR AL CREAR:", error);
    throw new Error(error.message);
  }

  // Asignar Owner
  await supabase.from('property_members').insert({
    property_id: newProp.id,
    user_id: user.data.user.id,
    role: 'owner'
  });

  revalidatePath('/properties');
  redirect(`/properties/${newProp.id}`);
}

// --- UPDATE ---
export async function updateProperty(id: string, formData: FormData) {
  const supabase = await createClient();
  
  const payload = {
    name: formData.get('name'),
    address: formData.get('address'),
    description: formData.get('description'),
    updated_at: new Date().toISOString(),
    // Mapeamos a las columnas JSONB separadas
    wifi_info: {
        ssid: formData.get('wifi_ssid'),
        password: formData.get('wifi_pass'),
    },
    insurance_info: {
        company: formData.get('ins_company'),
        policy: formData.get('ins_policy'),
        phone: formData.get('ins_phone'),
    }
  };

  const { error } = await supabase.from('properties').update(payload).eq('id', id);

  if (error) {
    console.error("🛑 ERROR AL EDITAR:", error);
    throw new Error(error.message);
  }

  revalidatePath(`/properties/${id}`);
  revalidatePath('/properties');
}


export async function deleteLocation(locationId: string, propertyId: string) {
    const supabase = await createClient();
    await supabase.from('property_locations').delete().eq('id', locationId);
    revalidatePath(`/properties/${propertyId}`);
}

export async function addLocation(
    propertyId: string, 
    parentId: string | null, 
    name: string, 
    type: string
) {
    const supabase = await createClient();

    // A. Calcular el orden automáticamente (MAX + 1)
    // Buscamos items hermanos (mismo padre y misma propiedad)
    let query = supabase.from('property_locations')
        .select('sort_order')
        .eq('property_id', propertyId)
        .order('sort_order', { ascending: false })
        .limit(1);

    if (parentId) {
        query = query.eq('parent_id', parentId);
    } else {
        query = query.is('parent_id', null);
    }

    const { data: maxOrderData } = await query;
    const nextOrder = (maxOrderData?.[0]?.sort_order ?? 0) + 1;

    // B. Insertar
    const { error } = await supabase.from('property_locations').insert({
        property_id: propertyId,
        parent_id: parentId,
        name,
        type,
        sort_order: nextOrder // ¡Automático!
    });
    
    if (error) throw new Error(error.message);
    revalidatePath(`/properties/${propertyId}`);
}

// 2. REORDENAR (Drag & Drop Save)
export async function reorderLocations(items: { id: string, sort_order: number }[], propertyId: string) {
    const supabase = await createClient();
    
    // Actualizamos en bloque (o uno a uno, Postgres es rápido)
    const updates = items.map(item => 
        supabase.from('property_locations').update({ sort_order: item.sort_order }).eq('id', item.id)
    );

    await Promise.all(updates);
    revalidatePath(`/properties/${propertyId}`);
}

// ... imports ...

// CREAR MIEMBRO (Fantasma o Invitación)
export async function addMember(formData: FormData) {
    const supabase = await createClient();
    
    // 1. Recoger datos
    const propertyId = formData.get('property_id') as string;
    const name = formData.get('name') as string;
    const role = formData.get('role') as string; // 'admin', 'member', 'guest'
    const email = formData.get('email') as string; // Opcional

    // 2. Seguridad: Verificar que quien invita es OWNER o ADMIN
    // (Omitido por brevedad, pero deberías usar `can('manage_members')` logic aquí o confiar en RLS)

    // 3. Lógica: ¿Es Fantasma o Real?
    // Por ahora, si ponemos email asumimos que es una invitación pendiente (futuro),
    // pero si no hay user_id asociado, se guarda como fantasma con ese email de referencia.
    
    // Buscar si ese email ya existe en auth.users (Opcional Pro)
    // const { data: existingUser } = await supabase.rpc('get_user_by_email', { email });

    const payload = {
        property_id: propertyId,
        role,
        name,         // Guardamos el nombre "display" para el fantasma
        email: email || null,
        user_id: null // Inicialmente NULL (Fantasma). Si acepta invitación, se actualiza.
    };

    const { error } = await supabase.from('property_members').insert(payload);

    if (error) throw new Error(error.message);
    revalidatePath(`/properties/${propertyId}`);
}

// BORRAR MIEMBRO
export async function removeMember(memberId: string, propertyId: string) {
    const supabase = await createClient();
    
    // OJO: Aquí debe ser .eq('id', memberId), NO .eq('user_id', ...)
    const { error } = await supabase.from('property_members').delete().eq('id', memberId);

    if (error) throw new Error(error.message);
    revalidatePath(`/properties/${propertyId}`); // O slug si ya lo cambiaste
}

// ...

// AÑADIR CONTACTO
export async function addContact(formData: FormData) {
    const supabase = await createClient();
    const propertyId = formData.get('property_id') as string;
    
    // Convertimos vacíos a null
    const getVal = (key: string) => {
        const val = formData.get(key) as string;
        return val?.trim() || null;
    };

    const payload = {
        property_id: propertyId,
        name: formData.get('name') as string,
        role: formData.get('role') as string,
        phone: getVal('phone'),
        email: getVal('email'),
        notes: getVal('notes'),
        category: formData.get('category') as string,
        is_protected: formData.get('is_protected') === 'on'
    };

    const { error } = await supabase.from('property_contacts').insert(payload);
    if (error) throw new Error(error.message);
    
    revalidatePath(`/properties/${propertyId}`); // Ojo, si tienes el slug en la URL, usa revalidatePath layout o la ruta correcta
}

// BORRAR CONTACTO
export async function deleteContact(contactId: string, propertyId: string) {
    const supabase = await createClient();
    const { error } = await supabase.from('property_contacts').delete().eq('id', contactId);
    if (error) throw new Error(error.message);
    revalidatePath(`/properties/${propertyId}`);
}

// Imports necesarios...
import { CreateNotificationDTO } from '@/types/notifications'; 

export async function createPropertyAlert(formData: FormData) {
    const supabase = await createClient();
    const propertyId = formData.get('property_id') as string;
    const title = formData.get('title') as string;
    const message = formData.get('message') as string;
    const type = formData.get('type') as string; // info, warning, critical
    const shouldNotify = formData.get('notify_everyone') === 'on';
    const startDate = formData.get('start_date') as string; // Viene como ISO string o YYYY-MM-DD
    const endDate = formData.get('end_date') as string;

    // 1. CREAR EL "PÓST-IT" EN EL DASHBOARD
    const { error: alertError } = await supabase.from('property_alerts').insert({
        property_id: propertyId,
        title,
        message,
        type,
        created_by: (await supabase.auth.getUser()).data.user?.id,
        start_date: startDate || new Date().toISOString(),
        end_date: endDate || null
    });

    if (alertError) throw new Error(alertError.message);

    // 2. (OPCIONAL) DISPARAR NOTIFICACIONES A LOS MÓVILES
    if (shouldNotify) {
        // A. Obtenemos los miembros (reutilizamos la lógica de data.tsx o consulta directa)
        const { data: members } = await supabase
            .from('property_members')
            .select('user_id')
            .eq('property_id', propertyId)
            .not('user_id', 'is', null); // Solo usuarios reales

        if (members && members.length > 0) {
            // B. Preparamos las notificaciones masivas
            const notifications: CreateNotificationDTO[] = members.map(m => ({
                recipient_id: m.user_id,
                sender_module: 'properties',
                title: `Aviso en Casa: ${title}`,
                message: message,
                link_url: `/properties/${propertyId}`, // O slug
                type: type === 'critical' ? 'action_needed' : 'info',
                priority: type === 'critical' ? 'high' : 'normal'
            }));

            // C. Insertamos en tu tabla de notificaciones
            await supabase.from('notifications').insert(notifications);
        }
    }

    revalidatePath(`/properties/${propertyId}`);
}

export async function deletePropertyAlert(alertId: string, propertyId: string) {
    const supabase = await createClient();
    await supabase.from('property_alerts').delete().eq('id', alertId);
    revalidatePath(`/properties/${propertyId}`);
}

import { PropertyModules } from '@/types/properties';

export async function updatePropertyModules(propertyId: string, modules: PropertyModules) {
    const supabase = await createClient();
    
    // Verificamos auth (opcional si ya confías en el middleware/RLS)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No autorizado");

    const { error } = await supabase
        .from('properties')
        .update({ active_modules: modules }) // Guardamos el objeto JSON completo
        .eq('id', propertyId);

    if (error) throw new Error(error.message);

    revalidatePath(`/properties`); // Revalidamos para que se actualice la UI
    return { success: true };
}