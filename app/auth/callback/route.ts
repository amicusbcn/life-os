import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // El enlace de correo trae un ?code=...
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // next = a dónde ir después de loguearse (por defecto a /)
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    
    // Intercambiamos el código por una sesión real
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Si todo va bien, redirigimos al usuario dentro de la app
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Si algo falla, lo devolvemos al login con un error
  return NextResponse.redirect(`${origin}/login?error=auth-code-error`)
}