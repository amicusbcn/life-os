// app/travel/NewReportDialog.tsx (CONTROL MANUAL: FIX DEL ASCHILD)
'use client'

import { useState, useEffect, useTransition } from 'react'
import { getReportCandidates, createReport } from '@/app/travel/report-actions' 
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { FileText, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from 'sonner' 

// IMPORTAMOS TIPOS CENTRALIZADOS
import { TravelEmployer, ReportCandidatesResponse, ActionResponse } from '@/types/travel'

export function NewReportDialog({ employers }: { employers: TravelEmployer[] }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [selectedEmployer, setSelectedEmployer] = useState('')
  const [reportName, setReportName] = useState('')
  const [reportCode, setReportCode] = useState('')
  const [isPending, startTransition] = useTransition()
  
  const [candidates, setCandidates] = useState<ReportCandidatesResponse | null>(null)
  const [selectedTrips, setSelectedTrips] = useState<string[]>([])

  // Lógica de inicialización
  useEffect(() => {
  	if (open) {
  	  setStep(1)
  	  setCandidates(null)
  	  setSelectedTrips([])
  	  const date = new Date()
  	  const month = date.toLocaleString('es-ES', { month: 'long' })
  	  setReportName(`Gastos ${month.charAt(0).toUpperCase() + month.slice(1)} ${date.getFullYear()}`)
  	  setReportCode('')
  	}
  }, [open])

  // PASO 1 -> 2: Buscar candidatos
  function handleNext() {
  	if (!selectedEmployer || !reportName) return
  	
  	startTransition(async () => {
  	  	const res = await getReportCandidates(selectedEmployer)
  	  	setCandidates(res) 
  	  	
  	  	if (res && res.ready) {
  	  	  	setSelectedTrips(res.ready.map(t => t.id))
  	  	}
  	  	setStep(2)
  	})
  }

  // ELIMINAMOS handleCreate y lo reemplazamos por formAction para usar FormData
  const formAction = async (formData: FormData) => {
  	  // Validación anticipada: Si el estado local dice que no hay viajes, no enviamos.
  	  if (selectedTrips.length === 0) {
          toast.error("Debes seleccionar al menos un viaje.");
          return;
      }

  	  // Paso clave: Añadir el array de IDs serializado a FormData
  	  formData.set('tripIds', JSON.stringify(selectedTrips)); 
      
  	  startTransition(async () => {
  	  	  // createReport ahora solo espera 1 argumento (FormData)
  	  	  const res = await createReport(formData); 
  	  	  
  	  	  if (res?.success) {
  	  	  	  toast.success(res.message || 'Hoja de gastos generada con éxito.');
  	  	  	  setOpen(false);
  	  	  } else {
  	  	  	  toast.error(res?.error || "Error al crear la hoja.");
  	  	  }
  	  });
  }


  return (
  	<>
  	  	{/* EL BOTÓN AHORA GESTIONA EL ESTADO DIRECTAMENTE */}
  	  	<Button 
  	  	  	className="w-full h-12 gap-2" 
  	  	  	size="lg" 
  	  	  	variant="default" // Estilo azul
  	  	  	onClick={() => setOpen(true)} // <-- Abre el diálogo
  	  	>
  	  	  	<FileText className="h-5 w-5" /> Nueva Hoja
  	  	</Button>

  	  	{/* EL DIÁLOGO SE RENDERIZA CONDICIONALMENTE POR EL ESTADO 'open' */}
  	  	<Dialog open={open} onOpenChange={setOpen}>
  	  	  <DialogContent className="sm:max-w-[500px]">
  	  	  	<DialogHeader>
  	  	  	  	<DialogTitle>Generar Hoja de Gastos</DialogTitle>
  	  	  	</DialogHeader>

  	  	  	{step === 1 && (
  	  	  	  	<div className="space-y-4 py-4">
  	  	  	  	  	{/* ... (Contenido del Paso 1) ... */}
  	  	  	  	  	<div className="grid gap-2">
  	  	  	  	  	  	<Label htmlFor="employer-select">1. ¿A quién vas a facturar?</Label>
  	  	  	  	  	  	<Select onValueChange={setSelectedEmployer} value={selectedEmployer}>
  	  	  	  	  	  	  	<SelectTrigger id="employer-select">
  	  	  	  	  	  	  	  	<SelectValue placeholder="Selecciona empresa..." />
  	  	  	  	  	  	  	</SelectTrigger>
  	  	  	  	  	  	  	<SelectContent>
  	  	  	  	  	  	  	  	{employers.map(e => (
  	  	  	  	  	  	  	  	  	<SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
  	  	  	  	  	  	  	  	))}
  	  	  	  	  	  	  	</SelectContent>
  	  	  	  	  	  	</Select>
  	  	  	  	  	</div>
  	  	  	  	  	
  	  	  	  	  	<div className="grid gap-2">
  	  	  	  	  	  	<Label htmlFor="report-name">Nombre de la Hoja</Label>
  	  	  	  	  	  	<Input id="report-name" value={reportName} onChange={(e) => setReportName(e.target.value)} />
  	  	  	  	  	</div>
  	  	  	  	  	
  	  	  	  	  	<div className="grid gap-2">
  	  	  	  	  	  	<Label htmlFor="report-code">Código / Referencia (Opcional)</Label>
  	  	  	  	  	  	<Input 
  	  	  	  	  	  	  	id="report-code" 
  	  	  	  	  	  	  	placeholder="Ej: BAI-25-11"
  	  	  	  	  	  	  	value={reportCode} 
  	  	  	  	  	  	  	onChange={(e) => setReportCode(e.target.value)} 
  	  	  	  	  	  	/>
  	  	  	  	  	</div>

  	  	  	  	  	<Button 
  	  	  	  	  	  	className="w-full mt-4 gap-2" 
  	  	  	  	  	  	onClick={handleNext} 
  	  	  	  	  	  	disabled={!selectedEmployer || !reportName || isPending}
  	  	  	  	  	>
  	  	  	  	  	  	{isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continuar"}
  	  	  	  	  	</Button>
  	  	  	  	</div>
  	  	  	)}
  	  	  	
            {/* INICIO DEL PASO 2: FORMULARIO CON SUBMIT A SERVER ACTION */}
  	  	  	{step === 2 && candidates && (
  	  	  	  	<form action={formAction}> {/* <-- FORMULARIO HTML, usa formAction */}
  	  	  	  	  	<div className="space-y-4 py-2">

                        {/* INPUTS OCULTOS para los datos del Paso 1 */}
                        <input type="hidden" name="employerId" value={selectedEmployer} />
                        <input type="hidden" name="reportName" value={reportName} />
                        <input type="hidden" name="reportCode" value={reportCode} />
                        {/* Input Oculto para el ARRAY de IDs (Se rellena en formAction) */}
                        <input type="hidden" name="tripIds" value={JSON.stringify(selectedTrips)} />


  	  	  	  	  	  	{candidates.warnings.length > 0 && (
  	  	  	  	  	  	  	<div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
  	  	  	  	  	  	  	  	<div className="flex items-center gap-2 text-orange-700 font-bold mb-2">
  	  	  	  	  	  	  	  	  	<AlertTriangle className="h-4 w-4" />
  	  	  	  	  	  	  	  	  	¡Atención! Viajes sin cerrar
  	  	  	  	  	  	  	  	</div>
  	  	  	  	  	  	  	  	<p className="text-orange-600 mb-2 text-xs">
  	  	  	  	  	  	  	  	  	Estos viajes ya han pasado pero siguen "Abiertos". Deberías revisarlos y cerrarlos antes de incluirlos.
  	  	  	  	  	  	  	  	</p>
  	  	  	  	  	  	  	  	<ul className="space-y-1">
  	  	  	  	  	  	  	  	  	{candidates.warnings.map(trip => (
  	  	  	  	  	  	  	  	  	  	<li key={trip.id} className="flex items-center justify-between bg-white/50 p-1.5 rounded border border-orange-100">
  	  	  	  	  	  	  	  	  	  	  	<span className="font-medium text-slate-700">{trip.name}</span>
  	  	  	  	  	  	  	  	  	  	  	<a href={`/travel/${trip.id}`} target="_blank" className="text-[10px] underline text-indigo-600">
  	  	  	  	  	  	  	  	  	  	  	  	Ir al viaje
  	  	  	  	  	  	  	  	  	  	  	</a>
  	  	  	  	  	  	  	  	  	  	</li>
  	  	  	  	  	  	  	  	  	))}
  	  	  	  	  	  	  	  	</ul>
  	  	  	  	  	  	  	</div>
  	  	  	  	  	  	)}

  	  	  	  	  	  	<div>
  	  	  	  	  	  	  	<Label className="mb-2 block">Viajes listos para incluir:</Label>
  	  	  	  	  	  	  	{candidates.ready.length === 0 ? (
  	  	  	  	  	  	  	  	<p className="text-sm text-slate-400 italic">No hay viajes cerrados disponibles.</p>
  	  	  	  	  	  	  	) : (
  	  	  	  	  	  	  	  	<div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
  	  	  	  	  	  	  	  	  	{candidates.ready.map(trip => (
  	  	  	  	  	  	  	  	  	  	<div key={trip.id} className="flex items-center space-x-2 border p-2 rounded hover:bg-slate-50">
  	  	  	  	  	  	  	  	  	  	  	<Checkbox 
  	  	  	  	  	  	  	  	  	  	  	  	id={trip.id} 
  	  	  	  	  	  	  	  	  	  	  	  	checked={selectedTrips.includes(trip.id)}
  	  	  	  	  	  	  	  	  	  	  	  	onCheckedChange={(checked) => {
  	  	  	  	  	  	  	  	  	  	  	  	  	if(checked) setSelectedTrips([...selectedTrips, trip.id])
  	  	  	  	  	  	  	  	  	  	  	  	  	else setSelectedTrips(selectedTrips.filter(id => id !== trip.id))
  	  	  	  	  	  	  	  	  	  	  	  	}}
  	  	  	  	  	  	  	  	  	  	/>
  	  	  	  	  	  	  	  	  	  	<label htmlFor={trip.id} className="flex-1 text-sm font-medium leading-none cursor-pointer">
  	  	  	  	  	  	  	  	  	  	  	{trip.name}
  	  	  	  	  	  	  	  	  	  	  	<span className="block text-[10px] text-slate-400 font-normal mt-0.5">
  	  	  	  	  	  	  	  	  	  	  	  	{trip.start_date}
  	  	  	  	  	  	  	  	  	  	  	</span>
  	  	  	  	  	  	  	  	  	  	</label>
  	  	  	  	  	  	  	  	  	  	<CheckCircle2 className="h-4 w-4 text-green-500" />
  	  	  	  	  	  	  	  	  	</div>
  	  	  	  	  	  	  	  	))}
  	  	  	  	  	  	  	</div>
  	  	  	  	  	  	  	)}
  	  	  	  	  	  	</div>

  	  	  	  	  	  	<Button 
  	  	  	  	  	  	  	type="submit" 
  	  	  	  	  	  	  	className="w-full mt-4 gap-2" 
  	  	  	  	  	  	  	disabled={selectedTrips.length === 0 || isPending}
  	  	  	  	  	  	>
  	  	  	  	  	  	  	{isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generar Hoja"} ({selectedTrips.length} viajes)
  	  	  	  	  	  	</Button>
  	  	  	  	  	  	
  	  	  	  	  	  	<Button 
  	  	  	  	  	  	  	type="button" 
  	  	  	  	  	  	  	onClick={() => setStep(1)} 
  	  	  	  	  	  	  	variant="ghost" 
  	  	  	  	  	  	  	className="w-full"
  	  	  	  	  	  	>
  	  	  	  	  	  	  	Volver
  	  	  	  	  	  	</Button>
  	  	  	  	  	</div>
  	  	  	  	</form>
  	  	  	)}
  	  	  	
  	  	</DialogContent>
  	  	</Dialog>
  	</>
  )
}