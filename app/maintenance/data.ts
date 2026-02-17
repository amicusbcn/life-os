// app/maintenance/data.ts
import { createClient } from '@/utils/supabase/server';
import { MaintenanceTask } from '@/types/maintenance';
import { InventoryItemBase } from '@/types/inventory';
import { PropertyBase } from '@/types/properties';

export async function getMaintenanceTasks() {
    const supabase = await createClient();
    const { data, error } = await supabase
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
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data as MaintenanceTask[];
}

export async function getAllInventoryItemsBase() {
    const supabase = await createClient();
    const { data } = await supabase
        .from('inventory_items')
        .select('id, name, property_id')
        .order('name');
    
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
    const { data } = await supabase
        .from('property_locations')
        .select('*')
        .order('name');
    
    return data || [];
}

// app/maintenance/data.ts

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