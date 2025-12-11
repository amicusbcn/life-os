'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// --- 1. TIPO ESTÁNDAR DE RESPUESTA ---
// Esto soluciona el error: "Property 'error' does not exist"
export type ActionResponse = 
  | { success: true; error?: never }
  | { success: false; error: string }

// --- 2. CREAR ITEM (Refactorizado y Robusto) ---
export async function createInventoryItem(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient()

  // Verificación de Auth (Opcional pero recomendada)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: "Usuario no autenticado" }

  try {
    // A. Gestión de FOTO
    const photoFile = formData.get('photo') as File | null
    let photoPath = null

    if (photoFile && photoFile.size > 0) {
      // Nombre único: user_id/timestamp-nombre
      const fileName = `${user.id}/${Date.now()}-${photoFile.name.replace(/\s/g, '_')}`
      
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('inventory') // Usamos tu bucket 'inventory'
        .upload(fileName, photoFile)

      if (uploadError) {
        console.error('Error subiendo imagen:', uploadError)
        return { success: false, error: 'No se pudo subir la imagen' }
      }
      photoPath = uploadData.path
    }

    // B. Parseo de Datos
    const priceRaw = formData.get('price') as string
    const price = priceRaw ? parseFloat(priceRaw) : null
    
    // Fechas: convertir '' a null
    const purchaseDate = (formData.get('purchase_date') as string) || null
    const warrantyDate = (formData.get('warranty_end_date') as string) || null
    
    // Relaciones: convertir "no-category"/"no-location" a null
    const catRaw = formData.get('category_id') as string
    const categoryId = (catRaw && catRaw !== "no-category") ? catRaw : null
    
    const locRaw = formData.get('location_id') as string
    const locationId = (locRaw && locRaw !== "no-location") ? locRaw : null

    // JSON Enlaces
    const linksJson = formData.get('external_links_json') as string | null
    let parsedLinks = []
    if (linksJson) {
        try {
          parsedLinks = JSON.parse(linksJson)
        } catch (e) {
          console.error("Error JSON links:", e)
        }
    }  

    // C. Insertar
    const { error } = await supabase.from('inventory_items').insert({
      user_id: user.id, // Aseguramos ownership explícito
      name: formData.get('name') as string,
      model: (formData.get('model') as string) || null,
      serial_number: (formData.get('serial_number') as string) || null,
      price: price,
      purchase_date: purchaseDate,
      warranty_end_date: warrantyDate,
      category_id: categoryId,
      location_id: locationId,
      external_links: parsedLinks,
      photo_path: photoPath,
    })

    if (error) {
      console.error('Error DB:', error)
      return { success: false, error: error.message }
    }

  } catch (error) {
    console.error("Error interno createInventoryItem:", error)
    return { success: false, error: "Error inesperado al crear el item" }
  }

  revalidatePath('/inventory')
  return { success: true }
}

// --- 3. ACTUALIZAR ITEM ---
export async function updateInventoryItem(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient()
  
  const itemId = formData.get('item_id') as string
  const oldPhotoPath = formData.get('old_photo_path') as string
  
  try {
    // Gestión de nueva foto
    const photoFile = formData.get('photo') as File
    let newPhotoPath = oldPhotoPath 

    if (photoFile && photoFile.size > 0) {
      const fileName = `${Date.now()}-${photoFile.name.replace(/\s/g, '_')}`
      const { data, error: uploadError } = await supabase.storage
        .from('inventory')
        .upload(fileName, photoFile)
      
      if (uploadError) return { success: false, error: 'Error subiendo nueva imagen' }
      
      newPhotoPath = data.path

      // Borrar vieja
      if (oldPhotoPath) {
        await supabase.storage.from('inventory').remove([oldPhotoPath])
      }
    }

    // Preparar datos (Reutilizando lógica de limpieza)
    const price = formData.get('price') ? parseFloat(formData.get('price') as string) : null
    const purchaseDate = (formData.get('purchase_date') as string) || null
    const warrantyDate = (formData.get('warranty_end_date') as string) || null
    
    const catRaw = formData.get('category_id') as string
    const categoryId = (catRaw && catRaw !== "no-category") ? catRaw : null
    
    const locRaw = formData.get('location_id') as string
    const locationId = (locRaw && locRaw !== "no-location") ? locRaw : null

    const { error } = await supabase
      .from('inventory_items')
      .update({
        name: formData.get('name') as string,
        model: (formData.get('model') as string) || null,
        serial_number: (formData.get('serial_number') as string) || null,
        price: price,
        purchase_date: purchaseDate,
        warranty_end_date: warrantyDate,
        category_id: categoryId,
        location_id: locationId,
        photo_path: newPhotoPath
      })
      .eq('id', itemId)

    if (error) return { success: false, error: error.message }

  } catch (e) {
    return { success: false, error: "Error al actualizar item" }
  }

  revalidatePath(`/inventory/${itemId}`)
  revalidatePath('/inventory')
  return { success: true }
}

// --- 4. BORRAR ITEM ---
export async function deleteInventoryItem(itemId: string, photoPath: string | null) {
  const supabase = await createClient()

  if (photoPath) {
    await supabase.storage.from('inventory').remove([photoPath])
  }

  const { error } = await supabase.from('inventory_items').delete().eq('id', itemId)

  if (error) {
    return { success: false, error: error.message }
  }

  redirect('/inventory')
  // Nota: redirect lanza un error interno de Next.js, por eso no devolvemos ActionResponse aquí.
}

