// app/travel/components/dialogs/NewReportDialog.tsx
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
import { TravelEmployer, ReportCandidatesResponse, TravelContext } from '@/types/travel' // <-- Context añadido
import { ActionResponse } from '@/types/common'

interface NewReportDialogProps {
  employers: TravelEmployer[]
  context: TravelContext // <-- Prop añadida para consistencia
}

export function NewReportDialog({ employers, context }: NewReportDialogProps) {
    const [open, setOpen] = useState(false)
    const [step, setStep] = useState(1)
    const [selectedEmployer, setSelectedEmployer] = useState('')
    const [reportName, setReportName] = useState('')
    const [reportCode, setReportCode] = useState('')
    const [isPending, startTransition] = useTransition()
    
    const [candidates, setCandidates] = useState<ReportCandidatesResponse | null>(null)
    const [selectedTrips, setSelectedTrips] = useState<string[]>([])

    // 1. Efecto de limpieza e inicialización
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

    // 2. Paso 1 -> 2: Buscar candidatos
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

    // 3. Envío final mediante Server Action
    const formAction = async (formData: FormData) => {
        if (selectedTrips.length === 0) {
            toast.error("Debes seleccionar al menos un viaje.");
            return;
        }

        // Sincronización de estado: Serializamos los IDs seleccionados
        formData.set('tripIds', JSON.stringify(selectedTrips)); 
        // Pasamos el contexto al servidor por si la acción necesita validar algo
        formData.set('context', context); 
      
        startTransition(async () => {
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
            <Button 
                className="w-full h-12 gap-2" 
                size="lg" 
                variant="default"
                onClick={() => setOpen(true)}
            >
                <FileText className="h-5 w-5" /> Nueva Hoja
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Generar Hoja de Gastos</DialogTitle>
                    </DialogHeader>

                    {step === 1 && (
                        <div className="space-y-4 py-4">
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
                    
                    {step === 2 && candidates && (
                        <form action={formAction}>
                            <div className="space-y-4 py-2">
                                {/* INPUTS OCULTOS - REGLA DE ORO 4 */}
                                <input type="hidden" name="employerId" value={selectedEmployer} />
                                <input type="hidden" name="reportName" value={reportName} />
                                <input type="hidden" name="reportCode" value={reportCode} />
                                <input type="hidden" name="context" value={context} />

                                {candidates.warnings.length > 0 && (
                                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
                                        <div className="flex items-center gap-2 text-orange-700 font-bold mb-2">
                                            <AlertTriangle className="h-4 w-4" />
                                            Viajes sin cerrar
                                        </div>
                                        <p className="text-orange-600 mb-2 text-xs">
                                            Recomendamos cerrar estos viajes antes de reportarlos.
                                        </p>
                                    </div>
                                )}

                                <div>
                                    <Label className="mb-2 block">Selecciona viajes ({selectedTrips.length}):</Label>
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
                                                    <span className="block text-[10px] text-slate-400 mt-0.5">{trip.start_date}</span>
                                                </label>
                                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <Button 
                                    type="submit" 
                                    className="w-full mt-4 gap-2" 
                                    disabled={selectedTrips.length === 0 || isPending}
                                >
                                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generar Hoja"}
                                </Button>
                                
                                <Button 
                                    type="button" 
                                    onClick={() => setStep(1)} 
                                    variant="ghost" 
                                    className="w-full text-slate-500"
                                >
                                    Volver al paso anterior
                                </Button>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </>
    )
}