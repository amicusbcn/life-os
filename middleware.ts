import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // 1. Inicializar la respuesta base
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 2. Cliente Supabase (CON LA API NUEVA getAll/setAll)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // A. Actualizar cookies en la petición actual (para que la lógica de abajo las vea)
          cookiesToSet.forEach(({ name, value }) => 
            request.cookies.set(name, value)
          )
          
          // B. Recrear la respuesta para asegurar que lleva las cookies actualizadas
          response = NextResponse.next({
            request,
          })
          
          // C. Escribir cookies en la respuesta final (para el navegador)
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 3. REFRESCAR SESIÓN (Crucial: esto activa el setAll de arriba si el token caducó)
  const { data: { user } } = await supabase.auth.getUser()

  // ============================================================
  // A PARTIR DE AQUÍ, TU LÓGICA DE NEGOCIO ORIGINAL (INTACTA)
  // ============================================================

  const path = request.nextUrl.pathname
  
  if (path.startsWith('/shared')) {
    return response
  }

  // A. Si NO hay usuario y no es login/auth, fuera.
  if (!user) {
    const isPublicRoute = 
      path.startsWith('/login') || 
      path.startsWith('/auth') || 
      path === '/update-password' || path.startsWith('/update-password') ||
      path.startsWith('/settings/users/impersonate');

    if (!isPublicRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  // B. Si SÍ hay usuario y quiere ir a login, pa' dentro.
  if (user && path.startsWith('/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // ============================================================
  // 4. LÓGICA DE MODO DE APLICACIÓN
  // ============================================================

  const appMode = process.env.NEXT_PUBLIC_APP_MODE || 'full_suite'

    return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}