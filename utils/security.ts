// /utils/security.ts
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function validateModuleAccess(moduleKey: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 1. Si no hay usuario, al login
  if (!user) redirect('/login')

  // 2. Consultar perfil (para ver si es Admin Global) y permisos del módulo
  const [profileRes, permissionRes] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase.from('app_permissions')
      .select('role')
      .eq('user_id', user.id)
      .eq('module_key', moduleKey)
      .maybeSingle() // Usamos maybeSingle para que no explote si no hay registro
  ])

  const userRole = profileRes.data?.role || 'user'
  const isAdminGlobal = userRole === 'admin'
  const modulePermission = permissionRes.data?.role // 'viewer', 'editor', 'admin' o undefined

  // 3. Lógica de acceso: Si es Admin Global o tiene permiso específico, adelante
  const hasAccess = isAdminGlobal || !!modulePermission

  if (!hasAccess) {
    redirect(`/?message=No tienes permiso para acceder al módulo: ${moduleKey}`)
  }

  // Devolvemos los datos por si la página los necesita (para ahorrar consultas)
  return {
    user,
    userRole,
    isAdminGlobal,
    modulePermission: isAdminGlobal ? 'admin' : modulePermission,
  }
}