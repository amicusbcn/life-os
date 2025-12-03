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