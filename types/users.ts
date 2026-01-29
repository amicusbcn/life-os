import { User } from "@supabase/supabase-js";
import { ActionResponse } from './common'; // Ajusta la ruta a tu archivo common

// --- ENUMS & CONSTANTES ---
export type AppRole = 'admin' | 'editor' | 'viewer';      // Roles de Módulo
export type UserRole = 'admin' | 'user' | 'guest';        // Rol Global
export type EmailPreference = 'all' | 'high_only' | 'none';
export type UserStatus = 'pending' | 'active' | 'inactive';

// --- DOMINIO: MÓDULOS (Fusionado) ---
export interface AppModule {
    id: string
    key: string
    name: string
    description: string | null
    icon: string | null
    route?: string 
    key_url?: string
    is_active: boolean
    order?:number |null
    folder?:string |null
}

// --- DOMINIO: PERFILES (Fusionado) ---
export interface UserProfile {
  id: string; 
  email: string;
  full_name: string | null;
  bio: string | null; // <--- Añadido de tu archivo antiguo
  avatar_url: string | null;
  role: UserRole; 
  email_preference: EmailPreference;
  is_active: boolean;
  created_at: string;
  app_role:AppRole;
  status:UserStatus;
}


// --- DOMINIO: PERMISOS ---
export interface ModulePermission {
    module_key: string; 
    role: AppRole;
}

// --- DTOs PARA UI (Admin Table) ---
export interface AdminUserRow extends UserProfile {
    permissions: Record<string, AppRole>; 
}

// --- DTOs PARA UI (Perfil de Usuario / Mi Cuenta) ---
export interface ProfileViewProps {
    user: User; // Objeto Auth de Supabase
    profile: UserProfile | null;
    userEmail: string; 
    userRole: UserRole | null;
}

export interface FullProfileData {
    user: User;
    profile: UserProfile | null;
    userRole: UserRole | null;
}