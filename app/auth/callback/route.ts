import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  // "next" es a donde queremos ir (/settings/profile/update-password)
  const next = requestUrl.searchParams.get('next')

  if (code) {
    const supabase = await createClient()

    // Canjeamos el código por sesión
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // TRUCO PARA DOMINIOS (jact.es):
      // Si estamos detrás de un proxy (Vercel, etc), usamos la cabecera real
      const forwardedHost = request.headers.get('x-forwarded-host') 
      const isLocal = process.env.NODE_ENV === 'development'
      
      // Si es local usa origin, si es pro usa el host real
      const baseUrl = isLocal 
        ? requestUrl.origin 
        : `https://${forwardedHost || requestUrl.host}`

      const nextPath = next || '/'
      
      // Redirigimos limpios
      return NextResponse.redirect(`${baseUrl}${nextPath}`)
    }
  }

  // Si falla, volvemos al login
  return NextResponse.redirect(`${requestUrl.origin}/login?error=auth-code-error`)
}