// app/types/settings.ts
import { User } from "@supabase/supabase-js";

// Estructura de datos que obtenemos de la tabla 'profiles'
export interface UserProfile {
    full_name: string | null;
    bio: string | null;
    avatar_url: string | null;
    // Añade cualquier otro campo que obtengas de 'profiles'
}

// Estructura de props que pasa el Server Component al Cliente
export interface ProfileViewProps {
    user: User;
    profile: UserProfile | null;
    // Opciones para el header (ya que ProfilePage es la que tiene los datos)
    userEmail: string; 
    userRole: string | null;
}

// Interfaz para la función de fetching de datos
export interface FullProfileData {
    user: User;
    profile: UserProfile | null;
    userRole: string | null;
}
// Interfaz para la entidad app_modules (Tabla de la base de datos)
export interface AppModule {
    id: string;
    key: string;
    name: string;
    description: string | null;
    icon: string | null;
    is_active: boolean;
}

// Nota: UserMenuProps y ActionResponse deben residir en types/common.ts