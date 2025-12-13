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

// Tipo para la estructura de app_groups
export interface AppModuleGroup {
    id: number;
    group: string;
}

// Tipo para la relación profiles_groups
export interface UserGroupRelation {
    id_user: string;
    app_groups: AppModuleGroup | null; // El JOIN puede devolver null si no hay datos
}

// Tipo para el perfil combinado (Auth + Profiles + Groups)
export interface UserProfileAdminView {
    id: string;
    email: string | null;
    role: string | null;
    // La relación de grupos para la vista de administrador
    profiles_groups: UserGroupRelation[]; 
}

// 1. Tipos de Entidad
export type FeedbackCategory = 'bug' | 'improvement' | 'feature' | 'other';

export interface AppFeedback {
    id: string;
    created_at: string;
    content: string;
    type: FeedbackCategory; // Usar el tipo de categoría
    is_processed: boolean;
    user_id: string;
    context_path: string; // La ruta desde donde se envió
    
    profiles: {
        full_name: string | null;
    } | null;
}

// 2. Mapa de categorías (para la UI)
export const CATEGORIES_MAP: Record<FeedbackCategory, { label: string; color: string }> = {
    bug: { label: 'Bug / Error', color: 'bg-red-500' },
    improvement: { label: 'Mejora UX/UI', color: 'bg-indigo-500' },
    feature: { label: 'Nueva Funcionalidad', color: 'bg-emerald-500' },
    other: { label: 'General / Otros', color: 'bg-slate-500' },
};

export interface FeedbackTableViewProps {
    proposals: AppFeedback[];
}

export interface AppFeedback {
    id: string;
    created_at: string;
    content: string;
    is_processed: boolean;
    user_id: string;
    context_path: string;
    type: FeedbackCategory;
    profiles: {
        full_name: string | null;
    } | null;
}
export type SortKey = 'created_at' | 'profiles.full_name' | 'context_path' | 'is_processed';
export type SortOrder = 'asc' | 'desc';

export interface TableState {
    sortBy: SortKey;
    sortOrder: SortOrder;
}