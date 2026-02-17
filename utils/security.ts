// /utils/security.ts

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { UserProfile, AppModule, AppRole } from '@/types/users'
import { cache } from 'react'

interface SecurityContext {
  table: string;      // Ej: 'property_members', 'trip_members', 'account_users'
  column: string;     // Ej: 'property_id', 'trip_id', 'account_id'
  id: string;         // El UUID de la entidad
}

export const getUserData = cache(async (moduleKey?: string, context?: SecurityContext) => {
/**
 * Obtiene los datos del usuario, permisos de módulo y rol contextual en una entidad.
 * * @param moduleKey - (Opcional) Identificador del módulo (ej: 'maintenance', 'inventory').
 * @param context - (Opcional) Configuración para validar permisos en una entidad específica.
 * * @example
 * // 1. Uso básico (Solo login y perfil)
 * const { profile } = await getUserData();
 * * // 2. Uso con módulo (Valida acceso a la App)
 * const { moduleRole } = await getUserData('maintenance');
 * * // 3. Uso contextual completo (Valida rol en una Propiedad, Cuenta, etc.)
 * const { contextRole, canEdit } = await getUserData('maintenance', {
 * table: 'property_members',
 * column: 'property_id',
 * id: 'uuid-de-la-propiedad'
 * });
 * * @returns {
 * profile: Datos del perfil,
 * isAdminGlobal: Boolean (rol 'admin' en la plataforma),
 * moduleRole: 'admin' | 'editor' | 'viewer' | undefined,
 * contextRole: Rol específico en la tabla consultada (owner, member, guest, etc.),
 * canEdit: Helper booleano basado en la jerarquía de roles
 * }
 */
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // 1. Consultas Base (Igual que antes, NO ROMPE NADA)
  const queries: any[] = [
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('app_modules').select('*').eq('is_active', true).order('order')
  ]

  // 2. Permiso de Módulo (Nivel 2)
  if (moduleKey) {
    queries.push(
      supabase.from('app_permissions').select('role').eq('user_id', user.id).eq('module_key', moduleKey).maybeSingle()
    )
  }

  // 3. Permiso Contextual Agnóstico (Nivel 3)
  if (context) {
    queries.push(
      supabase
        .from(context.table)
        .select('role')
        .eq(context.column, context.id)
        .eq('user_id', user.id)
        .maybeSingle()
    )
  }

  const results = await Promise.all(queries)
  const profile = results[0].data
  const allModules = results[1].data || []
  const modulePermRes = moduleKey ? results[2] : null
  const contextPermRes = context ? (moduleKey ? results[3] : results[2]) : null

  if (!profile) redirect('/login')

  const isAdminGlobal = profile.role === 'admin'
  const moduleRole = isAdminGlobal ? 'admin' : modulePermRes?.data?.role
  
  // El rol contextual: si es admin global es 'admin', si no, lo que diga su tabla específica
  const contextRole = isAdminGlobal ? 'admin' : contextPermRes?.data?.role

  // 4. Lógica de acceso al módulo (No cambia)
  if (moduleKey && !isAdminGlobal && !moduleRole) {
    redirect(`/?message=No tienes permiso para acceder al módulo: ${moduleKey}`)
  }

  return {
    profile,
    isAdminGlobal,
    moduleRole,    // admin, editor, viewer
    contextRole,   // owner, admin, member, guest, etc (depende de la tabla)
    userRole: profile.role,
    // Helpers de permisos rápidos
    isOwner: contextRole === 'owner' || contextRole === 'admin' || isAdminGlobal,
    canEdit: isAdminGlobal || 
           moduleRole === 'admin' || 
           ['owner', 'admin', 'editor'].includes(contextRole || ''),
      // --- PARCHE DE COMPATIBILIDAD (Para no romper tus páginas viejas) ---
    modulePermission: isAdminGlobal ? 'admin' : modulePermRes?.data?.role, // Nombre antiguo
    accessibleModules: allModules.filter((mod:any) => 
      isAdminGlobal || (results[1].data?.some((p: any) => p.module_key === mod.key))
    ) // Devolvemos la lista filtrada como hacía antes
    // --------------------------------------------------------------------
  }
})


export async function validateModuleAccess(moduleKey: string) {
 /**
 * Valida si el usuario tiene acceso a la consola de administración (Rol 'admin')
 * Se usa principalmente en el layout de /settings
 */
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Si no hay usuario, al login
  if (!user) redirect('/login');

  // 2. Consultar: Estado del módulo, Perfil (Rol Global) y Permisos específicos
  // Tiramos todas las consultas en paralelo para máxima velocidad
  const [moduleRes, profileRes, permissionRes] = await Promise.all([
    supabase.from('app_modules').select('is_active').eq('key', moduleKey).maybeSingle(),
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase.from('app_permissions')
      .select('role')
      .eq('user_id', user.id)
      .eq('module_key', moduleKey)
      .maybeSingle()
  ]);

  // --- COMPROBACIÓN 1: ¿EL MÓDULO EXISTE Y ESTÁ ACTIVO? ---
  // Si el módulo está apagado globalmente, nadie entra (excepto si decides que el admin sí)
  const isModuleActive = moduleRes.data?.is_active ?? false;
  const userRole = profileRes.data?.role || 'user';
  const isAdminGlobal = userRole === 'admin';

  // Lógica: Si el módulo está desactivado Y el usuario no es Admin Global, bloqueamos.
  // (Permitimos que el Admin entre aunque esté OFF para poder probar cosas o reconfigurar)
  if (!isModuleActive && !isAdminGlobal) {
    redirect(`/?message=El módulo ${moduleKey} está temporalmente desactivado.`);
  }

  // --- COMPROBACIÓN 2: ¿TIENE PERMISO EL USUARIO? ---
  const modulePermission = permissionRes.data?.role;
  const hasAccess = isAdminGlobal || !!modulePermission;

  if (!hasAccess) {
    redirect(`/?message=No tienes permiso para acceder al módulo: ${moduleKey}`);
  }

  return {
    user,
    userRole,
    isAdminGlobal,
    modulePermission: isAdminGlobal ? 'admin' : modulePermission,
    isModuleActive
  };
}