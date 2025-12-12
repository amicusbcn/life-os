import { createClient } from '@/utils/supabase/server';

// Definición de tipos para el feedback (Asumimos que no existe aún en types/core)
// Nota: Podríamos ponerlo en types/home.ts o types/core.ts
export interface AppFeedback {
    id: string;
    created_at: string;
    content: string;
    type: string;
    is_processed: boolean;
    user_id: string;
    // JOIN con el perfil del usuario que lo envió
    profiles: {
        full_name: string | null;
        email: string;
    } | null;
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
            id, created_at, content, type, is_processed, user_id,
            profiles ( full_name, email ) 
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching feedback proposals:", error);
        return [];
    }

    return data as AppFeedback[];
}