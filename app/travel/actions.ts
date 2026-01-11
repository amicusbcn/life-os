// app/travel/actions.ts
'use server'

 
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { TripDbStatus, ExpenseReceiptUrl, TravelMileageTemplate } from '@/types/travel'
import { ActionResponse } from '@/types/common'


// --- HELPERS ---
/**
 * Obtiene la lista de rutas de Storage de todos los recibos asociados a un viaje.
 */
async function getReceiptPaths(supabase: any, tripId: string): Promise<string[]> {
  const { data: expenses, error } = await supabase
    .from('travel_expenses')
    .select('receipt_url')
    .eq('trip_id', tripId)
    .not('receipt_url', 'is', null) as { data: ExpenseReceiptUrl[] | null, error: any }; // <--- ¡Tipado de la respuesta de Supabase!

  if (error || !expenses) {
    console.error('Error al obtener rutas de recibos:', error);
    return [];
  }

  const paths = expenses
    .map((exp: ExpenseReceiptUrl) => { // <--- ¡Tipado explícito del parámetro 'exp'!
      const url = exp.receipt_url;
      const urlParts = url?.split('/recibos/');
      return urlParts && urlParts.length > 1 ? decodeURIComponent(urlParts[1]) : null;
    })
    .filter((path): path is string => path !== null); // <--- ¡Uso de Type Predicate para tipar el parámetro 'path' y el resultado!

  return paths;
}

/**
 * Elimina los archivos físicos de los recibos del bucket.
 */
async function deleteTripReceipts(supabase: any, paths: string[]) {
  if (paths.length === 0) return { success: true };
  
  const { error } = await supabase.storage.from('recibos').remove(paths);
  
  if (error) {
    console.error('Error borrando archivos físicos del viaje:', error);
    // Nota: Decidimos no lanzar un error fatal si el Storage falla,
    // ya que el objetivo principal (eliminar el viaje) puede continuar.
    return { success: false, error: 'Fallo al limpiar archivos físicos.' };
  }
  return { success: true };
}

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
  const employer_id = formData.get('employer_id') as string | null;
  const start_date = formData.get('start_date') as string
  const end_date = formData.get('end_date') as string
  const context = formData.get('context') as 'work' | 'personal';

  const isMissingData = !name || !start_date || (context === 'work' && !employer_id);

  if (isMissingData) {
      return { 
          success: false, 
          error: 'Error: Faltan datos obligatorios (Nombre, Fecha o Empresa).' 
      };
  }
  if (end_date < start_date) return { success: false, error: 'Fechas incorrectas' }

  // CAMBIO IMPORTANTE: Estado inicial siempre es 'open'
  const { error } = await supabase.from('travel_trips').insert({
    name, employer_id, start_date, end_date, context,status: 'open'
  })

  if (error) {
    console.error('Supabase Error:', error)
    return { success: false, error: 'Error al crear el viaje' }
  }
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
/**
 * Elimina un viaje, sus gastos asociados, y los archivos físicos de recibos.
 * @param tripId El UUID del viaje a eliminar.
 * @returns Un objeto con { success: true } o { error: string }.
 */
