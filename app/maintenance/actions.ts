'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { getUserData } from '@/utils/security'

export async function createMaintenanceTask(formData: FormData) {
    const supabase = await createClient()
    
    // Extraer datos del FormData
    const title = formData.get('title') as string
    const propertyId = formData.get('propertyId') as string
    const description = formData.get('description') as string
    const type = formData.get('type') as any
    const itemId = formData.get('itemId') as string || null
    const locationId = formData.get('locationId') as string || null
    const assignedTo = formData.get('assignedTo') as string || null

    const { data: userData } = await supabase.auth.getUser()
    
    const { data, error } = await supabase
        .from('maintenance_tasks')
        .insert({
            title,
            property_id: propertyId,
            description,
            type,
            item_id: itemId,
            location_id: locationId,
            assigned_to: assignedTo,
            created_by: userData.user?.id
        })
        .select()
        .single()

    if (error) return { success: false, error: error.message }

    // Log automático de creación
    await supabase.from('maintenance_logs').insert({
        task_id: data.id,
        user_id: userData.user?.id,
        entry_type: 'sistema',
        content: description || 'Incidencia abierta sin descripción adicional.'
    })

    revalidatePath('/maintenance')
    revalidatePath(`/properties/${propertyId}/maintenance`)
    return { success: true, data }
}


/**
 * Motor principal de estados:
 * Maneja: aceptar (ongoing), cerrar (closed) y rechazar (cancelled + auto-archive)
 */
// app/maintenance/actions.ts

export async function updateTaskStatus({
    taskId, 
    newStatus, 
    propertyId, 
    comment 
}: { 
    taskId: string, 
    newStatus: string, 
    propertyId: string, 
    comment?: string 
}) {
    try {
        const supabase = await createClient();
        
        const { profile, canEdit } = await getUserData('maintenance', {
            table: 'property_members',
            column: 'property_id',
            id: propertyId
        });

        if (!canEdit) throw new Error("No tienes permisos suficientes.");

        const updateData: any = { 
            status: newStatus, 
            updated_at: new Date().toISOString() 
        };

        if (newStatus === 'cancelled') {
            updateData.is_archived = true;
            updateData.archived_at = new Date().toISOString();
        }

        const { error: taskError } = await supabase
            .from('maintenance_tasks')
            .update(updateData)
            .eq('id', taskId);

        if (taskError) throw taskError;

        await supabase.from('maintenance_logs').insert({
            task_id: taskId,
            user_id: profile.id,
            entry_type: 'sistema',
            content: comment 
                ? `ha cambiado el estado a ${newStatus.toUpperCase()}. Nota: "${comment}"`
                : `ha cambiado el estado a ${newStatus.toUpperCase()}.`
        });

        revalidatePath(`/maintenance/task/${taskId}`);
        
        return { success: true };

    } catch (error: any) {
        console.error("Error en updateTaskStatus:", error);
        return { 
            success: false, 
            error: error.message || "Error desconocido" 
        };
    }
}

/**
 * Acción específica para archivar tareas que ya están cerradas (Limpieza de Admin)
 */
export async function archiveTask({ 
    taskId, 
    propertyId 
}: { 
    taskId: string, 
    propertyId: string 
}) {
    const supabase = await createClient();
    
    const { profile, isAdminGlobal } = await getUserData('maintenance', {
        table: 'property_members',
        column: 'property_id',
        id: propertyId
    });

    if (!isAdminGlobal) {
        throw new Error("Solo un administrador global puede archivar tareas cerradas.");
    }

    const { error: taskError } = await supabase
        .from('maintenance_tasks')
        .update({ 
            is_archived: true, 
            archived_at: new Date().toISOString() 
        })
        .eq('id', taskId);

    if (taskError) throw taskError;

    await supabase.from('maintenance_logs').insert({
        task_id: taskId,
        user_id: profile.id,
        entry_type: 'sistema',
        content: `ha archivado la incidencia para limpiar el listado activo.`
    });

    revalidatePath(`/maintenance/task/${taskId}`);
    return { success: true };
}

/**
 * 1. ASIGNAR RESPONSABLE (Fase 0 -> Fase 1)
 */
export async function assignTaskResponsable({ taskId, memberId, memberName }: any) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Actualizar tarea y pasar a en_proceso
    const { error } = await supabase
        .from('maintenance_tasks')
        .update({ 
            assigned_to: memberId,
            status: 'en_proceso' 
        })
        .eq('id', taskId);

    if (error) throw error;

    // Log de sistema
    await supabase.from('maintenance_logs').insert({
        task_id: taskId,
        user_id: user?.id,
        entry_type: 'sistema',
        content: `asignó a **${memberName}** como responsable. La incidencia pasó a **En curso**.`
    });

    revalidatePath(`/maintenance/task/${taskId}`);
}



export async function submitTimelineEntry({ 
    taskId, 
    content, 
    entryType, 
    activityDate, 
    assignedMemberId,
    images = [] 
}: any) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
        .from('maintenance_logs')
        .insert({
            task_id: taskId,
            user_id: user?.id,
            content,
            entry_type: entryType,
            activity_date: activityDate ? new Date(activityDate).toISOString() : null,
            assigned_to: assignedMemberId,
            activity_status: entryType === 'actividad' ? 'programada' : null,
            images: images 
        });

    if (error) throw error;

    revalidatePath(`/maintenance/task/${taskId}`);
}


export async function updateTimelineEntry({ 
    logId, 
    taskId, 
    content, 
    resultNotes,
    images, 
    propertyId,
    activityDate,
    assignedMemberId,
    isCompleted // <--- Nuevo: Booleano opcional
}: { 
    logId: string, 
    taskId: string, 
    content: string, 
    resultNotes: string | null,
    images: string[], 
    propertyId: string,
    activityDate?: Date | null,
    assignedMemberId?: string | null,
    isCompleted?: boolean // <--- Nuevo
}) {
    const supabase = await createClient();
    
    // 1. Validamos seguridad (Agnóstica)
    const { profile, canEdit } = await getUserData('maintenance', {
        table: 'property_members',
        column: 'property_id',
        id: propertyId
    });

    // 2. Comprobamos autoría
    const { data: existingLog } = await supabase
        .from('maintenance_logs')
        .select('user_id')
        .eq('id', logId)
        .single();

    const isAuthor = existingLog?.user_id === profile.id;

    if (!isAuthor && !canEdit) {
        throw new Error("No tienes permiso para editar esta entrada");
    }

    // 3. Preparamos el objeto de actualización
    const updateData: any = {
        content,
        result_notes: resultNotes,
        images,
        activity_date: activityDate ? new Date(activityDate).toISOString() : null,
        assigned_to: assignedMemberId || null,
        updated_at: new Date().toISOString()
    };

    // Si nos pasan isCompleted: true, marcamos la fecha de finalización
    if (isCompleted) {
        updateData.is_completed = true;
        updateData.completed_at = new Date().toISOString();
    }

    // 4. Ejecutamos el update
    const { error } = await supabase
        .from('maintenance_logs')
        .update(updateData)
        .eq('id', logId);

    if (error) throw error;

    revalidatePath(`/maintenance/task/${taskId}`);
}
