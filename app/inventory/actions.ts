'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createInventoryItem(formData: FormData) {
  const supabase = await createClient()

  // 1. Gestionar la subida de la imagen (si existe)
  const photoFile = formData.get('photo') as File
  let photoPath = null

  if (photoFile && photoFile.size > 0) {
    // Generamos un nombre único para evitar colisiones: timestamp-nombre
    const fileName = `${Date.now()}-${photoFile.name.replace(/\s/g, '_')}`
    
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('inventory') // Asegúrate de que este bucket exista en Supabase
      .upload(fileName, photoFile)

    if (uploadError) {
      console.error('Error subiendo imagen:', uploadError)
      throw new Error('No se pudo subir la imagen')
    }

    photoPath = uploadData.path
  }

  // 2. Preparar los datos para insertar
  // Convertimos strings vacíos a null para que Postgres no se queje en campos numéricos/fecha
  const price = formData.get('price') ? parseFloat(formData.get('price') as string) : null
  const purchaseDate = formData.get('purchase_date') ? formData.get('purchase_date') as string : null
  const warrantyDate = formData.get('warranty_end_date') ? formData.get('warranty_end_date') as string : null
  const categoryId = formData.get('category_id') !== "no-category" ? formData.get('category_id') : null
  const locationId = formData.get('location_id') !== "no-location" ? formData.get('location_id') : null
  const linksJson = formData.get('external_links_json') as string | null
  let parsedLinks = []
  if (linksJson) {
      try {
          // Intentamos parsear la cadena JSON que viene del formulario
          parsedLinks = JSON.parse(linksJson)
          // Filtramos cualquier objeto que haya quedado vacío o incompleto en el cliente
          parsedLinks = parsedLinks.filter((l: any) => l.title?.trim() && l.url?.trim())
      } catch (e) {
          console.error("Error al parsear enlaces JSON:", e)
      }
  }  
  // 3. Insertar en la base de datos
  const { error } = await supabase.from('inventory_items').insert({
    name: formData.get('name') as string,
    model: formData.get('model') as string,
    serial_number: formData.get('serial_number') as string,
    price: price,
    purchase_date: purchaseDate,
    warranty_end_date: warrantyDate,
    category_id: categoryId as string,
    location_id: locationId as string,
    external_links: parsedLinks,
    photo_path: photoPath,
    // Asumimos el usuario actual por defecto en la BBDD o Supabase lo inyecta si usas RLS con default auth.uid()
  })

  if (error) {
    console.error('Error creando item:', error)
    throw new Error('Error al guardar en la base de datos')
  }

  // 4. Refrescar la página para ver el nuevo item
  revalidatePath('/inventory')
  
  // Opcional: devolver éxito
  return { success: true }
}

export async function createMaintenanceTask(formData: FormData) {
  const supabase = await createClient()

  const itemId = formData.get('item_id') as string
  const description = formData.get('description') as string
  const date = formData.get('date') as string
  const responsibleId = formData.get('responsible_user_id') as string
  
  // Si no pone días, lo dejamos en null
  const periodicity = formData.get('periodicity_days') 
    ? parseInt(formData.get('periodicity_days') as string) 
    : null

  const { error } = await supabase
    .from('inventory_maintenance_tasks')
    .insert({
      item_id: itemId,
      description: description,
      last_maintenance_date: date,
      periodicity_days: periodicity,
      responsible_user_id: responsibleId !== "no-user" ? responsibleId : null
    })

  if (error) {
    console.error('Error maintenance:', error)
    throw new Error('Error al guardar mantenimiento')
  }

  revalidatePath(`/inventory/${itemId}`)
  return { success: true }
}

// 1. CREAR PRÉSTAMO
export async function createInventoryLoan(formData: FormData) {
  const supabase = await createClient()

  const itemId = formData.get('item_id') as string
  const borrower = formData.get('borrower_name') as string
  const notes = formData.get('notes') as string
  const date = formData.get('loan_date') as string

  const { error } = await supabase
    .from('inventory_loans')
    .insert({
      item_id: itemId,
      borrower_name: borrower,
      loan_date: date,
      notes: notes
    })

  if (error) return { success: false, error: error.message }
  
  revalidatePath(`/inventory/${itemId}`)
  return { success: true }
}

