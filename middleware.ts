import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // 1. Inicializar la respuesta (copiamos headers para no perder info)
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
          // Si Supabase necesita actualizar la cookie, lo hacemos en request y response
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

  // 2. Verificar si el usuario existe
  const { data: { user } } = await supabase.auth.getUser()

  // ============================================================
  // 3. LÓGICA DE PROTECCIÓN (El "Portero")
  // ============================================================
  
  // A. Si NO hay usuario logueado Y la ruta NO es '/login'...
  if (!user && !request.nextUrl.pathname.startsWith('/login')) {
    // ...lo mandamos a la página de login.
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // B. Si SÍ hay usuario logueado Y está intentando entrar en '/login'...
  if (user && request.nextUrl.pathname.startsWith('/login')) {
    // ...lo mandamos directo al dashboard (no necesita loguearse otra vez).
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Aplica el middleware a TODAS las rutas EXCEPTO:
     * - /api (rutas de API internas)
     * - /_next/static (archivos estáticos de Next.js)
     * - /_next/image (optimizador de imágenes)
     * - /favicon.ico (icono de la pestaña)
     * Esto evita que el middleware bloquee la carga de estilos o imágenes.
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}