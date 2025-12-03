'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// --- HELPERS ---

async function checkTripClosed(supabase: any, tripId: string) {
  const { data: trip } = await supabase
    .from('travel_trips')
    .select('status')
    .eq('id', tripId)
    .single()
  return trip?.status === 'closed'
}

async function uploadFile(supabase: any, file: File, tripId: string) {
  if (!file || file.size === 0) return null

  // 1. VALIDACIÓN DE TAMAÑO (5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("El archivo es demasiado grande (Máx 5MB)")
  }

  // 2. VALIDACIÓN DE TIPO
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Tipo de archivo no permitido (Solo IMG o PDF)")
  }

  // Creamos un nombre único: trip_id/timestamp-nombre.jpg
  const fileExt = file.name.split('.').pop()
  const fileName = `${tripId}/${Date.now()}.${fileExt}`

  const { error } = await supabase.storage
    .from('recibos')
    .upload(fileName, file)

  if (error) {
    console.error('Error subiendo imagen:', error)
    return null
  }

  // Devolvemos la URL pública para guardarla en la BD
  const { data } = supabase.storage.from('recibos').getPublicUrl(fileName)
  return data.publicUrl
}

// --- ACCIONES ---

export async function createTrip(formData: FormData) {
  const supabase = await createClient()
  const name = formData.get('name') as string
  const employer_id = formData.get('employer_id') as string
  const start_date = formData.get('start_date') as string
  const end_date = formData.get('end_date') as string

  if (!employer_id || !name || !start_date || !end_date) return { error: 'Faltan datos' }
  if (end_date < start_date) return { error: 'Fechas incorrectas' }

  const { error } = await supabase.from('travel_trips').insert({
    name, employer_id, start_date, end_date, status: 'planned'
  })

  if (error) return { error: 'Error al crear' }
  revalidatePath('/travel')
  return { success: true }
}

export async function updateTripStatus(tripId: string, newStatus: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('travel_trips').update({ status: newStatus }).eq('id', tripId)
  if (error) return { error: 'Error al actualizar' }
  revalidatePath(`/travel/${tripId}`)
  revalidatePath('/travel')
  return { success: true }
}

// === GASTOS CON FOTO ===

export async function createExpense(formData: FormData) {
  const supabase = await createClient()
  const trip_id = formData.get('trip_id') as string

  if (await checkTripClosed(supabase, trip_id)) {
    return { error: '⛔ El viaje está CERRADO.' }
  }

  const category_id = formData.get('category_id') as string
  const date = formData.get('date') as string
  const concept = formData.get('concept') as string
  const amountStr = formData.get('amount') as string
  const distanceStr = formData.get('mileage_distance') as string
  const rateStr = formData.get('mileage_rate_snapshot') as string
  const is_reimbursable = formData.get('is_reimbursable') === 'on'
  
  // 1. GESTIÓN DEL ARCHIVO
  const file = formData.get('receipt_file') as File
  const receipt_url = await uploadFile(supabase, file, trip_id)

  if (!trip_id || !category_id || !date || !concept) return { error: 'Faltan datos' }

  const expenseData: any = {
    trip_id, category_id, date, concept, is_reimbursable,
    amount: parseFloat(amountStr || '0'),
    receipt_url, // Guardamos la URL (puede ser null si no subió nada)
    user_id: (await supabase.auth.getUser()).data.user?.id
  }

  if (distanceStr) {
    expenseData.mileage_distance = parseFloat(distanceStr)
    expenseData.mileage_rate_snapshot = parseFloat(rateStr)
  }

  const { error } = await supabase.from('travel_expenses').insert(expenseData)
  if (error) return { error: 'Error al guardar' }
  
  revalidatePath(`/travel/${trip_id}`)
  return { success: true }
}

export async function updateExpense(formData: FormData) {
  const supabase = await createClient()
  const trip_id = formData.get('trip_id') as string
  
  if (await checkTripClosed(supabase, trip_id)) {
    return { error: '⛔ El viaje está CERRADO.' }
  }

  const id = formData.get('expense_id') as string
  
  // 1. GESTIÓN DEL ARCHIVO (Solo si suben uno nuevo)
  const file = formData.get('receipt_file') as File
  const new_receipt_url = await uploadFile(supabase, file, trip_id)

  const updateData: any = {
    category_id: formData.get('category_id'),
    date: formData.get('date'),
    concept: formData.get('concept'),
    is_reimbursable: formData.get('is_reimbursable') === 'on',
    amount: parseFloat(formData.get('amount') as string || '0')
  }

  // Si hemos subido foto nueva, actualizamos el campo. Si no, no lo tocamos.
  if (new_receipt_url) {
    updateData.receipt_url = new_receipt_url
  }

  const distanceStr = formData.get('mileage_distance') as string
  if (distanceStr) {
    updateData.mileage_distance = parseFloat(distanceStr)
    updateData.mileage_rate_snapshot = parseFloat(formData.get('mileage_rate_snapshot') as string)
  } else {
    updateData.mileage_distance = null
    updateData.mileage_rate_snapshot = null
  }

  const { error } = await supabase.from('travel_expenses').update(updateData).eq('id', id)
  if (error) return { error: 'Error al actualizar' }
  
  revalidatePath(`/travel/${trip_id}`)
  return { success: true }
}

