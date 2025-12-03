import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { ArrowLeft } from 'lucide-react'
import { redirect } from 'next/navigation'
import { PrintButton } from './PrintButton'

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // 1. Datos Generales
  const { data: report } = await supabase
    .from('travel_reports')
    .select('*, travel_employers(name)')
    .eq('id', id)
    .single()

  if (!report) redirect('/travel')

  // 2. Obtener Gastos
  const { data: trips } = await supabase
    .from('travel_trips')
    .select(`
      id, name, 
      travel_expenses (
        id, date, concept, amount, mileage_distance, receipt_url, is_reimbursable,
        travel_categories ( name )
      )
    `)
    .eq('report_id', id)

  // 3. PROCESAMIENTO DE DATOS
  // Aplanamos todos los gastos en una sola lista
  let allExpenses: any[] = []
  trips?.forEach(trip => {
    trip.travel_expenses.forEach((expense: any) => {
      allExpenses.push({ ...expense, tripName: trip.name })
    })
  })

  // CONFIGURACIÓN DE FILAS (El orden exacto de tu PDF)
  // La clave es el nombre en tu DB, el valor es el nombre en el PDF
  const categoryMap: Record<string, string> = {
    'Kilometraje': 'KILOMETRAJE',
    'Autopistas y Parking': 'AUTOPISTAS / PARKING',
    'Billetes': 'BILLETES (Avión/Tren)',
    'Dietas/Comidas': 'COMIDAS / DIETAS',
    'Hotel': 'HOTELES',
    'Taxis': 'TAXIS',
    'Varios': 'VARIOS'
  }

  // Estructura para sumar totales
  const summary: Record<string, { propio: number, empresa: number, total: number }> = {}
  const orderedKeys = Object.keys(categoryMap)

  // Inicializamos a 0
  orderedKeys.forEach(k => summary[k] = { propio: 0, empresa: 0, total: 0 })

  let totalPropio = 0
  let totalEmpresa = 0

  // Sumamos
  allExpenses.forEach(exp => {
    let catKey = exp.travel_categories?.name || 'Varios'
    
    // Normalización de nombres por si acaso
    if (!summary[catKey]) {
        // Intento de matching parcial si no coincide exacto
        if (catKey.includes('Peaje') || catKey.includes('Parking')) catKey = 'Autopistas y Parking'
        else if (catKey.includes('Transporte') || catKey.includes('Taxi')) catKey = 'Taxis'
        else if (catKey.includes('Billete')) catKey = 'Billetes'
        else catKey = 'Varios'
    }

    if (summary[catKey]) {
        const amount = exp.amount || 0
        summary[catKey].total += amount
        if (exp.is_reimbursable) {
            summary[catKey].propio += amount
            totalPropio += amount
        } else {
            summary[catKey].empresa += amount
            totalEmpresa += amount
        }
    }
  })

  // Agrupamos para el detalle (Listado debajo del resumen)
  const groupedForDetail: Record<string, any[]> = {}
  allExpenses.forEach(exp => {
      let catName = categoryMap[exp.travel_categories?.name] || categoryMap['Varios']
      // Normalización rápida para visualización
      const key = exp.travel_categories?.name
      if(key?.includes('Peaje')) catName = categoryMap['Autopistas y Parking']
      if(key?.includes('Taxi')) catName = categoryMap['Taxis']
      
      if (!groupedForDetail[catName]) groupedForDetail[catName] = []
      groupedForDetail[catName].push(exp)
  })

  // Filtrar fotos para el anexo
  const receipts = allExpenses.filter(e => e.receipt_url)

  // Nombre del empleado (Hardcodeado o sacado del perfil)
  const employeeName = "Jesús Alonso" 
  const reportDate = new Date(report.created_at)
  const reportMonthYear = reportDate.toLocaleDateString('es-ES', { month: '2-digit', year: 'numeric' }).replace('/', ' ')

  return (
    <div className="min-h-screen bg-slate-100 font-sans pb-24 print:bg-white print:pb-0 print:m-0 print:p-0 print:overflow-visible">
      
      {/* HEADER NAVEGACIÓN (Oculto al imprimir) */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 shadow-sm print:hidden flex justify-between items-center">
         <div className="flex items-center gap-3">
            <Link href="/travel"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
            <h1 className="text-sm font-bold text-slate-800">Vista Previa Hoja de Gastos</h1>
         </div>
         <PrintButton />
      </div>

      {/* TRUCO PARA MÓVIL: 
          print:min-w-[1024px] -> Fuerza a que el contenedor sea ANCHO aunque la pantalla sea estrecha.
          print:absolute print:top-0 print:left-0 -> Lo saca del flujo normal para evitar scrollbars raros.
          print:scale-[0.6] md:print:scale-100 -> Opcional: si en tu móvil sale cortado, el navegador suele tener opción de "Escala".
          Pero lo mejor es forzar el ancho.
      */}
      <main className="max-w-[210mm] mx-auto p-4 md:p-8 print:p-0 print:m-0 print:w-[210mm] print:max-w-none print:absolute print:top-0 print:left-0">
        
        {/* --- PÁGINA 1: LA HOJA "FEA" (OFICIAL) --- */}
        <div className="bg-white shadow-lg p-6 md:p-10 min-h-[297mm] print:shadow-none print:p-10 print:min-h-0 text-black font-mono text-sm leading-tight print:w-[210mm]">
            
            {/* ... (Todo el contenido interior de la hoja sigue IGUAL que antes) ... */}
            {/* CABECERA CUADRICULADA */}
            <div className="border border-black mb-6">
                <div className="flex border-b border-black">
                    <div className="w-32 bg-slate-100 border-r border-black p-2 font-bold uppercase">Nombre:</div>
                    <div className="flex-1 p-2 font-bold">{employeeName}</div>
                </div>
                <div className="flex border-b border-black">
                    <div className="w-32 bg-slate-100 border-r border-black p-2 font-bold uppercase">Número:</div>
                    <div className="flex-1 p-2">JA {reportMonthYear}</div>
                </div>
                <div className="flex">
                    <div className="w-32 bg-slate-100 border-r border-black p-2 font-bold uppercase">Concepto:</div>
                    <div className="flex-1 p-2">{(report.travel_employers as any)?.name} - {report.name}</div>
                </div>
            </div>

            {/* TÍTULO */}
            <div className="text-center font-bold text-xl uppercase mb-6 underline">
                Gastos de Viaje
            </div>

            {/* TABLA PRINCIPAL */}
            <table className="w-full border-collapse border border-black mb-8 text-xs">
                <thead>
                    <tr className="bg-slate-200">
                        <th className="border border-black p-2 text-left w-1/3">CONCEPTO</th>
                        <th className="border border-black p-2 text-right w-1/4">PROPIO</th>
                        <th className="border border-black p-2 text-right w-1/4">EMPRESA</th>
                        <th className="border border-black p-2 text-right w-1/4">TOTAL</th>
                    </tr>
                </thead>
                <tbody>
                    {orderedKeys.map(key => {
                        const row = summary[key]
                        const label = categoryMap[key]
                        return (
                            <tr key={key}>
                                <td className="border border-black p-2 font-bold">{label}</td>
                                <td className="border border-black p-2 text-right">{row.propio > 0 ? row.propio.toFixed(2) : '-'}</td>
                                <td className="border border-black p-2 text-right">{row.empresa > 0 ? row.empresa.toFixed(2) : '-'}</td>
                                <td className="border border-black p-2 text-right font-bold bg-slate-50">{row.total > 0 ? row.total.toFixed(2) : '-'}</td>
                            </tr>
                        )
                    })}
                    <tr className="bg-slate-200 font-bold border-t-2 border-black">
                        <td className="border border-black p-2">TOTALES</td>
                        <td className="border border-black p-2 text-right">{totalPropio.toFixed(2)}</td>
                        <td className="border border-black p-2 text-right">{totalEmpresa.toFixed(2)}</td>
                        <td className="border border-black p-2 text-right text-base">{(totalPropio + totalEmpresa).toFixed(2)} €</td>
                    </tr>
                </tbody>
            </table>

            {/* RESUMEN DE PAGO */}
            <div className="flex justify-end mb-10">
                <div className="w-full md:w-1/2 border border-black">
                    <div className="bg-slate-200 border-b border-black p-2 font-bold text-center">RESUMEN LIQUIDACIÓN</div>
                    <div className="flex justify-between p-2 border-b border-black border-dashed">
                        <span>Total Gastado:</span>
                        <span>{(totalPropio + totalEmpresa).toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between p-2 border-b border-black border-dashed text-slate-500">
                        <span>(-) Pagado por Empresa:</span>
                        <span>{totalEmpresa.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between p-3 font-black text-lg bg-slate-50">
                        <span>A REEMBOLSAR:</span>
                        <span>{totalPropio.toFixed(2)} €</span>
                    </div>
                </div>
            </div>

            {/* FIRMAS */}
            <div className="flex justify-between mt-12 pt-12">
                <div className="w-1/3 text-center border-t border-black pt-2">
                    <p className="font-bold">Firma del Empleado</p>
                    <p className="text-xs mt-10">{new Date().toLocaleDateString()}</p>
                </div>
                <div className="w-1/3 text-center border-t border-black pt-2">
                    <p className="font-bold">Vº Bº Empresa</p>
                </div>
            </div>
        </div>

        {/* --- PÁGINA 2: DETALLE --- */}
        <div className="mt-8 print:break-before-page bg-white shadow-lg p-6 md:p-10 print:shadow-none print:p-10 print:min-h-0 text-black font-sans print:w-[210mm]">
            <h2 className="text-xl font-bold border-b-2 border-black pb-2 mb-6 uppercase">Detalle de Movimientos</h2>
            {/* ... (Contenido de detalle igual) ... */}
            {Object.keys(groupedForDetail).map((catName) => {
               if(groupedForDetail[catName].length === 0) return null
               return (
                 <div key={catName} className="mb-6 break-inside-avoid">
                    <h3 className="font-bold bg-slate-100 p-1 pl-2 text-sm border-l-4 border-black mb-2">{catName}</h3>
                    <table className="w-full text-xs text-left">
                        <thead>
                            <tr className="border-b border-slate-300 text-slate-500">
                                <th className="py-1 w-20">Fecha</th>
                                <th className="py-1">Concepto</th>
                                <th className="py-1 text-right w-24">Importe</th>
                            </tr>
                        </thead>
                        <tbody>
                            {groupedForDetail[catName].map(e => (
                                <tr key={e.id} className="border-b border-slate-100">
                                    <td className="py-1">{new Date(e.date).toLocaleDateString()}</td>
                                    <td className="py-1">
                                        {e.concept} <span className="text-slate-400 italic">({e.tripName})</span>
                                        {e.mileage_distance && <span className="ml-2 bg-slate-100 px-1 rounded">{e.mileage_distance} km</span>}
                                    </td>
                                    <td className="py-1 text-right font-mono">
                                        {e.amount.toFixed(2)} {e.is_reimbursable ? '' : '(Visa)'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
               )
            })}
        </div>

        {/* --- PÁGINA 3: ANEXO DE TICKETS --- */}
        {receipts.length > 0 && (
            <div className="mt-8 print:break-before-page bg-white shadow-lg p-6 md:p-10 print:shadow-none print:p-10 text-black print:w-[210mm]">
                <h2 className="text-xl font-bold text-slate-900 mb-6 border-b-2 border-black pb-2 uppercase">Anexo: Justificantes</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:grid-cols-2"> {/* Forzamos 2 columnas al imprimir */}
                    {/* ... (Contenido de tickets igual) ... */}
                    {receipts.map(rec => (
                        <div key={rec.id} className="break-inside-avoid border border-slate-300 rounded p-2">
                            <div className="mb-2 pb-1 border-b border-slate-200 text-xs font-bold flex justify-between">
                                <span className="truncate pr-2">{rec.concept}</span>
                                <span>{rec.amount}€</span>
                            </div>
                            <div className="flex justify-center bg-slate-50 min-h-[200px] items-center">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img 
                                    src={rec.receipt_url} 
                                    alt="Ticket" 
                                    className="max-w-full max-h-[400px] object-contain" 
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

      </main>
    </div>
  )
}