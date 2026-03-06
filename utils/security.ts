// /utils/security.ts

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { UserProfile, AppModule, AppRole } from '@/types/users'
import { cache } from 'react'
import { is } from 'date-fns/locale';

interface SecurityContext {
  table: string;      // Ej: 'property_members', 'trip_members', 'account_users'
  column: string;     // Ej: 'property_id', 'trip_id', 'account_id'
  id: string;         // El UUID de la entidad
}

/**
 * Obtiene los datos del usuario, permisos de módulo y rol contextual en una entidad.
 * * @param moduleKey - (Opcional) Identificador del módulo (ej: 'maintenance', 'inventory').
 * @param context - (Opcional) Configuración para validar permisos en una entidad específica.
 * * @example
 * // 1. Uso básico (Solo login y perfil)
 * const { profile } = await getAccessControl();
 * * // 2. Uso con módulo (Valida acceso a la App y devuelve permisos)
 * const { profile, security } = await getAccessControl('maintenance');
 * console.log(security.moduleRole); // 'admin' | 'editor' | 'viewer'
 * * // 3. Uso contextual completo (Valida rol en una Propiedad, Cuenta, etc.)
 * const { profile, security } = await getAccessControl('maintenance', {
 * table: 'property_members',
 * column: 'property_id',
 * id: 'uuid-de-la-propiedad'
 * });
 * console.log(profile.context_role); // 'owner', 'member', etc.
 * console.log(security.canEdit);     // true/false
 * * @returns {
 *    profile: Datos del perfil (incluye module_role y context_role),
 *    accessibleModules: Lista de módulos filtrada por permisos y estado activo,
 *    security: {
 *        isGlobalAdmin: boolean,
 *        isModuleAdmin:boolean,
 *        isContextOwner: boolean,
 *        isContextAdmin:boolean,
 *        isContextEditor:boolean,
 *        canEdit: boolean
 *      }
 * *}
 */

interface ModulePermissionJoin {
  role: string;
  module_key: string;
  module: AppModule; // El objeto del módulo
}

export const getAccessControl = cache(async (moduleKey?: string, context?: SecurityContext) => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // 1. CARGAMOS EL PERFIL
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const isGlobalAdmin = profile.role === 'admin'
  
  // 2. Resolvemos los módulos según el tipo de usuario
  let accessibleModules = []
  let currentModuleRole = undefined

  if (isGlobalAdmin) {
    // ADMIN: Consulta directa al catálogo de módulos activos
    const { data } = await supabase.from('app_modules').select('*').eq('is_active', true).order('order')
    accessibleModules = data || []
    currentModuleRole = 'admin' 
    // Si es admin global, su rol en cualquier módulo es admin
  } else {
    const { data } = await supabase
      .from('app_permissions')
      .select(`
        role,
        module_key,
        module:app_modules!inner(*)
      `)
      .eq('user_id', user.id)
      .eq('module.is_active', true);
    const permissions = (data as unknown as ModulePermissionJoin[]) || [];
    accessibleModules = (permissions || []).map(p => ({ ...p.module, user_role: p.role }))
    
    // Buscamos el rol del módulo específico si nos lo han pedido
    if (moduleKey) {
        currentModuleRole = accessibleModules.find(m => m.key === moduleKey)?.user_role
    }
  }

  // 3. Rol Contextual (Propiedad, etc.)
  let contextRole = isGlobalAdmin ? 'admin' : undefined
  if (context && !isGlobalAdmin) {
    const { data } = await supabase.from(context.table).select('role').eq(context.column, context.id).eq('user_id', user.id).maybeSingle()
    contextRole = data?.role
  }

  // 4. Bloqueo de seguridad
  if (moduleKey && !isGlobalAdmin && !currentModuleRole) {
    redirect(`/?message=No tienes acceso al módulo: ${moduleKey}`)
  }
  return {
    profile: { ...profile, module_role: currentModuleRole, context_role: contextRole },
    accessibleModules,
    security: {
      isGlobalAdmin,
      isModuleAdmin: currentModuleRole === 'admin',
      isContextOwner: contextRole === 'owner',
      isContextAdmin: contextRole === 'admin',
      isContextEditor: contextRole === 'editor',
      canEdit: isGlobalAdmin || ['owner', 'admin', 'editor'].includes(contextRole || '')
    }
  }
})



/****************DEPRECATED - BORRAR CUANDO HAYAMOS HECHO LA TRANSICION -------------------*/



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

  // 1. CONSULTAS BASE: Ahora incluimos los permisos generales del usuario
  const queries: any[] = [
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('app_modules').select('*').eq('is_active', true).order('order'),
    supabase.from('app_permissions').select('module_key, role').eq('user_id', user.id) // <--- NUEVA
  ]

  // 2. Permiso de Módulo Específico (Nivel 2) - Si se pide uno concreto
  if (moduleKey) {
    queries.push(
      supabase.from('app_permissions').select('role').eq('user_id', user.id).eq('module_key', moduleKey).maybeSingle()
    )
  }

  // 3. Permiso Contextual (Nivel 3)
  if (context) {
    queries.push(
      supabase.from(context.table).select('role').eq(context.column, context.id).eq('user_id', user.id).maybeSingle()
    )
  }

  const results = await Promise.all(queries)
  
  // MAPEO DE RESULTADOS POR ÍNDICE (Cuidado aquí)
  const profile = results[0].data
  const allModules = results[1].data || []
  const userPermissions = results[2].data || [] // Lista de {module_key, role}
  
  // Los opcionales se desplazan porque añadimos results[2]
  const modulePermRes = moduleKey ? results[3] : null
  const contextPermRes = context ? (moduleKey ? results[4] : results[3]) : null

  if (!profile) redirect('/login')

  const isAdminGlobal = profile.role === 'admin'
  const moduleRole = isAdminGlobal ? 'admin' : modulePermRes?.data?.role
  const contextRole = isAdminGlobal ? 'admin' : contextPermRes?.data?.role

  if (moduleKey && !isAdminGlobal && !moduleRole) {
    redirect(`/?message=No tienes permiso para acceder al módulo: ${moduleKey}`)
  }

  return {
    profile,
    isAdminGlobal,
    moduleRole,
    contextRole,
    userRole: profile.role,
    isOwner: contextRole === 'owner' || contextRole === 'admin' || isAdminGlobal,
    canEdit: isAdminGlobal || 
             moduleRole === 'admin' || 
             ['owner', 'admin', 'editor'].includes(contextRole || ''),
    
    // --- FILTRADO CORREGIDO ---
    accessibleModules: allModules.filter((mod: any) => 
      isAdminGlobal || userPermissions.some((p: any) => p.module_key === mod.key)
    )
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