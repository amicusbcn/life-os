// utils/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            // 🚨 DEBUG: Vamos a ver si esto se ejecuta al hacer login
            console.log(`🍪 ServerClient intentando escribir ${cookiesToSet.length} cookies...`)
            
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
            console.log("✅ Cookies escritas en el Store correctamente.")
          } catch (error) {
            // 🚨 DEBUG: Si esto sale, es que no podemos escribir cookies
            console.error("❌ ERROR ESCRITURA COOKIES:", error)
          }
        },
      },
    }
  )
}