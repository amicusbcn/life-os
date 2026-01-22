'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  // Recogemos los datos del formulario
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  // Preguntamos a Supabase
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return redirect('/login?message=No se pudo iniciar sesión. Revisa tus datos.')
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  
  // Como pedimos nombre en el perfil, lo pasamos como metadata
  // Ojo: Esto es básico, luego podemos mejorar el perfil
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
        // Esto evita que te pida confirmar email (opcional en desarrollo)
        // Si en Supabase tienes activado "Confirm Email", te llegará un correo.
    }
  })

  if (error) {
    return redirect('/login?message=Error al registrarse')
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function logout() {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error('Error logging out:', error)
    return redirect('/login?message=No se pudo cerrar la sesión.')
  }

  redirect('/login')
}

export async function forgotPassword(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    // ⚠️ AQUÍ ESTÁ LA MAGIA: Forzamos ir al callback y luego a cambiar password
    redirectTo: `${siteUrl}/auth/callback?next=/update-password`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true, message: 'Revisa tu email para restablecer la contraseña.' }
}