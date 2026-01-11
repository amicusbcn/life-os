'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { ActionResponse, CreateReportResponse } from '@/types/common' 
import { ReportCandidatesResponse, TravelTrip, TravelReport, TripDbStatus } from '@/types/travel'
import React from 'react'
import { renderToStream } from '@react-pdf/renderer'
import { getReportSummary, ReportSummary } from '@/utils/report-logic'
import { ReceiptsPDF } from './reports/[id]/TravelReportPDF' 

// --- CONFIGURACIÓN ---
const REPORT_BUCKET = 'travel-reports' 
const EXPENSE_BUCKET = 'expense-receipts'

// --- HELPERS ---

function extractPath(fullUrl: string, bucket: string) {
  if (fullUrl.includes(bucket)) {
    const path = fullUrl.split(`/${bucket}/`).pop() || ''
    return path ? decodeURIComponent(path) : ''
  }
  return fullUrl 
}

function generateSimpleId() {
    const timestamp = new Date().getTime().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${random}`;
}

// --- 1. BUSCAR CANDIDATOS ---
export async function getReportCandidates(employerId: string): Promise<ReportCandidatesResponse> {
  const supabase = await createClient()
  const { data: rawTrips } = await supabase
  .from('travel_trips')
  .select('*')
  .eq('employer_id', employerId)
  .is('report_id', null)
  .order('start_date', { ascending: false })
  .returns<TravelTrip[]>()

  const trips = rawTrips || []
  const today = new Date().toISOString().split('T')[0]
  const ready = trips.filter(t => t.status === 'closed')
  const warnings = trips.filter(t => t.status !== 'closed' && t.end_date && t.end_date < today);

  return { ready, warnings }
}

// --- 2. LÓGICA DE CREACIÓN ---
async function _createReportCore(
    employerId: string, 
    name: string, 
    code: string, 
    tripIds: string[]
): Promise<CreateReportResponse> {
    const supabase = await createClient()
    const user = (await supabase.auth.getUser()).data.user

    const { data: report, error: reportError } = await supabase
        .from('travel_reports')
        .insert({
          employer_id: employerId,
          name: name,
          code: code || null, 
          status: 'draft',
          user_id: user?.id
        })
        .select()
        .single()

    if (reportError) return { success: false, error: "Error creando la hoja" }

    const { error: tripsError } = await supabase
        .from('travel_trips')
        .update({ report_id: report.id, status: 'reported' })
        .in('id', tripIds)

    if (tripsError) return { success: false, error: "Error asignando viajes" }

    // GENERACIÓN DE PDF DE TICKETS (Único PDF persistente)
    try {
        console.log(`[CREATE_REPORT] Generando PDF de tickets para: ${report.id}`)
        await generateReportReceiptsPDF(report.id)
    } catch (pdfError) {
        console.error("Error generando PDF de tickets:", pdfError)
    }

    revalidatePath('/travel')
    return { success: true, reportId: report.id, message: "Reporte creado con éxito." }
}

export async function createReport(formData: FormData): Promise<CreateReportResponse> {
    const employerId = formData.get('employerId') as string;
    const name = formData.get('reportName') as string;
    const code = formData.get('reportCode') as string;
    const tripIdsString = formData.get('tripIds') as string;
    let tripIds: string[] = [];
    
    try {
        if (tripIdsString) tripIds = JSON.parse(tripIdsString);
    } catch (e) {
        return { success: false, error: "Error al procesar los viajes." };
    }

    if (tripIds.length === 0) return { success: false, error: "No has seleccionado ningún viaje." }; 

    return _createReportCore(employerId, name, code, tripIds);
}

// --- LÓGICA DE PDF (Solo Tickets) ---
async function generateReportReceiptsPDF(reportId: string) {
    const supabase = await createClient()
    const { data: reportData, error: fetchError } = await supabase
        .from('travel_reports')
        .select(`
            *,
            travel_employers ( name ),
            travel_trips!report_id (
                id, name, start_date, end_date,
                travel_expenses (*,travel_categories(name))
            )
        `)
        .eq('id', reportId)
        .single()

    if (fetchError || !reportData) throw new Error("Error obteniendo datos para el PDF")

    const summaryData = getReportSummary(reportData); 
    const employeeName = 'Jesús'
    const baseProps = { report: reportData, summaryData, employeeName }

    // Generar y subir solo el anexo de justificantes
    await generateAndUploadSinglePDF(supabase, ReceiptsPDF, baseProps, reportId, 'receipts')
}

async function generateAndUploadSinglePDF(
  supabase: any, 
  Component: React.ElementType, 
  props: any, 
  reportId: string, 
  suffix: 'summary' | 'detail' | 'receipts'
) {
    const element = React.createElement(Component, props);
    const pdfStream = await renderToStream(element); 
    const chunks: any[] = []; 
    for await (const chunk of pdfStream) { chunks.push(chunk); }
    const buffer = Buffer.concat(chunks);
    
    const fileId = generateSimpleId(); 
    const reportCodeName = props.report.code || props.report.name.replace(/\s/g, '_');
    const fileName = `${reportCodeName}_${suffix}_${fileId}.pdf`
    const filePath = `${props.report.user_id}/${reportId}/${fileName}`

    const { error: uploadError } = await supabase.storage
        .from(REPORT_BUCKET)
        .upload(filePath, buffer, { contentType: 'application/pdf', upsert: true })
    
    if (uploadError) throw new Error(`Fallo al subir el PDF de ${suffix}.`);

    const { data: publicUrlData } = supabase.storage.from(REPORT_BUCKET).getPublicUrl(filePath)
    
    await supabase
        .from('travel_reports')
        .update({ [`url_${suffix}`]: publicUrlData.publicUrl })
        .eq('id', reportId)
}

// --- 3. CAMBIO DE ESTADO ---
export async function markAsSubmitted(reportId: string): Promise<ActionResponse> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('travel_reports')
    .update({ status: 'submitted', submitted_at: new Date().toISOString() })
    .eq('id', reportId)

  if (error) return { success: false, error: "Error al enviar" }
  revalidatePath('/travel')
  return { success: true, message: "Reporte enviado." }
}

// app/travel/report-actions.ts

export async function markAsPaidAndArchive(reportId: string): Promise<ActionResponse> {
  const supabase = await createClient()
  try {
    // 1. Obtener los gastos para limpiar el bucket de fotos individuales
    const { data: expenses } = await supabase
      .from('travel_expenses')
      .select('receipt_url')
      .eq('report_id', reportId)
      .not('receipt_url', 'is', null)

    if (expenses && expenses.length > 0) {
      const filesToDelete = expenses
        .map(e => extractPath(e.receipt_url!, 'expense-receipts'))
        .filter(path => path.length > 0)

      if (filesToDelete.length > 0) {
        await supabase.storage.from('expense-receipts').remove(filesToDelete)
      }
      // Borramos las referencias a las fotos en la tabla de gastos
      await supabase.from('travel_expenses').update({ receipt_url: null }).eq('report_id', reportId)
    }

    // 2. Marcar el reporte como pagado
    const { error: reportError } = await supabase
      .from('travel_reports')
      .update({ 
        status: 'paid', 
        paid_at: new Date().toISOString() 
      })
      .eq('id', reportId)

    if (reportError) throw reportError

    // 3. NUEVO: Archivar automáticamente todos los viajes del reporte
    // Esto los saca de la vista principal y los manda al histórico
    const { error: tripsError } = await supabase
      .from('travel_trips')
      .update({ status: 'archived' })
      .eq('report_id', reportId)

    if (tripsError) throw tripsError

    revalidatePath('/travel')
    return { success: true, message: "Reporte pagado y viajes archivados con éxito." }
  } catch (err: any) {
    console.error("Error en markAsPaid:", err)
    return { success: false, error: "Error al procesar el pago." }
  }
}

export async function revertToDraft(reportId: string): Promise<ActionResponse> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('travel_reports')
    .update({ status: 'draft', submitted_at: null, paid_at: null })
    .eq('id', reportId)

  if (error) return { success: false, error: "Error al revertir" }
  revalidatePath('/travel')
  return { success: true, message: "Reporte revertido a Borrador." }
}

// --- 4. ELIMINAR REPORTE ---
export async function deleteReport(reportId: string): Promise<ActionResponse> {
  const supabase = await createClient()
  try {
    const { data: report, error: fetchError } = await supabase
      .from('travel_reports')
      .select('*')
      .eq('id', reportId)
      .single()

    if (fetchError || !report) throw new Error("Reporte no encontrado")
    if (report.status !== 'draft') throw new Error("Solo borradores")

    // Solo borramos el PDF de tickets del Storage
    if (report.url_receipts) {
      const path = extractPath(report.url_receipts, REPORT_BUCKET)
      if (path) await supabase.storage.from(REPORT_BUCKET).remove([path])
    }

    await supabase.from('travel_trips').update({ report_id: null, status: 'closed' }).eq('report_id', reportId)
    await supabase.from('travel_expenses').update({ report_id: null }).eq('report_id', reportId)
    await supabase.from('travel_reports').delete().eq('id', reportId)

    revalidatePath('/travel/reports')
    return { success: true, message: "Reporte eliminado." }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getSignedReportUrl(urlOrPath: string) {
  const supabase = await createClient()
  const identifier = `/public/${REPORT_BUCKET}/`;
  let relativePath = urlOrPath;
  if (urlOrPath.includes(identifier)) {
    relativePath = urlOrPath.split(identifier)[1];
  }
  const { data, error } = await supabase.storage.from(REPORT_BUCKET).createSignedUrl(relativePath, 60)
  if (error) throw new Error(`Error de Storage: ${error.message}`);
  return data.signedUrl
}