export async function deleteTrip(tripId: string): Promise<ActionResponse> {
  const supabase = await createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'No autenticado.' }
    }

    // 1. Obtener el viaje y verificar propiedad (IMPORTANTE: Mantenemos el 'open' check implícitamente por el Frontend)
    const { data: trip, error: fetchError } = await supabase
      .from('travel_trips')
      .select('user_id, status, report_id')
      .eq('id', tripId)
      .single()

    if (fetchError || !trip) {
      return { success: false, error: 'Viaje no encontrado o error de BBDD.' }
    }
    
    if (trip.user_id !== user.id) {
      return { success: false, error: 'Permiso denegado: No es el propietario.' }
    }
    
    // Doble verificación: Bloqueamos si no es 'open' o si ya fue reportado
    if (trip.status !== 'open' || trip.report_id) {
        return { success: false, error: 'No se puede eliminar un viaje cerrado o reportado.' };
    }


    // 2. Obtener las rutas de los archivos de recibos antes de eliminar los gastos
    const pathsToDelete = await getReceiptPaths(supabase, tripId);
    
    // 3. Eliminación de los archivos físicos (Storage)
    await deleteTripReceipts(supabase, pathsToDelete); // Dejamos que falle suavemente si el Storage da problemas

    // 4. Eliminación del registro del viaje
    // ON DELETE CASCADE se encarga de eliminar automáticamente los travel_expenses
    const { error: deleteError } = await supabase
      .from('travel_trips')
      .delete()
      .eq('id', tripId)
      
    if (deleteError) {
      console.error('Error al eliminar viaje:', deleteError)
      return { success: false, error: 'Fallo en la eliminación del viaje en BBDD.' }
    }

    revalidatePath(`/travel`) // Recarga la lista principal
    return { success: true }
  } catch (error) {
    console.error('Error catastrófico en deleteTrip:', error)
    return { success: false, error: 'Error interno del servidor.' }
  }
}
// === GASTOS CON FOTO ===
// 1. LA FUNCIÓN NÚCLEO (Privada, no se exporta)
async function insertExpenseWithFinance(
  supabase: any,
  user_id: string,
  data: {
    trip_id: string;
    category_id: string;
    date: string;
    concept: string;
    amount: number;
    context: string;
    mileage_distance?: number;
    mileage_rate_snapshot?: number;
    receipt_url?: string;
    account_id?: string; // Para el Doble Grabado manual
    sync_finance: boolean;
  }
) {
  // A. Insertar en Viajes
  const { data: newExpense, error: expError } = await supabase
    .from('travel_expenses')
    .insert({
      trip_id: data.trip_id,
      category_id: data.category_id,
      date: data.date,
      concept: data.concept,
      amount: data.amount,
      mileage_distance: data.mileage_distance,
      mileage_rate_snapshot: data.mileage_rate_snapshot,
      receipt_url: data.receipt_url,
      is_reimbursable: data.context === 'work',
      user_id: user_id,
      context: data.context
    })
    .select().single();

  if (expError) throw expError;

  // B. Si toca Finanzas (Doble Grabado)
  if (data.sync_finance) {
    const CUENTA_VIAJES_ID = '99f4b21c-9883-4bae-b0a8-19b7ae058f18';

    const FIN_CAT_ID = data.context === 'work' 
      ? 'ad17366f-06de-4f06-b88e-67aace8f4b21' 
      : 'db5e8971-26b9-4d42-adf4-77fa30cd0dba';

    const { error: finError } = await supabase
      .from('finance_transactions')
      .insert({
        user_id,
        account_id: CUENTA_VIAJES_ID,
        category_id: FIN_CAT_ID,
        date: data.date,
        concept: `[VIAJE] ${data.concept}`,
        amount: -data.amount,
        travel_expense_id: newExpense.id,
        trip_id: data.trip_id
      });

    if (finError) console.error("Error sincronizando finanzas:", finError);
  }

  return { success: true };
}

