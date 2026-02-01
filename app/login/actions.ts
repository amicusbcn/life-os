'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin' // <--- Necesario para generar links
import { sendEmail } from '@/utils/mail' // <--- Tu cartero
import { ResetPasswordEmail } from '@/components/emails/ResetPassword' // <--- Tu template

// --- LOGIN (Sin cambios, no envía emails) ---
export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    // Es buena práctica no especificar si falla user o pass por seguridad, pero para UX ayuda.
    return redirect('/login?message=Credenciales incorrectas.')
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

// --- SIGNUP (Registro) ---
export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
        // Si quieres que el usuario confirme email, deja esto vacío.
        // Si Supabase tiene "Confirm Email" activado, enviará su propio correo
        // (es difícil interceptar ese correo específico sin desactivar la opción en Supabase).
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
    }
  })

  if (error) {
    return redirect('/login?message=Error al registrarse: ' + error.message)
  }

  // Si no requiere confirmación, entra directo. Si requiere, le avisa.
  revalidatePath('/', 'layout')
  redirect('/login?message=Revisa tu correo para confirmar tu cuenta.')
}

// --- LOGOUT (Sin cambios) ---
export async function logout() {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error('Error logging out:', error)
  }

  // Importante: redirigir a login tras salir
  redirect('/login')
}

// --- FORGOT PASSWORD (INTEGRACIÓN COMPLETA) ---
export async function forgotPassword(formData: FormData) {
  // 1. Necesitamos permisos de Admin para generar el link manualmente
  const supabaseAdmin = await createAdminClient()
  
  const email = formData.get('email') as string
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  // 2. Generamos el link de recuperación (recovery)
  // Apuntamos a nuestra página mágica /update-password
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email: email,
    options: {
      redirectTo: `${baseUrl}/update-password`,
    },
  })

  // Si el usuario no existe o hay error, lo manejamos
  if (linkError || !linkData.properties?.action_link) {
    console.error('Error generating reset link:', linkError)
    // Por seguridad, a veces se recomienda decir "Si el correo existe, se ha enviado..." 
    // para no revelar qué emails están registrados.
    return { error: 'No se pudo procesar la solicitud.' }
  }

  const recoveryUrl = linkData.properties.action_link

  // 3. Enviamos el correo con tu utilidad y template
  const emailResult = await sendEmail({
    to: email,
    subject: 'Restablecer Contraseña - Life-OS',
    html: ResetPasswordEmail(recoveryUrl) // <--- Usamos tu template bonito
  })

  if (!emailResult.success) {
    return { error: 'Fallo al enviar el correo de recuperación.' }
  }

  return { success: true, message: 'Revisa tu email para restablecer la contraseña.' }
}