// --- 5. MANTENIMIENTO ---
export async function createMaintenanceTask(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient()

  const itemId = formData.get('item_id') as string
  const responsibleId = formData.get('responsible_user_id') as string
  
  // Procesar numéricos y nulos
  const periodicity = formData.get('periodicity_days') 
    ? parseInt(formData.get('periodicity_days') as string) 
    : null
  
  const cost = formData.get('cost') 
    ? parseFloat(formData.get('cost') as string) 
    : null

  const { error } = await supabase
    .from('inventory_maintenance_tasks')
    .insert({
      item_id: itemId,
      description: formData.get('description') as string, // Título corto (ej: Revisión anual)
      notes: formData.get('notes') as string,             // Detalle largo (opcional)
      cost: cost,                                         // Coste (opcional)
      last_maintenance_date: (formData.get('date') as string) || null,
      periodicity_days: periodicity,
      responsible_user_id: responsibleId !== "no-user" ? responsibleId : null
    })

  if (error) {
    console.error('Error maintenance:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/inventory/${itemId}`)
  return { success: true }
}

// --- MANTENIMIENTO: ACTUALIZAR Y BORRAR ---

export async function updateMaintenanceTask(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient()

  const id = formData.get('id') as string
  const itemId = formData.get('item_id') as string // Necesario para revalidatePath
  const responsibleId = formData.get('responsible_user_id') as string

  // Procesar numéricos
  const periodicity = formData.get('periodicity_days') 
    ? parseInt(formData.get('periodicity_days') as string) 
    : null
  
  const cost = formData.get('cost') 
    ? parseFloat(formData.get('cost') as string) 
    : null

  const { error } = await supabase
    .from('inventory_maintenance_tasks')
    .update({
      description: formData.get('description') as string,
      notes: formData.get('notes') as string,
      cost: cost,
      last_maintenance_date: (formData.get('date') as string) || null,
      periodicity_days: periodicity,
      responsible_user_id: responsibleId !== "no-user" ? responsibleId : null
    })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/inventory/${itemId}`)
  return { success: true }
}

export async function deleteMaintenanceTask(taskId: string, itemId: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('inventory_maintenance_tasks')
    .delete()
    .eq('id', taskId)

  if (error) {
     console.error(error)
     // Nota: En acciones de borrado directo a veces es más simple no devolver objeto si usas toast, 
     // pero para mantener coherencia podrías devolver ActionResponse. 
     // Aquí lo dejaremos simple.
  }

  revalidatePath(`/inventory/${itemId}`)
}

// --- 6. PRÉSTAMOS ---
export async function createInventoryLoan(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient()

  const itemId = formData.get('item_id') as string

  const { error } = await supabase
    .from('inventory_loans')
    .insert({
      item_id: itemId,
      borrower_name: formData.get('borrower_name') as string,
      loan_date: (formData.get('loan_date') as string) || new Date().toISOString(),
      notes: formData.get('notes') as string
    })

  if (error) return { success: false, error: error.message }
  
  revalidatePath(`/inventory/${itemId}`)
  return { success: true }
}

export async function returnInventoryLoan(loanId: string, itemId: string): Promise<ActionResponse> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('inventory_loans')
    .update({ return_date: new Date().toISOString() })
    .eq('id', loanId)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/inventory/${itemId}`)
  return { success: true }
}

// --- 7. CONFIGURACIÓN (Categorías y Ubicaciones) ---

// Categorías
export async function createCategory(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient()
  const name = formData.get('name') as string
  // Recuperamos el icono, o ponemos uno por defecto
  const icon = (formData.get('icon') as string) || '📦' 
  
  if (!name) return { success: false, error: "Nombre obligatorio" }

  // Añadimos 'icon' al insert
  const { error } = await supabase
    .from('inventory_categories')
    .insert({ name, icon }) 

  if (error) return { success: false, error: error.message }
  
  revalidatePath('/inventory')
  return { success: true }
}

export async function deleteCategory(id: string): Promise<ActionResponse> {
  const supabase = await createClient()
  const { error } = await supabase.from('inventory_categories').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/inventory')
  return { success: true }
}

export async function updateCategory(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient()
  const id = formData.get('id') as string
  const name = formData.get('name') as string
  const icon = formData.get('icon') as string

  if (!id || !name) return { success: false, error: "Datos incompletos" }

  const { error } = await supabase
    .from('inventory_categories')
    .update({ name, icon })
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  
  revalidatePath('/inventory')
  return { success: true }
}

// Ubicaciones
export async function createLocation(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient()
  const name = formData.get('name') as string
  const parentId = formData.get('parent_id') as string

  if (!name) return { success: false, error: "Nombre obligatorio" }

  const finalParentId = (parentId && parentId !== "no-parent") ? parentId : null

  const { error } = await supabase
    .from('inventory_locations')
    .insert({ name, parent_id: finalParentId })

  if (error) return { success: false, error: error.message }
  
  revalidatePath('/inventory')
  return { success: true }
}

export async function deleteLocation(id: string): Promise<ActionResponse> {
  const supabase = await createClient()
  const { error } = await supabase.from('inventory_locations').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/inventory')
  return { success: true }
}

export async function updateLocation(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient()
  const id = formData.get('id') as string
  const name = formData.get('name') as string
  
  if (!id || !name) return { success: false, error: "Datos incompletos" }

  const { error } = await supabase
    .from('inventory_locations')
    .update({ name })
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  
  revalidatePath('/inventory')
  return { success: true }
}