import { createClient } from '@/utils/supabase/server';
import { UserProfile, FullProfileData } from '@/types/settings';

/**
 * Obtiene los datos completos del usuario y su perfil asociado.
 * Debe ser llamado desde un Server Component que valida la sesión.
 */
export async function getFullProfileData(userId: string): Promise<FullProfileData | null> {
    const supabase = await createClient();

    // 1. Obtener el perfil y el rol del usuario
    const { data, error } = await supabase
        .from("profiles")
        .select("full_name, bio, avatar_url, role") // <-- Importante: obtener también el rol
        .eq("id", userId)
        .single();
    
    // El error PGRST116 (no rows found) es común si el perfil no se ha creado aún
    if (error && error.code !== 'PGRST116') { 
        console.error("Error fetching profile data:", error);
        return null;
    }

    // 2. Obtener la sesión (necesario para el email y el objeto user)
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    return {
        user: user,
        profile: data as UserProfile | null,
        userRole: data?.role || null,
    };
}