// types/commons.ts

// --- TIPOS TRANSVERSALES ---

// Tipo estándar para respuestas de Server Action
export interface ActionResponse {
    success: boolean;
    error?: string;
    message?: string;
}

// Extensión para la acción de creación de reportes (específica de Travel)
// NOTA: La dejamos aquí si la mayoría de los tipos de respuesta se parecen a esta.
export interface CreateReportResponse extends ActionResponse {
    reportId?: string;
}

// Tipo base de Perfil (usado para Auth/User Management)
export interface Profile {
  id: string; // UUID
  full_name: string;
  email?: string;
  avatar_url?: string;
  role?: string;
  // Añadir cualquier otro campo universal aquí
}


// --- TIPOS DE ADMINISTRACIÓN DE USUARIOS (Estructura de la DB) ---
// Estos tipos son transversales porque se usan en el componente de gestión de usuarios.

export interface AppGroup {
  id: number; // bigint en la DB
  group: string;
}

// El tipo Profile final para la página de administración (unión de auth.user + profiles)
export interface AdminUserProfile {
  id: string; // UUID de auth.users
  email: string | null;
  role: string | null;
  
  // La relación anidada para el listado de grupos de ese usuario
  profiles_groups: {
    app_groups: AppGroup;
  }[];
}