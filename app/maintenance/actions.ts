'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { getUserData } from '@/utils/security'

export async function createMaintenanceTask(formData: FormData) {
    const supabase = await createClient()
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return { success: false, error: "No autorizado" }

    // 1. Extraer metadatos básicos
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const priority = parseInt(formData.get('priority') as string) || 2
    const propertyId = formData.get('propertyId') as string || null
    const itemId = formData.get('itemId') as string || null
    const locationId = formData.get('locationId') as string || null // El ID que viene del Selector Progresivo
    const isPersonal = formData.get('is_personal') === 'true'

    // 2. Extraer metadatos de RECURRENCIA
    const isRecurring = formData.get('is_recurring') === 'true'
    const frequencyMonths = formData.get('frequency_months') 
        ? parseInt(formData.get('frequency_months') as string) 
        : null
    const nextOccurrence = formData.get('next_occurrence') as string || null
    const type = isRecurring ? 'preventivo' : (formData.get('type') as any || 'averia')

    // Parseamos las fotos
    const imagesRaw = formData.get('images') as string
    const imagesUrls = imagesRaw ? JSON.parse(imagesRaw) : []

    const finalLocationId = (!isPersonal && !itemId && locationId && locationId !== "none") 
        ? locationId 
        : null

    // 3. Insertar la Tarea con las columnas correctas
    const { data: task, error: taskError } = await supabase
        .from('maintenance_tasks')
        .insert({
            title,
            description,
            type,
            priority,
            property_id: isPersonal ? null : propertyId,
            item_id: itemId || null,
            location_id: finalLocationId, 
            status: 'pendiente',
            created_by: userData.user.id,
            is_recurring: isRecurring,
            frequency_months: frequencyMonths,
            next_occurrence: nextOccurrence,
            images: isRecurring ? imagesUrls : []
        })
        .select()
        .single()

    if (taskError) {
        console.error("Error al crear tarea:", taskError)
        return { success: false, error: taskError.message }
    }

    // 5. Crear el Log de apertura
    if (isRecurring) {
        // 1. Si es recurrente, creamos la primera "Actividad Programada" en el timeline
        await submitTimelineEntry({
            taskId: task.id,
            content: `Iteración: ${title}`, 
            entryType: 'actividad', 
            activityDate: nextOccurrence, 
            activityStatus: 'programada'
        })
    } else {
        // 2. Si es avería normal, el log clásico de apertura
        await submitTimelineEntry({
            taskId: task.id,
            content: `🛠️ Apertura de incidencia: ${description || 'Sin más detalles'}`,
            entryType: 'comentario',
            images: imagesUrls
        })
    }
    // 6. Revalidaciones
    revalidatePath('/maintenance')
    if (propertyId) revalidatePath(`/properties/${propertyId}/maintenance`)
    revalidatePath(`/maintenance/task/${task.id}`)

    return { success: true, data: task }
}

export async function updateMaintenanceTask(taskId: string, data: any) {
    const supabase = await createClient();
    
    const { error } = await supabase
        .from('maintenance_tasks')
        .update({
            title: data.title,
            description: data.description,
            status: data.status,
            priority: data.priority,
            type: data.type,
            category: data.category, // O category_id si usas relación
            insurance_status: data.insurance_status, // <-- OJO: Mira que en DB se llame así
            insurance_ref: data.insurance_ref,       // <-- OJO: Mira que en DB se llame así
            assigned_to: data.assigned_to === 'none' ? null : data.assigned_to
        })
        .eq('id', taskId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/maintenance/task/${taskId}`);
    return { success: true };
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
