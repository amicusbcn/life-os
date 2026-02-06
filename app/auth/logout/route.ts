import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // 1. Inicializamos el cliente
  const supabase = await createClient()

  // 2. Cerramos sesión (destruye la cookie en el servidor)
  // CheckSession es opcional, signOut funciona igual aunque no haya sesión
  await supabase.auth.signOut()

  // 3. LIMPIEZA DE CACHÉ (CRÍTICO)
  // Esto es vital por los problemas que tuviste antes.
  // Obliga al Layout a volverse a ejecutar (y detectar que ya no hay usuario).
  revalidatePath('/', 'layout')

  // 4. Redirigir al login
  const requestUrl = new URL(request.url)
  return NextResponse.redirect(`${requestUrl.origin}/login`)
}