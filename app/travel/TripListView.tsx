// app/travel/TripListView.tsx (INTEGRACIÓN FINAL)
'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner' 

import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { 
  Calendar, Briefcase, Search, FileText, List, 
  Image as ImageIcon, MoreVertical, Send, CheckCircle2, Undo, Loader2, Trash2, Tag, Plus 
} from 'lucide-react'
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog' 
import { NewReportDialog } from './NewReportDialog' 
import { NewTripDialog } from './NewTripDialog' // <-- USAMOS EL ORIGINAL
import { 
  TripWithTotals, 
  TravelReportWithDetails, 
  TravelEmployer,
  ActionResponse
} from '@/types/travel'
import { getTripState } from '@/utils/trip-logic'

// IMPORTAMOS LAS ACCIONES DE ESTADO Y BORRADO
import { 
  markAsSubmitted, 
  markAsPaidAndArchive, 
  revertToDraft,
  deleteReport
} from '@/app/travel/report-actions'

interface TripListViewProps {
  trips: TripWithTotals[]
  reports: TravelReportWithDetails[]
  employers: TravelEmployer[]
}

export function TripListView({ trips, reports, employers }: TripListViewProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isPending, startTransition] = useTransition()
  const [reportToDelete, setReportToDelete] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('active')

  // --- ACCIONES, FILTRADO Y RENDER CARDS (Sin cambios) ---
  const handleAction = async (action: string, reportId: string) => {
    startTransition(async () => {
        try {
            let result: ActionResponse = { success: false };

            if (action === 'submit') result = await markAsSubmitted(reportId);
            if (action === 'pay') result = await markAsPaidAndArchive(reportId);
            if (action === 'revert') result = await revertToDraft(reportId);
            
            if (result.success) {
              toast.success("Estado actualizado con éxito.");
            } else if (result.error) {
              toast.error(result.error);
            }
        } catch (error) {
            console.error("Error cambiando estado:", error);
            toast.error("Hubo un error al cambiar el estado.");
        }
    });
  }

  const handleConfirmDelete = async () => {
    if (!reportToDelete) return;
    
    startTransition(async () => {
      try {
        const result: ActionResponse = await deleteReport(reportToDelete);
        
        if (result.success) {
          toast.success("Reporte eliminado y viajes revertidos a 'Cerrado'.");
        } else if (result.error) {
          toast.error(result.error);
        }
      } catch (error) {
        console.error("Error en deleteReport:", error);
        toast.error("Ocurrió un error inesperado al borrar.");
      } finally {
        setReportToDelete(null);
      }
    });
  }

  const activeTrips = trips.filter(t => 
    ['planned', 'active', 'completed'].includes(t.visual_status)
  )

  const historyTrips = trips.filter(t => 
    ['closed', 'reported'].includes(t.visual_status) &&
    (t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     t.employer_name.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const RenderTripCard = ({ trip }: { trip: TripWithTotals }) => {
    const { label, color } = getTripState(trip); 
    const isClosed = ['closed', 'reported'].includes(trip.visual_status);
    const isReported = trip.visual_status === 'reported';
    const reportCode = trip.travel_reports?.code;
    
    return (
      <Link 
            href={`/travel/${trip.id}`} 
            className="block mb-3"
        >
        <Card className={`border-0 shadow-sm ring-1 ring-slate-200 rounded-xl overflow-hidden active:scale-[0.98] transition-all ${isClosed ? 'opacity-80 bg-slate-50' : 'bg-white'}`}>
          <CardContent className="p-0">
            <div className="p-4 pb-2 flex justify-between items-start gap-3">
              <div className="flex-1 min-w-0">
                <h3 className={`text-lg font-bold leading-tight mb-1 ${isClosed ? 'text-slate-600' : 'text-slate-800'}`}>{trip.name}</h3>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Briefcase className="h-3 w-3" /> 
                  <span className="font-medium">{trip.employer_name}</span>
                </div>
                
                {isReported && reportCode && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 mt-1">
                        <Tag className="h-3 w-3" />
                        <span>Reportado en: {reportCode}</span>
                    </div>
                )}
                
              </div>
              <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-1 rounded-full border uppercase tracking-wide ${color}`}>
                {label}
              </span>
            </div>
            <div className="mx-4 h-px bg-slate-100" />
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <div className={`p-1.5 rounded-md ${isClosed ? 'bg-slate-200' : 'bg-orange-50 text-orange-600'}`}><Calendar className="h-3.5 w-3.5" /></div>
                <div className="flex flex-col">
                    <span className="font-semibold text-slate-700">{new Date(trip.start_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                    <span className="text-[10px]">{new Date(trip.start_date).getFullYear()}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total</span>
                <span className={`text-lg font-black ${isClosed ? 'text-slate-600' : 'text-slate-900'}`}>{trip.total_amount.toFixed(2)} €</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    )
  }

  const RenderReportCard = ({ report }: { report: TravelReportWithDetails }) => {
    return (
      <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white mb-4">
        <div className="p-5 pb-3">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="text-lg font-bold text-slate-800 leading-tight">
                {report.code ? `[${report.code}] ${report.name}` : report.code}
              </h3>
              <p className="text-sm text-slate-500 font-medium flex items-center gap-2 mt-1">
                <Briefcase className="h-3.5 w-3.5" /> {report.employer_name}
              </p>
            </div>
            
            <div className="flex gap-3 text-right pl-2">
                <div>
                    <span className="block text-2xl font-black text-slate-900 tracking-tight">{report.total_amount.toFixed(2)}€</span>
                    <Badge variant="outline" className={`mt-1 border-0 font-bold uppercase tracking-wider text-[10px] ${
                        report.status === 'paid' ? 'bg-green-100 text-green-700' : 
                        report.status === 'submitted' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {report.status === 'draft' ? 'Borrador' : report.status === 'submitted' ? 'Enviado' : 'Pagado'}
                    </Badge>
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-slate-400 hover:text-slate-700">
                          <span>
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-5 w-5" />}
                          </span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      
                      {/* ACCIONES PARA BORRADOR */}
                      {report.status === 'draft' && (
                          <>
                            <DropdownMenuItem onClick={() => handleAction('submit', report.id)} className="text-blue-600 cursor-pointer">
                                <Send className="mr-2 h-4 w-4" /> Enviar a Aprobación
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                                onClick={() => setReportToDelete(report.id)}
                                className="text-red-600 focus:text-red-600 cursor-pointer"
                            >
                                <Trash2 className="mr-2 h-4 w-4" /> Eliminar Borrador
                            </DropdownMenuItem>
                          </>
                      )}

                      {/* ACCIONES PARA ENVIADO */}
                      {report.status === 'submitted' && (
                          <>
                              <DropdownMenuItem onClick={() => handleAction('pay', report.id)} className="text-green-600 cursor-pointer">
                                  <CheckCircle2 className="mr-2 h-4 w-4" /> Marcar como Pagado
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleAction('revert', report.id)} className="text-orange-600 cursor-pointer">
                                  <Undo className="mr-2 h-4 w-4" /> Corregir (Volver a Borrador)
                              </DropdownMenuItem>
                          </>
                      )}

                      {/* ACCIONES PARA PAGADO */}
                      {report.status === 'paid' && (
                          <DropdownMenuItem disabled className="text-slate-400">
                              <CheckCircle2 className="mr-2 h-4 w-4" /> Archivada y Pagada
                          </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
          </div>

          {/* BOTONES DE ACCIÓN (PDFs) */}
          <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
              {/* 1. RESUMEN */}
              {report.url_summary ? (
                  <a href={report.url_summary} target="_blank" rel="noopener noreferrer" className="flex-1">
                      <Button variant="outline" size="sm" className="w-full h-9 gap-2 text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100">
                          <FileText className="h-4 w-4" /> Resumen
                      </Button>
                  </a>
              ) : (
                  <Button disabled variant="ghost" size="sm" className="flex-1 h-9 gap-2 bg-slate-50 text-slate-400 border border-slate-100">
                      <FileText className="h-4 w-4" /> <span className="text-xs">Generando...</span>
                  </Button>
              )}

              {/* 2. DETALLE */}
              {report.url_detail ? (
                  <a href={report.url_detail} target="_blank" rel="noopener noreferrer" className="flex-1">
                      <Button variant="outline" size="sm" className="w-full h-9 gap-2 text-slate-700 border-slate-200 hover:bg-slate-50">
                          <List className="h-4 w-4" /> Detalle
                      </Button>
                  </a>
              ) : (
                  <Button disabled variant="ghost" size="sm" className="flex-1 h-9 gap-2 bg-slate-50 text-slate-400 border border-slate-100">
                      <List className="h-4 w-4" /> <span className="text-xs">--</span>
                  </Button>
              )}

              {/* 3. TICKETS */}
              <div className="flex-1">
                {report.url_receipts ? (
                    <a href={report.url_receipts} target="_blank" rel="noopener noreferrer" className="flex-1">
                      <Button variant="outline" size="sm" className="w-full h-9 gap-2 text-slate-700 border-slate-200 hover:bg-slate-50">
                          <ImageIcon className="h-4 w-4" /> Tickets
                      </Button>
                    </a>
                ) : (
                  <Button disabled variant="ghost" size="sm" className="flex-1 h-9 gap-2 text-slate-300 border border-transparent">
                      <ImageIcon className="h-4 w-4" /> <span className="text-xs">Sin Tickets</span>
                  </Button>
                )}
              </div>
          </div>
        </div>

        {/* ACORDEÓN VIAJES (Sin cambios) */}
        <Accordion type="single" collapsible className="w-full border-t border-slate-100">
           <AccordionItem value="trips" className="border-0">
             <AccordionTrigger className="px-5 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-xs font-semibold text-slate-500 uppercase tracking-wide hover:no-underline">
                 <span>Ver {report.trip_count} viajes incluidos</span>
             </AccordionTrigger>
             <AccordionContent className="bg-white p-0">
                 {report.trips_data && report.trips_data.length > 0 ? (
                    <ul className="divide-y divide-slate-100">
                         {report.trips_data.map((t: any) => (
                             <li key={t.id}>
                                <Link href={`/travel/${t.id}`} className="block">
                                <div className="px-5 py-3 flex justify-between items-center text-sm hover:bg-slate-50 transition-colors">
                                 <div>
                                    <span className="block text-slate-700 font-medium">{t.name}</span>
                                    <span className="text-[10px] text-slate-400 font-medium">
                                       {new Date(t.start_date).toLocaleDateString()}
                                    </span>
                                 </div>
                                </div>
                                </Link>
                             </li>
                         ))}
                    </ul>
                 ) : (
                     <p className="px-5 py-4 text-xs text-slate-400 italic text-center">No hay viajes vinculados.</p>
                 )}
             </AccordionContent>
           </AccordionItem>
        </Accordion>
      </Card>
    )
  }

  // --- RENDERIZADOR DE ACCIÓN CONTEXTUAL EN EL FOOTER (FINAL) ---
  const RenderFooterAction = () => {
    // 1. LÓGICA DE NUEVO REPORTE
    if (activeTab === 'reports') {
      return (
        <NewReportDialog 
            key="footer-report-action" // CLAVE AÑADIDA para forzar el renderizado
            employers={employers} 
        />
      );
    }

    // 2. LÓGICA DE NUEVO VIAJE (ACTIVOS / HISTORIAL)
    return (
        <NewTripDialog 
            key="footer-trip-action" // CLAVE AÑADIDA para forzar el renderizado
            employers={employers} 
        />
    );
  }

  // --- COMPONENTE PRINCIPAL ---
  return (
    <>
      <Tabs defaultValue="active" className="w-full" onValueChange={(value) => {
        setActiveTab(value);
      }}>
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="active">Activos ({activeTrips.length})</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
          <TabsTrigger value="reports">Informes</TabsTrigger>
        </TabsList>
        
        {/* --- TABS CONTENT (Sin cambios) --- */}
        <TabsContent value="active" className="space-y-4 min-h-[300px]">
          {activeTrips.length > 0 ? activeTrips.map(trip => <RenderTripCard key={trip.id} trip={trip} />) : (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-200">
              <p className="text-slate-400 text-sm">Todo al día. No hay viajes pendientes.</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="history" className="space-y-4">
          <div className="relative mb-4 flex justify-start items-center">
              <div className='relative flex-1 mr-0'> 
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                    placeholder="Buscar en el historial..." 
                    className="pl-9 bg-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
          </div>
          {historyTrips.length > 0 ? historyTrips.map(trip => <RenderTripCard key={trip.id} trip={trip} />) : (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-200">
              <p className="text-slate-400 text-sm">Historial vacío.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
            {reports.length > 0 ? (
              <div className="space-y-4">
                {reports.map((report) => (
                  <RenderReportCard key={report.id} report={report} />
                ))}
              </div>
            ) : (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-200">
                  <p className="text-slate-400 text-sm">No has generado ninguna hoja aún.</p>
                </div>
            )}
        </TabsContent>
      </Tabs>
      
      {/* --- FOOTER DE ACCIÓN FIJA --- */}
      <div className="fixed bottom-0 left-0 right-0 p-4 border-t bg-background shadow-lg z-20">
        <div className="max-w-xl mx-auto">
             <RenderFooterAction />
        </div>
      </div>

      <div className="h-20"></div>
      
      {/* --- DIÁLOGO DE CONFIRMACIÓN DE BORRADO --- */}
      <AlertDialog open={!!reportToDelete} onOpenChange={() => setReportToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este Reporte?</AlertDialogTitle>
            
            {/* 1. TEXTO INTRODUCTORIO (Contenedor <p> implícito de AlertDialogDescription) */}
            <AlertDialogDescription>Esta acción es <b>irreversible</b> y tiene las siguientes consecuencias:</AlertDialogDescription>
            
            {/* 2. LISTA DE CONSECUENCIAS (MOVEMOS LA LISTA FUERA DEL <p> IMPLÍCITO) */}
            <div className="text-muted-foreground text-sm mt-4"> {/* Mantenemos el estilo de texto */}
              <ul className="list-disc pl-5 space-y-1 text-left">
                <li>El reporte se eliminará permanentemente (incluyendo los PDFs asociados).</li>
                <li>Los viajes incluidos pasarán a estado <b>"Cerrado"</b> y podrán ser reportados de nuevo.</li>
                <li>Los gastos quedarán desvinculados del reporte.</li>
              </ul>
            </div>
            
            {/* 3. TEXTO DE CIERRE (Usamos otra etiqueta <p> para el final) */}
            <AlertDialogDescription className="pt-3">¿Deseas continuar?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e: any) => { 
                e.preventDefault();
                handleConfirmDelete();
              }} disabled={isPending} className="bg-red-600 hover:bg-red-700 text-white">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              {isPending ? "Eliminando..." : "Confirmar Eliminación"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}