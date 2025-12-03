'use client'

import { useState, useEffect } from 'react'
import { getReportCandidates, createReport } from './report-actions'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { FileText, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react'
import { Checkbox } from "@/components/ui/checkbox"

interface Employer { id: string; name: string }

export function NewReportDialog({ employers }: { employers: Employer[] }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(1) // 1: Elegir Empresa, 2: Revisar Viajes
  const [selectedEmployer, setSelectedEmployer] = useState('')
  const [reportName, setReportName] = useState('')
  
  // Datos cargados
  const [candidates, setCandidates] = useState<{ ready: any[], warnings: any[] } | null>(null)
  const [selectedTrips, setSelectedTrips] = useState<string[]>([])

  // Al abrir, reseteamos
  useEffect(() => {
    if (open) {
      setStep(1)
      setCandidates(null)
      setSelectedTrips([])
      // Nombre por defecto: Hoja Gastos MES AÑO
      const date = new Date()
      const month = date.toLocaleString('es-ES', { month: 'long' })
      setReportName(`Gastos ${month.charAt(0).toUpperCase() + month.slice(1)} ${date.getFullYear()}`)
    }
  }, [open])

  // PASO 1 -> 2: Buscar candidatos
  async function handleNext() {
    if (!selectedEmployer) return
    const res = await getReportCandidates(selectedEmployer)
    setCandidates(res)
    // Por defecto seleccionamos todos los READY
    setSelectedTrips(res.ready.map(t => t.id))
    setStep(2)
  }

  // PASO 2: Confirmar y Crear
  async function handleCreate() {
    const res = await createReport(selectedEmployer, reportName, selectedTrips)
    if (res?.success) setOpen(false)
    else alert(res?.error)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-dashed">
          <FileText className="h-4 w-4" /> Nueva Hoja
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Generar Hoja de Gastos</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4 py-4">
             <div className="grid gap-2">
                <Label>1. ¿A quién vas a facturar?</Label>
                <Select onValueChange={setSelectedEmployer}>
                  <SelectTrigger>
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
                <Label>Nombre de la Hoja</Label>
                <Input value={reportName} onChange={(e) => setReportName(e.target.value)} />
             </div>

             <Button className="w-full mt-2" onClick={handleNext} disabled={!selectedEmployer}>
               Continuar <ArrowRight className="h-4 w-4 ml-2" />
             </Button>
          </div>
        )}

        {step === 2 && candidates && (
          <div className="space-y-4 py-2">
            
            {/* SECCIÓN ALERTAS (WARNINGS) */}
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

            {/* SECCIÓN LISTOS (READY) */}
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

            <Button className="w-full mt-4" onClick={handleCreate} disabled={selectedTrips.length === 0}>
              Generar Hoja ({selectedTrips.length} viajes)
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}