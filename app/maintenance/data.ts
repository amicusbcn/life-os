// app/maintenance/data.ts
import { createClient } from '@/utils/supabase/server';
import { MaintenanceTask } from '@/types/maintenance';
import { InventoryItemBase } from '@/types/inventory';
import { PropertyBase } from '@/types/properties';

export interface TaskFilters {
    property_id?: string;
    item_id?: string;
    is_archived?: boolean;
    type?: 'correctivo' | 'preventivo';
    assigned_to?: string;
    priority?: number;
}

export async function getMaintenanceTasks(filters: Record<string, any> = {}) {
    const supabase = await createClient();
    
    // 1. Definimos la base de la query
    let query = supabase
        .from('maintenance_tasks')
        .select(`
            *,
            properties (id, name, slug),
            inventory_items (id, name, property_id),
            category:maintenance_categories (id, name, icon, color),
            assigned_member:property_members!maintenance_tasks_assigned_to_fkey (
                id,
                name
            )
        `);

    // 2. Aplicación Automática de Filtros
    // Recorremos las llaves del objeto filters
    Object.keys(filters).forEach((key) => {
        const value = filters[key];

        // Saltamos si es null o undefined
        if (value === undefined || value === null) return;

        // LÓGICA INTELIGENTE:
        // Si el valor es un Array -> usamos .in()
        // Si no -> usamos .eq()
        if (Array.isArray(value)) {
            query = query.in(key, value);
        } else {
            query = query.eq(key, value);
        }
    });

    // 3. Orden por defecto
    query = query
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

    const { data, error } = await query;
    
    if (error) {
        console.error("Supabase Error:", error.message);
        throw new Error(error.message);
    }
    
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
        category:maintenance_categories (id, name, icon, color),
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
    const { data: rawTimeline, error: timelineError } = await supabase
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
    const timeline = rawTimeline?.map(log => ({
        ...log,
        // Aquí es donde sucede la "magia" para no romper el resto de la app
        is_completed: log.activity_status === 'realizada'
    })) || [];
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