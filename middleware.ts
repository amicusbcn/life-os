import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // 1. Inicializar la respuesta (para gestión de cookies de sesión)
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // 2. Verificar usuario
  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname
  
  //si es una url que empieza por /public, dejamos pasar

  if (path.startsWith('/shared')) {
    return response
  }

  // ============================================================
  // 3. LÓGICA DE AUTENTICACIÓN (El "Portero" Básico)
  // ============================================================
  
  // A. Si NO hay usuario y no es login/auth, fuera.
if (!user) {
    // Definimos las rutas que SÍ se pueden visitar sin login
    const isPublicRoute = 
        path.startsWith('/login') || 
        path.startsWith('/auth') || 
        path.startsWith('/settings/profile/update-password'); // <--- ¡AQUÍ ESTÁ LA CLAVE! 🔑

    // Si no es una ruta pública, redirigir al login
    if (!isPublicRoute) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }
  }
  // B. Si SÍ hay usuario y quiere ir a login, pa' dentro.
  if (user && path.startsWith('/login')) {
    const url = request.nextUrl.clone()
    // IMPORTANTE: Redirigimos a la raíz, y el paso 4 decidirá dónde va según el modo.
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // ============================================================
  // 4. LÓGICA DE MODO DE APLICACIÓN (El "Arquitecto")
  // ============================================================

  const appMode = process.env.NEXT_PUBLIC_APP_MODE || 'full_suite'

  // MODO FAMILIA (Restringido)
  if (user && appMode === 'family_finance_only') {
    
    // DEFINIR ZONA PERMITIDA (Whitelist)
    // Solo pueden entrar aquí. Todo lo demás será rebotado.
    const allowedPrefixes = [
      '/finance-shared', // El módulo nuevo
      '/account',        // Perfil de usuario (si tienes)
      '/api',           // Necesario para llamadas internas
    ]

    const isAllowed = allowedPrefixes.some(prefix => path.startsWith(prefix))

    // CASO 1: Acceso a la Raíz ('/') -> Redirigir al Dashboard de Finanzas
    if (path === '/') {
      const url = request.nextUrl.clone()
      url.pathname = '/finance-shared'
      return NextResponse.redirect(url)
    }

    // CASO 2: Intentar entrar a zona prohibida (ej: /inventory) -> Redirigir a Finanzas
    if (!isAllowed) {
      const url = request.nextUrl.clone()
      url.pathname = '/finance-shared'
      return NextResponse.redirect(url)
    }
  }

  // MODO FULL SUITE (Tu Life-OS completo)
  // Aquí no ponemos restricciones, eres el admin supremo.
  
  return response
}

export const config = {
  matcher: [
    /*
     * Excluir estáticos y API interna de Next para no romper la hidratación
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}