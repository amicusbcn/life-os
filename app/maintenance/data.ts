// app/maintenance/data.ts
import { createClient } from '@/utils/supabase/server';
import { MaintenanceTask } from '@/types/maintenance';
import { InventoryItemBase } from '@/types/inventory';
import { PropertyBase } from '@/types/properties';

interface TaskFilters {
  propertyId?: string;
  inventoryItemId?: string;
  isArchived?: boolean;
}

export async function getMaintenanceTasks(filters: TaskFilters = {}) {
  const supabase = await createClient();
  const { propertyId, inventoryItemId, isArchived = false } = filters;
    let query = supabase
        .from('maintenance_tasks')
        .select(`
                *,
                properties (id, name, slug),
                inventory_items (id, name, property_id),
                assigned_member:property_members!maintenance_tasks_assigned_to_fkey (
                name
                ),
                created_by_profile:profiles!maintenance_tasks_created_by_fkey (
                    full_name
                )
            `)
        .eq('is_archived', isArchived)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });
    if (propertyId) {
        query = query.eq('property_id', propertyId);
    }

    if (inventoryItemId) {
        query = query.eq('item_id', inventoryItemId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data as MaintenanceTask[];
}

export async function getAllInventoryItemsBase() {
    const supabase = await createClient();
    const { data } = await supabase
        .from('inventory_items')
        .select(`
            *,
            location_id,
            property_location_id,
            property_id
        `)
    return (data || []) as InventoryItemBase[];
}

// 3. Obtener Propiedades simplificadas (Ya la tienes en inventory/data, pero la exponemos aquí)
export async function getAllPropertiesBase() {
    const supabase = await createClient();
    const { data } = await supabase
        .from('properties')
        .select('id, name, slug')
        .order('name');
    
    return (data || []) as PropertyBase[];
}

export async function getAllLocations() {
    const supabase = await createClient();

    // Lanzamos ambas peticiones en paralelo para no perder tiempo
    const [propsRes, invRes] = await Promise.all([
        supabase.from('property_locations').select('*, properties(name)').order('name'),
        supabase.from('inventory_locations').select('*').order('name')
    ]);

    // Procesamos ubicaciones de propiedades
    const propertyLocs = (propsRes.data || []).map(loc => ({
        ...loc,
        is_personal: false,
        // Usamos el nombre de la propiedad como contexto
        context_name: loc.properties?.name || 'Propiedad'
    }));

    // Procesamos ubicaciones personales
    const personalLocs = (invRes.data || []).map(loc => ({
        ...loc,
        is_personal: true,
        property_id: 'personal', // ID ficticio para el filtro del cliente
        context_name: 'Personal'
    }));

    return [...propertyLocs, ...personalLocs];
}


export async function getTaskWithTimeline(taskId: string) {
    const supabase = await createClient();

    // Traemos la tarea con sus relaciones básicas
    const { data: task, error: taskError } = await supabase
        .from('maintenance_tasks')
        .select(`
        *,
        properties (id, name, slug),
        inventory_items (id, name),
        assigned_member:property_members!maintenance_tasks_assigned_to_fkey (
            id, 
            name, 
            user_id
        ),
        created_by_profile:profiles!maintenance_tasks_created_by_fkey (full_name)
    `)
        .eq('id', taskId)
        .single();

    if (taskError) throw taskError;

    // Traemos el timeline (comentarios + actividades)
    const { data: timeline, error: timelineError } = await supabase
        .from('maintenance_logs')
        .select(`
            *,
            author:profiles (id, full_name, avatar_url),
            assigned_member:property_members!maintenance_logs_assigned_to_fkey (
                id, 
                name
            )
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: true }); // Cronológico

    if (timelineError) throw timelineError;

    return { task, timeline };
}
export async function getMaintenanceCategories() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('maintenance_categories')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error("Error al cargar categorías de mantenimiento:", error);
    return [];
  }

  return data || [];
}