// app/travel/report-actions.ts
'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { ActionResponse, CreateReportResponse } from '@/types/common' 
import { ReportCandidatesResponse, TravelTrip, TravelReport, TripDbStatus } from '@/types/travel'
import React from 'react'
import { renderToStream } from '@react-pdf/renderer'
import { getReportSummary, ReportSummary } from '@/utils/report-logic'
// app/travel/report-actions.ts
// ...
import { SummaryPDF, DetailPDF, ReceiptsPDF } from './reports/[id]/TravelReportPDF' 
// ...
// --- CONFIGURACIÓN ---
const REPORT_BUCKET = 'travel-reports' 

// --- HELPERS GENERALES ---

// Helper para sacar el path relativo de la URL pública
function extractPath(fullUrl: string, bucket: string) {
  if (fullUrl.includes(bucket)) {
	const path = fullUrl.split(`/${bucket}/`).pop() || ''
	return path ? decodeURIComponent(path) : ''
  }
  return fullUrl 
}

// SOLUCIÓN PARA UUID SIN INSTALAR: Generador simple de ID
function generateSimpleId() {
    // Genera un ID razonablemente único
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

// --- CORE: LÓGICA DE CREACIÓN (Función interna) ---
// Esta lógica se separa para poder ser llamada desde la Server Action de FormData.
async function _createReportCore(
    employerId: string, 
    name: string, 
    code: string, 
    tripIds: string[]
): Promise<CreateReportResponse> {
    const supabase = await createClient()
    const user = (await supabase.auth.getUser()).data.user

    // A. Insertar Cabecera 
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

    // B. Vincular viajes
    const { error: tripsError } = await supabase
        .from('travel_trips')
        .update({ report_id: report.id, status: 'reported' })
        .in('id', tripIds)

    if (tripsError) return { success: false, error: "Error asignando viajes" }

    // C. GENERACIÓN MULTI-PDF
    try {
        console.log(`[CREATE_REPORT] Iniciando generación de PDFs para reporte: ${report.id}`)
        await generateThreePDFs(report.id)
    } catch (pdfError) {
        console.error("Error generando PDFs:", pdfError)
    }

    revalidatePath('/travel')
    return { success: true, reportId: report.id, message: "Reporte creado y viajes vinculados con éxito." }
}


// --- 2. EXPORTACIÓN: createReport (Modificado para recibir FormData) ---
/**
 * Crea un nuevo reporte de gastos desde datos de formulario (FormData).
 * @param formData FormData del formulario de creación.
 */
export async function createReport(formData: FormData): Promise<CreateReportResponse> {
    
    // 1. Deserializar datos de FormData
    const employerId = formData.get('employerId') as string;
    const name = formData.get('reportName') as string;
    const code = formData.get('reportCode') as string;
    
    // 2. Deserializar la lista de IDs de viaje
    const tripIdsString = formData.get('tripIds') as string;
    let tripIds: string[] = [];
    
    try {
        if (tripIdsString) {
            tripIds = JSON.parse(tripIdsString);
        }
    } catch (e) {
        return { success: false, error: "Fallo al procesar los viajes seleccionados. Por favor, inténtalo de nuevo." };
    }

    if (tripIds.length === 0) {
        // La validación que está fallando en el frontend se maneja aquí de forma segura
        return { success: false, error: "No has seleccionado ningún viaje." }; 
    }

    // 3. Llamar a la lógica central
    return _createReportCore(employerId, name, code, tripIds);
}

// --- LOGICA DE GENERACIÓN MÚLTIPLE (RESTAURADA) ---
async function generateThreePDFs(reportId: string) {
    const supabase = await createClient()
console.log(`[PDF_FLOW] 1. Intentando obtener datos para Reporte ID: ${reportId}`);
    // 1. Obtener los datos completos del reporte (asumiendo ReportPDFQueryResponse en types/travel.ts)
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
        .returns<any>() // Usamos 'any' si ReportPDFQueryResponse no está definido aún

    if (fetchError || !reportData) {
        console.error("Error al obtener datos del reporte para PDF:", fetchError)
        throw new Error("Fallo al obtener datos completos del reporte para generar PDFs.")
    }
    console.log(`[PDF_FLOW] 1.2: Datos obtenidos. Viajes asociados: ${reportData.travel_trips?.length || 0}`);
// 2. Calcular el resumen y los datos detallados
    let summaryData: ReportSummary;
    try {
        summaryData = getReportSummary(reportData); 
        console.log(`[PDF_FLOW] 2.1: Resumen de datos calculado. Total Propio: ${summaryData.totalPropio}`);
    } catch (e) {
        console.error("[PDF_FLOW] ERROR 2.2: Fallo al ejecutar getReportSummary:", e);
        throw new Error("Fallo en la lógica de resumen de gastos.");
    }
    
    const employeeName =  'Jesús'
    const baseProps = { report: reportData, summaryData, employeeName }

    // 2. Generar y subir los 3 PDFs
    
    console.log(`[PDF_FLOW] 3.1: Iniciando generación SummaryPDF.`);
    await generateAndUploadSinglePDF(supabase, SummaryPDF, baseProps, reportId, 'summary')
    console.log(`[PDF_FLOW] 3.2: Generación SummaryPDF completada.`);

    console.log(`[PDF_FLOW] 4.1: Iniciando generación DetailPDF.`);
    await generateAndUploadSinglePDF(supabase, DetailPDF, baseProps, reportId, 'detail')
    console.log(`[PDF_FLOW] 4.2: Generación DetailPDF completada.`);

    console.log(`[PDF_FLOW] 5.1: Iniciando generación ReceiptsPDF.`);
    await generateAndUploadSinglePDF(supabase, ReceiptsPDF, baseProps, reportId, 'receipts')
    console.log(`[PDF_FLOW] 5.2: Generación ReceiptsPDF completada.`);
}

// --- HELPER GENÉRICO PARA UN PDF (RESTAURADA Y CORREGIDA) ---
async function generateAndUploadSinglePDF(
	supabase: any, 
	Component: React.ElementType, 
	props: any, 
	reportId: string, 
	suffix: 'summary' | 'detail' | 'receipts'
) {
    const element = React.createElement(Component, props);
    const pdfStream = await renderToStream(element); 
    
    // Convertir Stream a Buffer
    const chunks: Buffer[] = []; 
    for await (const chunk of pdfStream) {
        chunks.push(chunk as Buffer); 
    }
    const buffer = Buffer.concat(chunks);
    
    // 1. Definir rutas y nombres
    const fileId = generateSimpleId(); 
    const reportCodeName = props.report.code || props.report.name.replace(/\s/g, '_');
    const fileName = `${reportCodeName}_${suffix}_${fileId}.pdf`
    const filePath = `${props.report.user_id}/${reportId}/${fileName}`

    // 2. Subir a Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
        .from(REPORT_BUCKET)
        .upload(filePath, buffer, {
            contentType: 'application/pdf',
            upsert: true,
        })
    
    if (uploadError) {
        console.error(`Error al subir PDF (${suffix}):`, uploadError);
        throw new Error(`Fallo al subir el PDF de ${suffix}.`);
    }

    // 3. Obtener URL pública (o firmada)
    const { data: publicUrlData } = supabase.storage
        .from(REPORT_BUCKET)
        .getPublicUrl(filePath)
    
    const publicUrl = publicUrlData.publicUrl

    // 4. Actualizar URL en la tabla travel_reports
    const urlKey = `url_${suffix}`; 
    const { error: updateError } = await supabase
        .from('travel_reports')
        .update({ [urlKey]: publicUrl })
        .eq('id', reportId)

    if (updateError) {
        console.error(`Error al actualizar URL (${urlKey}):`, updateError);
        throw new Error(`Fallo al guardar la URL del PDF de ${suffix}.`);
    }
}


// --- 3. CAMBIO DE ESTADO (TIPADO) ---
export async function markAsSubmitted(reportId: string): Promise<ActionResponse> {
  const supabase = await createClient()
  const { error } = await supabase
	.from('travel_reports')
	.update({ status: 'submitted', submitted_at: new Date().toISOString() })
	.eq('id', reportId)

  if (error) return { success: false, error: "Error al marcar como enviado" }
  revalidatePath('/travel')
  return { success: true, message: "Reporte marcado como Enviado." }
}

export async function markAsPaidAndArchive(reportId: string): Promise<ActionResponse> {
  const supabase = await createClient()
  // ... (Tu código de limpieza de expenses receipt_url) ...

  const { error } = await supabase
	  .from('travel_reports')
	  .update({ status: 'paid', paid_at: new Date().toISOString() })
	  .eq('id', reportId)

  if (error) return { success: false, error: "Error al marcar como pagado" }
  revalidatePath('/travel')
  return { success: true, message: "Reporte marcado como Pagado y Archivado." }
}

export async function revertToDraft(reportId: string): Promise<ActionResponse> {
  const supabase = await createClient()
  const { error } = await supabase.from('travel_reports').update({ status: 'draft', submitted_at: null }).eq('id', reportId)
  if (error) return { success: false, error: "Error al revertir a borrador" }
  revalidatePath('/travel')
  return { success: true, message: "Reporte revertido a Borrador." }
}


// --- 6. ELIMINAR REPORTE (TIPADO Y MENSAJE MEJORADO) ---
export async function deleteReport(reportId: string): Promise<ActionResponse> {
  const supabase = await createClient()

  try {
	// 1. Obtener datos del reporte para limpiar archivos y validar estado
	const { data: report, error: fetchError } = await supabase
	  .from('travel_reports')
	  .select('*')
	  .eq('id', reportId)
	  .single()

	if (fetchError || !report) throw new Error("Reporte no encontrado")
    
	// Asignación segura del tipo
	const travelReport = report as TravelReport

	// Server-side validation: Solo permitimos borrar borradores
	if (travelReport.status !== 'draft') {
	  throw new Error("Solo se pueden eliminar reportes en estado Borrador")
	}

	// 2. Limpieza de Archivos en Storage
	const bucketName = REPORT_BUCKET // 'travel-reports'
	const filesToDelete: string[] = []

	if (travelReport.url_summary) filesToDelete.push(extractPath(travelReport.url_summary, bucketName))
	if (travelReport.url_detail) filesToDelete.push(extractPath(travelReport.url_detail, bucketName))
	if (travelReport.url_receipts) filesToDelete.push(extractPath(travelReport.url_receipts, bucketName))

	if (filesToDelete.length > 0) {
	  const validFiles = filesToDelete.filter(path => path.length > 0)
	  if (validFiles.length > 0) {
		const { error: storageError } = await supabase.storage.from(bucketName).remove(validFiles)
        if (storageError) console.error("Error limpiando storage:", storageError)
	  }
	}

	// 3. ROLLBACK VIAJES: 
	// Desvincular y marcar como 'closed' (para que puedan volver a reportarse).
	const targetStatus: TripDbStatus = 'closed'

	const { error: tripsError } = await supabase
	  .from('travel_trips')
	  .update({ 
		report_id: null, 
		status: targetStatus 
	  })
	  .eq('report_id', reportId)

	if (tripsError) throw new Error("Error restaurando viajes")

	// 4. ROLLBACK GASTOS:
	const { error: expensesError } = await supabase
	  .from('travel_expenses')
	  .update({ report_id: null })
	  .eq('report_id', reportId)

	if (expensesError) throw new Error("Error restaurando gastos")

	// 5. ELIMINAR EL REPORTE FINALMENTE
	const { error: deleteError } = await supabase
	  .from('travel_reports')
	  .delete()
	  .eq('id', reportId)

	if (deleteError) throw new Error("Error eliminando el registro del reporte")

	revalidatePath('/travel/reports')
	return { success: true, message: "Reporte eliminado y viajes revertidos a 'Cerrado'." }

  } catch (error: any) {
	console.error('Error deleting report:', error)
	const errorMessage = error.message.includes('Reporte no encontrado') 
	  ? error.message 
	  : error.message.includes('Solo se pueden eliminar')
        ? error.message
		: 'No se pudo eliminar el reporte. Causa: ' + error.message
	  
	return { success: false, error: errorMessage }
  }
}