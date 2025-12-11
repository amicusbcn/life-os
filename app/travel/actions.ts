// app/travel/actions.ts
'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
// Importamos ActionResponse para tipar correctamente todas las mutaciones
import { TripDbStatus, ActionResponse } from '@/types/travel' 

// --- HELPERS ---

/**
 * Verifica si un viaje permite edición (No está cerrado ni reportado).
 * Devuelve TRUE si se puede editar, FALSE si está bloqueado.
 */
async function checkTripEditable(supabase: any, tripId: string): Promise<boolean> {
  const { data: trip } = await supabase
    .from('travel_trips')
    .select('status, report_id')
    .eq('id', tripId)
    .single()
  
  if (!trip) return false;

  // Si tiene report_id asignado, siempre está bloqueado
  if (trip.report_id) return false;

  // Si el estado es reported o closed, está bloqueado
  if (trip.status === 'reported' || trip.status === 'closed') return false;

  return true; // Solo si es 'open'
}

async function uploadFile(supabase: any, file: File, tripId: string): Promise<string | null> {
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

  // Creamos un nombre único
  const fileExt = file.name.split('.').pop()
  const fileName = `${tripId}/${Date.now()}.${fileExt}`

  const { error } = await supabase.storage
    .from('recibos')
    .upload(fileName, file)

  if (error) {
    console.error('Error subiendo imagen:', error)
    return null
  }

  const { data } = supabase.storage.from('recibos').getPublicUrl(fileName)
  return data.publicUrl
}

// --- ACCIONES DE VIAJE ---

export async function createTrip(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient()
  const name = formData.get('name') as string
  const employer_id = formData.get('employer_id') as string
  const start_date = formData.get('start_date') as string
  const end_date = formData.get('end_date') as string

  if (!employer_id || !name || !start_date || !end_date) return { success: false, error: 'Faltan datos' }
  if (end_date < start_date) return { success: false, error: 'Fechas incorrectas' }

  // CAMBIO IMPORTANTE: Estado inicial siempre es 'open'
  const { error } = await supabase.from('travel_trips').insert({
    name, employer_id, start_date, end_date, status: 'open'
  })

  if (error) return { success: false, error: 'Error al crear el viaje' }
  revalidatePath('/travel')
  return { success: true }
}

export async function updateTripStatus(tripId: string, newStatus: TripDbStatus): Promise<ActionResponse> {
  const supabase = await createClient()

  // SEGURIDAD: Si intentamos REABRIR ('open'), verificamos que no esté reportado
  if (newStatus === 'open') {
      const { data: trip } = await supabase
          .from('travel_trips')
          .select('status, report_id')
          .eq('id', tripId)
          .single();
      
      if (trip?.report_id || trip?.status === 'reported') {
          return { success: false, error: '⛔ No se puede reabrir un viaje ya reportado.' };
      }
  }

  const { error } = await supabase
    .from('travel_trips')
    .update({ status: newStatus })
    .eq('id', tripId)

  if (error) return { success: false, error: 'Error al actualizar estado del viaje' }
  
  revalidatePath(`/travel/${tripId}`)
  revalidatePath('/travel')
  return { success: true }
}

// === GASTOS CON FOTO ===

export async function createExpense(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient()
  const trip_id = formData.get('trip_id') as string

  // Usamos el nuevo helper más estricto
  if (!(await checkTripEditable(supabase, trip_id))) {
    return { success: false, error: '⛔ Viaje cerrado o reportado. No se pueden añadir gastos.' }
  }

  const category_id = formData.get('category_id') as string
  const date = formData.get('date') as string
  const concept = formData.get('concept') as string
  const amountStr = formData.get('amount') as string
  const distanceStr = formData.get('mileage_distance') as string
  const rateStr = formData.get('mileage_rate_snapshot') as string
  const is_reimbursable = formData.get('is_reimbursable') === 'on'
  
  try {
    const file = formData.get('receipt_file') as File
    const receipt_url = await uploadFile(supabase, file, trip_id)

    if (!trip_id || !category_id || !date || !concept) return { success: false, error: 'Faltan datos obligatorios.' }

    const expenseData: any = {
      trip_id, category_id, date, concept, is_reimbursable,
      amount: parseFloat(amountStr || '0'),
      receipt_url, 
      user_id: (await supabase.auth.getUser()).data.user?.id
    }

    if (distanceStr) {
      expenseData.mileage_distance = parseFloat(distanceStr)
      expenseData.mileage_rate_snapshot = parseFloat(rateStr)
    }

    const { error } = await supabase.from('travel_expenses').insert(expenseData)
    if (error) return { success: false, error: 'Error al guardar el gasto: ' + error.message }
    
    revalidatePath(`/travel/${trip_id}`)
    return { success: true }
  } catch (e: any) {
     return { success: false, error: e.message }
  }
}