export async function deleteExpense(expenseId: string, tripId: string) {
  const supabase = await createClient()
  if (await checkTripClosed(supabase, tripId)) return { error: '⛔ Cerrado.' }
  
  // Nota: Podríamos borrar la foto del storage aquí también para limpiar, 
  // pero por seguridad a veces es mejor dejarlas o hacer una limpieza mensual.
  
  const { error } = await supabase.from('travel_expenses').delete().eq('id', expenseId)
  if (error) return { error: 'Error al borrar' }
  revalidatePath(`/travel/${tripId}`)
  return { success: true }
}

// === ACCIÓN RÁPIDA: SUBIR TICKET ===
export async function uploadExpenseReceipt(formData: FormData) {
  const supabase = await createClient()
  const expenseId = formData.get('expense_id') as string
  const tripId = formData.get('trip_id') as string
  const file = formData.get('file') as File

  // 1. Validar candado
  if (await checkTripClosed(supabase, tripId)) {
    return { error: '⛔ El viaje está CERRADO.' }
  }

  // 2. Subir archivo (Reutilizamos la función helper que ya tienes arriba)
  const publicUrl = await uploadFile(supabase, file, tripId)

  if (!publicUrl) return { error: 'Error al subir el archivo' }

  // 3. Actualizar solo el campo receipt_url
  const { error } = await supabase
    .from('travel_expenses')
    .update({ receipt_url: publicUrl })
    .eq('id', expenseId)

  if (error) return { error: 'Error guardando en base de datos' }

  revalidatePath(`/travel/${tripId}`)
  return { success: true }
}
export async function deleteReceipt(expenseId: string, tripId: string) {
  const supabase = await createClient()
  
  // 1. Candado
  if (await checkTripClosed(supabase, tripId)) return { error: '⛔ Cerrado.' }

  // 2. Averiguar qué archivo borrar
  const { data: expense } = await supabase
    .from('travel_expenses')
    .select('receipt_url')
    .eq('id', expenseId)
    .single()

  if (!expense?.receipt_url) return { error: 'No hay ticket que borrar' }

  // 3. Intentar borrar del Storage (Limpieza)
  try {
    // La URL es tipo: .../recibos/TRIP_ID/ARCHIVO.jpg
    // Extraemos la parte final: TRIP_ID/ARCHIVO.jpg
    const urlParts = expense.receipt_url.split('/recibos/')
    if (urlParts.length > 1) {
      const filePath = decodeURIComponent(urlParts[1]) // decode por si tiene espacios
      await supabase.storage.from('recibos').remove([filePath])
    }
  } catch (err) {
    console.error("Error borrando archivo físico:", err)
    // Seguimos adelante, lo importante es borrarlo de la BD
  }

  // 4. Borrar referencia en Base de Datos
  const { error } = await supabase
    .from('travel_expenses')
    .update({ receipt_url: null })
    .eq('id', expenseId)

  if (error) return { error: 'Error al actualizar base de datos' }

  revalidatePath(`/travel/${tripId}`)
  return { success: true }
}

// === ACCIÓN: MARCAR COMO "SIN TICKET" (JUSTIFICAR) ===
export async function toggleReceiptWaived(expenseId: string, tripId: string, currentState: boolean) {
  const supabase = await createClient()
  
  if (await checkTripClosed(supabase, tripId)) return { error: '⛔ Cerrado.' }

  const { error } = await supabase
    .from('travel_expenses')
    .update({ receipt_waived: !currentState }) // Invertimos el valor actual
    .eq('id', expenseId)

  if (error) return { error: 'Error al actualizar' }

  revalidatePath(`/travel/${tripId}`)
  return { success: true }
}


// === ACCIÓN: CHECK CONTABILIDAD PERSONAL ===
export async function togglePersonalAccounting(expenseId: string, tripId: string, currentState: boolean) {
  const supabase = await createClient()
  
  // Nota: A diferencia de editar gastos, ESTO SÍ DEBERÍAS PODER HACERLO
  // aunque el viaje esté cerrado, porque es tu control personal.
  // Así que NO ponemos el bloqueo checkTripClosed aquí.

  const { error } = await supabase
    .from('travel_expenses')
    .update({ personal_accounting_checked: !currentState })
    .eq('id', expenseId)

  if (error) return { error: 'Error al actualizar' }

  revalidatePath(`/travel/${tripId}`)
  return { success: true }
}