// 2. MARCAR COMO DEVUELTO
export async function returnInventoryLoan(loanId: string, itemId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('inventory_loans')
    .update({ return_date: new Date().toISOString() }) // Fecha de hoy
    .eq('id', loanId)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/inventory/${itemId}`)
  return { success: true }
}

export async function deleteInventoryItem(itemId: string, photoPath: string | null) {
  const supabase = await createClient()

  // A. Si tiene foto, la borramos del Storage primero para no dejar basura
  if (photoPath) {
    await supabase.storage.from('inventory').remove([photoPath])
  }

  // B. Borramos el registro (Por "Cascade", se borrarán también mantenimientos y préstamos)
  const { error } = await supabase.from('inventory_items').delete().eq('id', itemId)

  if (error) {
    return { success: false, error: error.message }
  }

  // C. Redirigimos a la lista principal
  redirect('/inventory')
}

// 2. ACTUALIZAR ITEM
export async function updateInventoryItem(formData: FormData) {
  const supabase = await createClient()
  
  const itemId = formData.get('item_id') as string
  const oldPhotoPath = formData.get('old_photo_path') as string
  
  // Gestión de nueva foto
  const photoFile = formData.get('photo') as File
  let newPhotoPath = oldPhotoPath // Por defecto mantenemos la vieja

  if (photoFile && photoFile.size > 0) {
    // 1. Subir nueva
    const fileName = `${Date.now()}-${photoFile.name.replace(/\s/g, '_')}`
    const { data, error: uploadError } = await supabase.storage
      .from('inventory')
      .upload(fileName, photoFile)
    
    if (uploadError) throw new Error('Error subiendo nueva imagen')
    
    newPhotoPath = data.path

    // 2. Borrar vieja (si existía y es diferente)
    if (oldPhotoPath) {
      await supabase.storage.from('inventory').remove([oldPhotoPath])
    }
  }

  // Preparar datos
  const price = formData.get('price') ? parseFloat(formData.get('price') as string) : null
  const purchaseDate = formData.get('purchase_date') ? formData.get('purchase_date') as string : null
  const warrantyDate = formData.get('warranty_end_date') ? formData.get('warranty_end_date') as string : null
  
  const categoryId = formData.get('category_id') !== "no-category" ? formData.get('category_id') : null
  const locationId = formData.get('location_id') !== "no-location" ? formData.get('location_id') : null

  // Update
  const { error } = await supabase
    .from('inventory_items')
    .update({
      name: formData.get('name') as string,
      model: formData.get('model') as string,
      serial_number: formData.get('serial_number') as string,
      price: price,
      purchase_date: purchaseDate,
      warranty_end_date: warrantyDate,
      category_id: categoryId as string,
      location_id: locationId as string,
      photo_path: newPhotoPath
    })
    .eq('id', itemId)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/inventory/${itemId}`)
  revalidatePath('/inventory') // También refrescamos la lista general
  return { success: true }
}

// --- GESTIÓN DE CONFIGURACIÓN (Categorías y Ubicaciones) ---

// Crear Categoría
export async function createCategory(formData: FormData) {
  const supabase = await createClient()
  const name = formData.get('name') as string
  
  if (!name) return { success: false, error: "Nombre obligatorio" }

  const { error } = await supabase.from('inventory_categories').insert({ name })
  if (error) return { success: false, error: error.message }
  
  revalidatePath('/inventory')
  return { success: true }
}

// Borrar Categoría
export async function deleteCategory(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('inventory_categories').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/inventory')
  return { success: true }
}

// --- NUEVO: Actualizar Categoría ---
export async function updateCategory(formData: FormData) {
  const supabase = await createClient()
  
  const id = formData.get('id') as string
  const name = formData.get('name') as string
  const icon = formData.get('icon') as string // Añadimos soporte para icono si lo usas
  
  if (!id || !name) return { success: false, error: "Datos incompletos" }

  const { error } = await supabase
    .from('inventory_categories') // Tu tabla correcta
    .update({ name, icon })       // Actualizamos
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  
  revalidatePath('/inventory')
  return { success: true }
}

// Crear Ubicación
export async function createLocation(formData: FormData) {
  const supabase = await createClient()
  const name = formData.get('name') as string
  const parentId = formData.get('parent_id') as string // <--- NUEVO

  if (!name) return { success: false, error: "Nombre obligatorio" }

  // Convertimos "no-parent" o string vacío a null
  const finalParentId = (parentId && parentId !== "no-parent") ? parentId : null

  const { error } = await supabase
    .from('inventory_locations')
    .insert({ 
      name, 
      parent_id: finalParentId 
    })

  if (error) return { success: false, error: error.message }
  
  revalidatePath('/inventory')
  return { success: true }
}

// Borrar Ubicación
export async function deleteLocation(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('inventory_locations').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/inventory')
  return { success: true }
}

// --- NUEVO: Actualizar Ubicación ---
export async function updateLocation(formData: FormData) {
  const supabase = await createClient()
  
  const id = formData.get('id') as string
  const name = formData.get('name') as string
  // Nota: Mover de padre (parent_id) suele ser complejo en modales simples,
  // aquí nos centramos en renombrar.
  
  if (!id || !name) return { success: false, error: "Datos incompletos" }

  const { error } = await supabase
    .from('inventory_locations') // Tu tabla correcta
    .update({ name })
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  
  revalidatePath('/inventory')
  return { success: true }
}