export async function updateExpense(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient()
  const trip_id = formData.get('trip_id') as string
  
  if (!(await checkTripEditable(supabase, trip_id))) {
    return { success: false, error: '⛔ Viaje cerrado o reportado.' }
  }

  const id = formData.get('expense_id') as string
  
  try {
    const file = formData.get('receipt_file') as File
    const new_receipt_url = await uploadFile(supabase, file, trip_id)

    const updateData: any = {
      category_id: formData.get('category_id'),
      date: formData.get('date'),
      concept: formData.get('concept'),
      is_reimbursable: formData.get('is_reimbursable') === 'on',
      amount: parseFloat(formData.get('amount') as string || '0')
    }

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
    if (error) return { success: false, error: 'Error al actualizar el gasto: ' + error.message }
    
    revalidatePath(`/travel/${trip_id}`)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function deleteExpense(expenseId: string, tripId: string): Promise<ActionResponse> {
  const supabase = await createClient()
  
  if (!(await checkTripEditable(supabase, tripId))) {
    return { success: false, error: '⛔ No se puede borrar: Viaje cerrado o reportado.' }
  }
  
  const { error } = await supabase.from('travel_expenses').delete().eq('id', expenseId)
  if (error) return { success: false, error: 'Error al borrar el gasto' }
  revalidatePath(`/travel/${tripId}`)
  return { success: true }
}

// === ACCIÓN RÁPIDA: SUBIR TICKET ===
export async function uploadExpenseReceipt(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient()
  const expenseId = formData.get('expense_id') as string
  const tripId = formData.get('trip_id') as string
  const file = formData.get('file') as File

  if (!(await checkTripEditable(supabase, tripId))) {
    return { success: false, error: '⛔ Viaje cerrado o reportado.' }
  }

  try {
    const publicUrl = await uploadFile(supabase, file, tripId)
    if (!publicUrl) return { success: false, error: 'Error al subir el archivo' }

    const { error } = await supabase
      .from('travel_expenses')
      .update({ receipt_url: publicUrl })
      .eq('id', expenseId)

    if (error) return { success: false, error: 'Error guardando URL en base de datos' }

    revalidatePath(`/travel/${tripId}`)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function deleteReceipt(expenseId: string, tripId: string): Promise<ActionResponse> {
  const supabase = await createClient()
  
  if (!(await checkTripEditable(supabase, tripId))) {
    return { success: false, error: '⛔ Viaje cerrado o reportado.' }
  }

  const { data: expense } = await supabase
    .from('travel_expenses')
    .select('receipt_url')
    .eq('id', expenseId)
    .single()

  if (!expense?.receipt_url) return { success: false, error: 'No hay ticket que borrar' }

  // Borrado de storage (opcional, pero buena práctica)
  try {
    const urlParts = expense.receipt_url.split('/recibos/')
    if (urlParts.length > 1) {
      const filePath = decodeURIComponent(urlParts[1])
      await supabase.storage.from('recibos').remove([filePath])
    }
  } catch (err) {
    // Solo logeamos el error de storage, no impedimos el éxito en la DB
    console.error("Error borrando archivo físico:", err)
  }

  const { error } = await supabase
    .from('travel_expenses')
    .update({ receipt_url: null })
    .eq('id', expenseId)

  if (error) return { success: false, error: 'Error al actualizar base de datos' }

  revalidatePath(`/travel/${tripId}`)
  return { success: true }
}

// === ACCIÓN: MARCAR COMO "SIN TICKET" (JUSTIFICAR) ===
export async function toggleReceiptWaived(expenseId: string, tripId: string, currentState: boolean): Promise<ActionResponse> {
  const supabase = await createClient()
  
  // Waiving a receipt counts as modifying the expense data
  if (!(await checkTripEditable(supabase, tripId))) {
    return { success: false, error: '⛔ Viaje cerrado o reportado.' }
  }

  const { error } = await supabase
    .from('travel_expenses')
    .update({ receipt_waived: !currentState }) 
    .eq('id', expenseId)

  if (error) return { success: false, error: 'Error al actualizar la justificación' }

  revalidatePath(`/travel/${tripId}`)
  return { success: true }
}

// === ACCIÓN: CHECK CONTABILIDAD PERSONAL ===
// ESTA ES LA ÚNICA QUE NO TIENE EL BLOQUEO 'checkTripEditable'
export async function togglePersonalAccounting(expenseId: string, tripId: string, currentState: boolean): Promise<ActionResponse> {
  const supabase = await createClient()
  
  // Permitimos checkear contabilidad personal incluso si el viaje está cerrado o reportado
  const { error } = await supabase
    .from('travel_expenses')
    .update({ personal_accounting_checked: !currentState })
    .eq('id', expenseId)

  if (error) return { success: false, error: 'Error al actualizar el check contable' }

  revalidatePath(`/travel/${tripId}`)
  return { success: true }
}