'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// --- 1. BUSCAR CANDIDATOS (La lógica del Warning) ---
export async function getReportCandidates(employerId: string) {
  const supabase = await createClient()

  // Buscamos viajes de esa empresa que NO estén ya en una hoja (report_id is null)
  const { data: trips } = await supabase
    .from('travel_trips')
    .select('*')
    .eq('employer_id', employerId)
    .is('report_id', null)
    .order('start_date', { ascending: false })

  if (!trips) return { ready: [], warnings: [] }

  const today = new Date().toISOString().split('T')[0]

  // CLASIFICACIÓN:
  // A. READY: Están CERRADOS (closed)
  const ready = trips.filter(t => t.status === 'closed')
  
  // B. WARNING: Ya acabaron (fecha fin < hoy) PERO siguen abiertos (active/planned)
  const warnings = trips.filter(t => t.status !== 'closed' && t.end_date < today)

  return { ready, warnings }
}

// --- 2. CREAR LA HOJA ---
export async function createReport(employerId: string, name: string, tripIds: string[]) {
  const supabase = await createClient()
  const user = (await supabase.auth.getUser()).data.user

  if (!tripIds.length) return { error: "No has seleccionado ningún viaje." }

  // A. Crear la cabecera del informe
  const { data: report, error: reportError } = await supabase
    .from('travel_reports')
    .insert({
      employer_id: employerId,
      name: name,
      status: 'draft',
      user_id: user?.id
    })
    .select()
    .single()

  if (reportError) return { error: "Error creando la hoja" }

  // B. Meter los viajes dentro (Actualizar su report_id)
  const { error: tripsError } = await supabase
    .from('travel_trips')
    .update({ report_id: report.id })
    .in('id', tripIds)

  if (tripsError) return { error: "Error asignando viajes" }

  revalidatePath('/travel')
  return { success: true }
}