export async function createExpense(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient();
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return { success: false, error: 'No auth' };

  const trip_id = formData.get('trip_id') as string;
  const context = formData.get('context') as string || 'work';
  const syncFinance = formData.get('addToFinance') === 'true';
  const account_id = formData.get('account_id') as string;

  if (!(await checkTripEditable(supabase, trip_id))) {
    return { success: false, error: '⛔ Viaje cerrado.' };
  }

  try {
    const file = formData.get('receipt_file') as File;
    const receipt_url = await uploadFile(supabase, file, trip_id);

    await insertExpenseWithFinance(supabase, user.id, {
      trip_id,
      category_id: formData.get('category_id') as string,
      date: formData.get('date') as string,
      concept: formData.get('concept') as string,
      amount: parseFloat(formData.get('amount') as string || '0'),
      context,
      receipt_url: receipt_url ?? undefined,
      account_id,
      sync_finance: syncFinance,
      mileage_distance: formData.get('mileage_distance') ? parseFloat(formData.get('mileage_distance') as string) : undefined,
      mileage_rate_snapshot: formData.get('mileage_rate_snapshot') ? parseFloat(formData.get('mileage_rate_snapshot') as string) : undefined,
    });

    revalidatePath(`/travel/${context}/${trip_id}`);
    revalidatePath('/finance');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateExpense(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient()
  const trip_id = formData.get('trip_id') as string
  const expense_id = formData.get('expense_id') as string
  const context = formData.get('context') as string || 'work'
  
  if (!(await checkTripEditable(supabase, trip_id))) {
    return { success: false, error: '⛔ Viaje cerrado o reportado.' }
  }

  try {
    const file = formData.get('receipt_file') as File
    const new_receipt_url = await uploadFile(supabase, file, trip_id)

    const amount = parseFloat(formData.get('amount') as string || '0')
    const concept = formData.get('concept') as string
    const date = formData.get('date') as string

    const updateData: any = {
      category_id: formData.get('category_id'),
      date,
      concept,
      amount,
      is_reimbursable: context === 'work' // Mantenemos coherencia con la creación
    }

    if (new_receipt_url) updateData.receipt_url = new_receipt_url

    const distanceStr = formData.get('mileage_distance') as string
    if (distanceStr) {
      updateData.mileage_distance = parseFloat(distanceStr)
      updateData.mileage_rate_snapshot = parseFloat(formData.get('mileage_rate_snapshot') as string)
    }

    // A. Actualizar en Travel
    const { error: travelError } = await supabase
      .from('travel_expenses')
      .update(updateData)
      .eq('id', expense_id)

    if (travelError) throw travelError

    // B. Sincronizar con Finanzas (si existe vinculación)
    // Buscamos si hay una transacción en finanzas vinculada a este gasto
    const { error: financeError } = await supabase
      .from('finance_transactions')
      .update({
        amount: -amount, // Recordar signo negativo para gastos
        concept: `[VIAJE] ${concept}`,
        date: date
      })
      .eq('travel_expense_id', expense_id) // Filtro por el vínculo UUID

    if (financeError) console.error("Aviso: No se pudo actualizar en Finanzas:", financeError)

    revalidatePath(`/travel/${context}/${trip_id}`)
    revalidatePath('/finance')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function deleteExpense(expenseId: string, tripId: string): Promise<ActionResponse> {
  const supabase = await createClient()
  
  // 1. Verificamos si es editable
  if (!(await checkTripEditable(supabase, tripId))) {
    return { success: false, error: '⛔ No se puede borrar: Viaje cerrado.' }
  }

  try {
    // 2. Borrado en Finanzas (Doble Borrado)
    // Lo hacemos primero por si hay restricciones de integridad, aunque tu esquema permite nulos
    const { error: financeError } = await supabase
      .from('finance_transactions')
      .delete()
      .eq('travel_expense_id', expenseId)

    if (financeError) console.error("Error al borrar vinculación financiera:", financeError)

    // 3. Borrado en Travel
    const { error: travelError } = await supabase
      .from('travel_expenses')
      .delete()
      .eq('id', expenseId)

    if (travelError) throw travelError

    // 4. Revalidar ambos mundos
    // Nota: Como no tenemos el context aquí, revalidamos el path genérico o layout
    revalidatePath('/travel', 'layout') 
    revalidatePath('/finance')
    
    return { success: true }
  } catch (e: any) {
    return { success: false, error: 'Error al borrar: ' + e.message }
  }
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

// --- ACCIONES DE PLANTILLAS DE KILOMETRAJE ---

/**
 * Crea una nueva plantilla de recorrido fijo.
 * @param formData FormData con 'name' y 'distance'.
 */
export async function createMileageTemplate(formData: FormData): Promise<ActionResponse> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado.' };

    const name = formData.get('name') as string;
    const distanceStr = formData.get('distance') as string;

    if (!name || !distanceStr) return { success: false, error: 'Faltan campos.' };

    const distance = parseFloat(distanceStr);

    try {
        const { error } = await supabase.from('travel_mileage_templates').insert({
            name: name,
            distance: distance, // <-- Cambiado de default_distance a distance
            user_id: user.id
        });

        if (error) throw error;

        revalidatePath('/travel/[context]', 'layout');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}


/**
 * Crea un gasto de kilometraje en un viaje existente a partir de una plantilla.
 * ... (Esta función se mantiene igual, usando ActionResponse de types/common) ...
 * * NOTA: Por brevedad no repito el cuerpo de esta función, pero se mantiene el que definí antes.
 */
// app/travel/actions.ts

export async function createExpenseFromTemplate(templateId: string, tripId: string, date: string, concept?: string): Promise<ActionResponse> {
  const supabase = await createClient();
  const user = (await supabase.auth.getUser()).data.user;
  if (!user || !user.id) return { success: false, error: 'No auth' };

  try {
    // Lógica de cálculo (reutilizamos la que ya tenías)
    const { data: template } = await supabase.from('travel_mileage_templates').select('*').eq('id', templateId).single();
    const { data: cat } = await supabase.from('travel_categories').select('*').eq('is_mileage', true).single();
    
    if (!template || !cat) throw new Error("Plantilla o categoría no encontrada");

    const amount = template.distance * cat.current_rate;

    // Llamamos al núcleo. Para kilometraje personal/trabajo SIEMPRE sync_finance = true
    await insertExpenseWithFinance(supabase, user.id, {
      trip_id: tripId,
      category_id: cat.id,
      date,
      concept: concept || `Recorrido: ${template.name}`,
      amount,
      context: 'work', // Como dijiste: el kilometraje siempre es trabajo
      sync_finance: true, // Siempre a la cuenta de viajes
      mileage_distance: template.distance,
      mileage_rate_snapshot: cat.current_rate,
    });

    revalidatePath(`/travel/work/${tripId}`);
    revalidatePath('/finance');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Elimina una plantilla de kilometraje.
 */
export async function deleteMileageTemplate(templateId: string): Promise<ActionResponse> {
    const supabase = await createClient();
    const user = (await supabase.auth.getUser()).data.user;

    if (!user) {
        return { success: false, error: 'No autenticado.' };
    }

    try {
        // 1. Verificar propiedad (usamos un select simple para validar la existencia y propiedad)
        const { data, error: fetchError } = await supabase
            .from('travel_mileage_templates')
            .select('id')
            .eq('id', templateId)
            .eq('user_id', user.id)
            .limit(1)
            .single();

        if (fetchError || !data) {
             return { success: false, error: 'Plantilla no encontrada o permiso denegado.' };
        }

        // 2. Eliminar
        const { error: deleteError } = await supabase
            .from('travel_mileage_templates')
            .delete()
            .eq('id', templateId);

        if (deleteError) {
            console.error('Error al eliminar plantilla:', deleteError);
            return { success: false, error: 'Error al eliminar la plantilla.' };
        }

        revalidatePath('/travel/settings/mileage');
        return { success: true };
    } catch (error) {
        console.error('Error catastrófico en deleteMileageTemplate:', error);
        return { success: false, error: 'Error interno del servidor.' };
    }
}
// app/travel/actions.ts

export async function createTravelCategory(formData: FormData): Promise<ActionResponse> {
    const supabase = await createClient()
    const name = formData.get('name') as string
    const icon_name = formData.get('icon_name') as string
    const context = formData.get('context') as string
    const is_mileage = formData.get('is_mileage') === 'true'
    const current_rate = formData.get('current_rate') ? parseFloat(formData.get('current_rate') as string) : null

    const { error } = await supabase
        .from('travel_categories')
        .insert({ name, icon_key: icon_name, context, is_mileage, current_rate })

    if (error) return { success: false, error: error.message }
    return { success: true }
}

export async function updateTravelCategory(formData: FormData): Promise<ActionResponse> {
    const supabase = await createClient()
    const id = formData.get('id') as string
    const name = formData.get('name') as string
    const icon_name = formData.get('icon_name') as string
    const current_rate = formData.get('current_rate') ? parseFloat(formData.get('current_rate') as string) : null

    const { error } = await supabase
        .from('travel_categories')
        .update({ name, icon_key: icon_name, current_rate })
        .eq('id', id)

    if (error) return { success: false, error: error.message }
    return { success: true }
}

export async function deleteTravelCategory(id: string): Promise<ActionResponse> {
    const supabase = await createClient()
    const { error } = await supabase.from('travel_categories').delete().eq('id', id)
    if (error) return { success: false, error: error.message }
    return { success: true }
}