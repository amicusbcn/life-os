'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { ActionResponse } from '@/types/common'
/**
 * Acción para actualizar el perfil del usuario.
 * Se ejecuta en el servidor.
 */
export async function updateProfile(formData: FormData) {
  const supabase = await createClient();

  // 1. Obtener el usuario autenticado
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Usuario no autenticado.");
  }

  // A. Gestión de la subida del avatar (similar a inventory)
  const avatarFile = formData.get('avatar') as File;
  const oldAvatarPath = formData.get('old_avatar_path') as string;
  let newAvatarPath = oldAvatarPath;

  if (avatarFile && avatarFile.size > 0) {
    const fileName = `${user.id}-${Date.now()}`;
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('avatars') // Asumimos un bucket 'avatars'. ¡Asegúrate de crearlo!
      .upload(fileName, avatarFile);

    if (uploadError) {
      console.error('Supabase Storage Error:', uploadError); // Logueamos el error detallado
      throw new Error('No se pudo subir la nueva imagen de perfil.');
    }
    newAvatarPath = uploadData.path;

    // Si había una foto antigua, la borramos
    if (oldAvatarPath) {
      await supabase.storage.from('avatars').remove([oldAvatarPath]);
    }
  }

  // 2. Validar los datos del formulario (manualmente)
  const fullName = formData.get("full_name") as string;
  const bio = formData.get("bio") as string;

  if (!fullName || fullName.trim().length < 3) {
    throw new Error("El nombre debe tener al menos 3 caracteres.");
  }

  // 3. Actualizar el perfil en Supabase
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      bio: bio,
      avatar_url: newAvatarPath, // Guardamos la ruta del nuevo avatar
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    console.error("Error updating profile:", error);
    throw new Error("No se pudo actualizar el perfil.");
  }

  // 4. Revalidar la ruta para que los cambios se reflejen
  revalidatePath("/profile");

  return { success: true, message: "¡Perfil actualizado con éxito!" };
}

/**
 * Acción para solicitar el cambio de contraseña.
 * Envía un email al usuario con un enlace para resetearla.
 */
export async function requestPasswordChange(email: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/login?message=Contraseña actualizada. Por favor, inicia sesión de nuevo.`,
  });

  if (error) {
    throw new Error("No se pudo enviar el email para cambiar la contraseña.");
  }

  return { success: true, message: "Se ha enviado un email con las instrucciones." };
}
export async function updatePassword(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient()
  
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  // 1. Validaciones básicas
  if (!password || password.length < 6) {
    return { success: false, error: 'La contraseña debe tener al menos 6 caracteres.' }
  }
  
  if (password !== confirmPassword) {
    return { success: false, error: 'Las contraseñas no coinciden.' }
  }

  // 2. Actualizar usuario (Al estar logueado por el link, esto funciona sobre sí mismo)
  const { error } = await supabase.auth.updateUser({ 
    password: password 
  })

  if (error) {
    console.error('Error updating password:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/')
  return { success: true, message: 'Contraseña actualizada correctamente.' }
}