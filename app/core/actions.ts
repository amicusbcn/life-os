// app/core/actions.ts
'use server'
import { createClient } from '@/utils/supabase/server'
import { ActionResponse } from '@/types/common'
import { revalidatePath } from 'next/cache'
import { FeedbackCategory } from '@/types/settings';
import { AppFeedback } from '@/types/settings';

/**
 * Guarda una petición de cambio/feedback enviada por el usuario.
 */
export async function submitFeedback(formData: FormData): Promise<ActionResponse> {
    const supabase = await createClient();
    const content = formData.get('content') as string;
    const currentPath = formData.get('currentPath') as string;

    if (!content || content.length < 5) {
        return { success: false, error: 'La idea debe tener al menos 5 caracteres.' };
    }

    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        // No verificamos si el usuario existe, ya que Supabase Auth lo gestiona por RLS.
        // Si no está logueado, fallará por falta de user_id/permiso.
        
        const { error } = await supabase
            .from('app_feedback')
            .insert({ 
                content: content,
                user_id: user?.id,
                type: 'feature',
                context_path: currentPath || 'N/A'
            });

        if (error) {
            console.error('Error al guardar feedback:', error);
            return { success: false, error: 'Fallo en BBDD al guardar la idea.' };
        }

        // No requiere revalidación de path ya que no afecta a la UI inmediata
        return { success: true, message: '¡Gracias! Tu idea ha sido guardada.' };

    } catch (error) {
        console.error('Error catastrófico en submitFeedback:', error);
        return { success: false, error: 'Error interno del servidor.' };
    }
}

/**
 * Alterna el estado 'is_processed' de una propuesta de feedback por su ID.
 * Requiere que el usuario sea administrador (protegido por RLS).
 */
export async function updateFeedbackStatus(feedbackId: string, currentStatus: boolean): Promise<ActionResponse> {
    const supabase = await createClient();

    try {
        // La validación del rol debe ocurrir a través de RLS en la tabla app_feedback, 
        // pero por seguridad, podemos verificar el perfil si es estrictamente necesario.
        
        const { error } = await supabase
            .from('app_feedback')
            .update({ is_processed: !currentStatus }) // Alternamos el estado
            .eq('id', feedbackId);

        if (error) {
            console.error('Error al actualizar estado del feedback:', error);
            return { success: false, error: 'Fallo en BBDD al actualizar el estado.' };
        }

        // Revalidamos la página de gestión de feedback para actualizar la tabla
        revalidatePath('/settings/feedback');
        
        return { success: true, message: `Estado actualizado a ${!currentStatus ? 'Procesada' : 'Pendiente'}.` };

    } catch (error) {
        console.error('Error catastrófico en updateFeedbackStatus:', error);
        return { success: false, error: 'Error interno del servidor.' };
    }
}

export async function updateFeedbackCategory(feedbackId: string, category: FeedbackCategory): Promise<ActionResponse> {
    const supabase = await createClient();

    try {
        const { error } = await supabase
            .from('app_feedback')
            .update({ type: category }) 
            .eq('id', feedbackId);

        if (error) {
            return { success: false, error: 'Fallo al actualizar la categoría.' };
        }

        revalidatePath('/settings/feedback');
        return { success: true, message: `Categoría actualizada a ${category}.` };

    } catch (error) {
        return { success: false, error: 'Error interno del servidor.' };
    }
}

/**
 * Obtiene todas las propuestas de feedback con los datos del perfil del remitente.
 * (Debe ser protegido por RLS o lógica de admin/rol en el server).
 */
export async function getFeedbackProposals(): Promise<AppFeedback[]> {
    const supabase = await createClient();

    // Solo un administrador debería poder acceder a esta función.
    // Asumimos que RLS o la función caller ya lo han validado.
    
    const { data, error } = await supabase
        .from('app_feedback')
        .select(`
            id, created_at, content, type, is_processed, user_id, context_path,
            profiles ( full_name ) 
        `)
        .order('created_at', { ascending: false })
        .returns<AppFeedback[]>();
        
    if (error) {
        console.error("Error fetching feedback proposals:", error);
        return [];
    }

    return data as AppFeedback[];
}