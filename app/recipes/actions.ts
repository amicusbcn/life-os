// app/recipes/actions.ts
'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { ActionResponse } from '@/types/common'
import { Recipe } from '@/types/recipes'

/**
 * Crea una nueva receta en la base de datos.
 * Maneja la subida de imagen y la asignación de categorías.
 * * @param formData - Datos del formulario (incluye archivo 'photo', 'name', 'ingredients', etc.)
 * @returns {Promise<ActionResponse<{ id: string }>>} ID de la receta creada si hubo éxito.
 */
export async function createRecipe(formData: FormData): Promise<ActionResponse<{ id: string }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: "Usuario no autenticado" }

  try {
    // 1. Gestión de Imagen
    const photoFile = formData.get('photo') as File | null
    let photoPath = null

    if (photoFile && photoFile.size > 0) {
      const fileName = `${user.id}/${Date.now()}-${photoFile.name.replace(/\s/g, '_')}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('recipes')
        .upload(fileName, photoFile)

      if (uploadError) throw new Error('Error al subir la imagen: ' + uploadError.message)
      photoPath = uploadData.path
    }

    // 2. Preparación de datos
    const payload = {
      user_id: user.id,
      name: formData.get('name') as string,
      ingredients: formData.get('ingredients') as string,
      instructions: formData.get('instructions') as string,
      prep_time: parseInt(formData.get('prep_time') as string) || 0,
      servings: parseInt(formData.get('servings') as string) || 1,
      category_id: formData.get('category_id') === "no-category" ? null : formData.get('category_id'),
      photo_path: photoPath,
      source_url: formData.get('source_url') as string || null,
    }

    // 3. Inserción
    const { data, error } = await supabase
      .from('menu_recipes')
      .insert(payload)
      .select('id')
      .single()

    if (error) throw error

    revalidatePath('/recipes')
    return { success: true, data: { id: data.id } }

  } catch (error: any) {
    console.error('[CreateRecipe Error]:', error)
    return { success: false, error: error.message || 'Error al crear la receta' }
  }
}

/**
 * Actualiza una receta existente.
 * Si se sube una nueva foto, reemplaza la anterior en el Storage.
 * * @param formData - Datos actualizados del formulario.
 */
export async function updateRecipe(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient()
  const recipeId = formData.get('id') as string
  const oldPhotoPath = formData.get('old_photo_path') as string
  
  try {
    // 1. Gestión de nueva foto (si existe)
    const photoFile = formData.get('photo') as File | null
    let newPhotoPath = oldPhotoPath

    if (photoFile && photoFile.size > 0) {
      const fileName = `${Date.now()}-${photoFile.name.replace(/\s/g, '_')}`
      const { data, error: uploadError } = await supabase.storage
        .from('recipes')
        .upload(fileName, photoFile)
      
      if (uploadError) throw new Error('Error subiendo nueva imagen')
      
      newPhotoPath = data.path

      // Limpieza: Borrar foto antigua para no acumular basura
      if (oldPhotoPath) {
        await supabase.storage.from('recipes').remove([oldPhotoPath])
      }
    }

    // 2. Actualización
    const { error } = await supabase
      .from('menu_recipes')
      .update({
        name: formData.get('name') as string,
        ingredients: formData.get('ingredients') as string,
        instructions: formData.get('instructions') as string,
        prep_time: parseInt(formData.get('prep_time') as string) || 0,
        servings: parseInt(formData.get('servings') as string) || 1,
        category_id: formData.get('category_id') === "no-category" ? null : formData.get('category_id'),
        photo_path: newPhotoPath,
        source_url: formData.get('source_url') as string || null,
      })
      .eq('id', recipeId)

    if (error) throw error

    revalidatePath(`/recipes/${formData.get('slug')}/${recipeId}`)
    revalidatePath('/recipes')
    return { success: true }

  } catch (e: any) {
    return { success: false, error: e.message || "Error al actualizar receta" }
  }
}

/**
 * Elimina una receta y sus recursos asociados.
 * @param formData - FormData conteniendo 'id' y opcionalmente 'categorySlug' para redirección
 */
export async function deleteRecipe(formData: FormData): Promise<void> {
  const supabase = await createClient()
  
  const id = formData.get('id') as string;
  const categorySlug = formData.get('categorySlug') as string || 'all';
  
  // Opcional: Podríamos pasar photoPath en hidden input si queremos borrar la foto explícitamente,
  // o consultar la BBDD antes de borrar para obtener el path.
  // Por simplicidad y robustez, consultamos primero para obtener el path de la foto.
  
  if (!id) throw new Error("ID de receta obligatorio");

  try {
      // 1. Obtener path de la foto antes de borrar el registro
      const { data: recipe } = await supabase
        .from('menu_recipes')
        .select('photo_path')
        .eq('id', id)
        .single();

      if (recipe?.photo_path) {
        await supabase.storage.from('recipes').remove([recipe.photo_path])
      }

      // 2. Borrar registro
      const { error } = await supabase.from('menu_recipes').delete().eq('id', id)

      if (error) {
        console.error("Error eliminando receta:", error)
        throw new Error(error.message)
      }
  } catch (e) {
      console.error("Error en deleteRecipe:", e);
      // En Server Actions invocados por form, a veces es mejor no hacer nada si falla para no romper la UI, 
      // o redirigir a página de error.
  }

  // 3. Revalidar y Redirigir
  revalidatePath('/recipes')
  redirect(`/recipes/${categorySlug}`)
}

// --- GESTIÓN DE CATEGORÍAS DE RECETAS ---

/**
 * Crea una nueva categoría para organizar recetas.
 */
export async function createRecipeCategory(name: string, color: string, icon: string): Promise<ActionResponse> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!name) return { success: false, error: "El nombre es obligatorio" }

    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '')

    const { error } = await supabase
        .from('menu_recipe_categories')
        .insert({
            user_id: user?.id,
            name,
            color,
            icon,
            slug
        })

    if (error) return { success: false, error: error.message }
    
    revalidatePath('/recipes')
    return { success: true }
}

/**
 * Elimina una categoría de recetas.
 * Nota: Fallará si hay recetas vinculadas (Foreign Key Constraint), lo cual es el comportamiento deseado.
 */
export async function deleteRecipeCategory(id: string): Promise<ActionResponse> {
    const supabase = await createClient()
    const { error } = await supabase.from('menu_recipe_categories').delete().eq('id', id)
    
    if (error) {
        if (error.code === '23503') return { success: false, error: "No puedes borrar una categoría que tiene recetas." }
        return { success: false, error: error.message }
    }
    
    revalidatePath('/recipes')
    return { success: true }
}