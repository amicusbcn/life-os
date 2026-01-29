// /utils/security.ts
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { UserProfile, AppModule, AppRole } from '@/types/users'

export async function getUserData(moduleKey?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // 1. Consultas base
  const queries: any[] = [
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('app_permissions').select('module_key').eq('user_id', user.id),
    supabase
      .from('app_modules')
      .select('id, key, name, description, icon, is_active, order, folder')
      .eq('is_active', true)
      .order('folder')
      .order('order')
  ]

  // 2. Si hay moduleKey, añadimos la consulta de permiso específico
  if (moduleKey) {
    queries.push(
      supabase
        .from('app_permissions')
        .select('role')
        .eq('user_id', user.id)
        .eq('module_key', moduleKey)
        .maybeSingle()
    )
  }

  const results = await Promise.all(queries)
  const profileRes = results[0]
  const permissionsRes = results[1]
  const modulesRes = results[2]
  const specificPermRes = moduleKey ? results[3] : null

  const profile = profileRes.data as UserProfile
  if (!profile) redirect('/login')

  const userRole = profile.role || 'user'
  const isAdminGlobal = userRole === 'admin'
  const userPermissions = permissionsRes.data?.map((p: any) => p.module_key) || []
  const allModules = (modulesRes.data || []) as AppModule[]

  // 3. Permiso específico del módulo
  // Si es admin global, su rol en el módulo es 'admin'. Si no, lo que diga la tabla.
  let modulePermission: AppRole | undefined = isAdminGlobal ? 'admin' : undefined
  if (!isAdminGlobal && specificPermRes?.data) {
    modulePermission = specificPermRes.data.role as AppRole
  }

  // 4. Lógica de acceso: Si no es admin y no tiene permiso, fuera
  if (moduleKey && !isAdminGlobal && !modulePermission) {
    redirect(`/?message=No tienes permiso para acceder al módulo: ${moduleKey}`)
  }

  // Filtrado de módulos para el AppSelector
  const accessibleModules = allModules.filter(mod => 
    isAdminGlobal || userPermissions.includes(mod.key)
  )

  return {
    profile,
    accessibleModules,
    userRole,
    isAdminGlobal,
    modulePermission // 'admin', 'editor', 'viewer' o undefined
  }
}

/**
 * Valida si el usuario tiene acceso a la consola de administración (Rol 'admin')
 * Se usa principalmente en el layout de /settings
 */
export async function validateModuleAccess(moduleKey: string) {
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