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