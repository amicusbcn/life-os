// app/travel/components/sheets/NewReportSheet.tsx
'use client'

import { useState, useEffect, useTransition } from 'react'
import { getReportCandidates, createReport } from '@/app/travel/report-actions' 
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetDescription,
} from "@/components/ui/sheet"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { FileText, AlertTriangle, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react'
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from 'sonner' 

import { TravelEmployer, ReportCandidatesResponse, TravelContext } from '@/types/travel'

interface NewReportSheetProps {
    employers: TravelEmployer[]
    context: TravelContext
    children?: React.ReactNode
}

export function NewReportSheet({ employers, context, children }: NewReportSheetProps) {
    const [open, setOpen] = useState(false)
    const [step, setStep] = useState(1)
    const [selectedEmployer, setSelectedEmployer] = useState('')
    const [reportName, setReportName] = useState('')
    const [reportCode, setReportCode] = useState('')
    const [isPending, startTransition] = useTransition()
    
    const [candidates, setCandidates] = useState<ReportCandidatesResponse | null>(null)
    const [selectedTrips, setSelectedTrips] = useState<string[]>([])

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

    function handleNext() {
        if (!selectedEmployer || !reportName) return
        startTransition(async () => {
            const res = await getReportCandidates(selectedEmployer)
            setCandidates(res) 
            if (res?.ready) setSelectedTrips(res.ready.map(t => t.id))
            setStep(2)
        })
    }

    const formAction = async (formData: FormData) => {
        if (selectedTrips.length === 0) {
            toast.error("Debes seleccionar al menos un viaje.")
            return
        }

        formData.set('tripIds', JSON.stringify(selectedTrips))
        formData.set('context', context)
      
        startTransition(async () => {
            const res = await createReport(formData)
            if (res?.success) {
                toast.success(res.message || 'Hoja generada con éxito.')
                setOpen(false)
            } else {
                toast.error(res?.error || "Error al crear la hoja.")
            }
        })
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                {children || (
                    <Button variant="outline" className="gap-2">
                        <FileText className="h-4 w-4" /> Generar Hoja
                    </Button>
                )}
            </SheetTrigger>
            <SheetContent className="sm:max-w-[450px] flex flex-col h-full">
                <SheetHeader className="pb-6 border-b">
                    <SheetTitle className="flex items-center gap-2">
                        {step === 2 && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setStep(1)}>
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        )}
                        Generar Hoja de Gastos
                    </SheetTitle>
                    <SheetDescription>
                        {step === 1 ? 'Configura los detalles de facturación.' : 'Selecciona los viajes cerrados que incluirás.'}
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto py-6">
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="grid gap-3">
                                <Label htmlFor="employer">Empresa a facturar</Label>
                                <Select onValueChange={setSelectedEmployer} value={selectedEmployer}>
                                    <SelectTrigger id="employer">
                                        <SelectValue placeholder="Selecciona empresa..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {employers.map(e => (
                                            <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="grid gap-3">
                                <Label htmlFor="name">Nombre de la Hoja</Label>
                                <Input id="name" value={reportName} onChange={(e) => setReportName(e.target.value)} />
                            </div>
                            
                            <div className="grid gap-3">
                                <Label htmlFor="code">Código / Referencia (Opcional)</Label>
                                <Input id="code" placeholder="Ej: BAI-25-11" value={reportCode} onChange={(e) => setReportCode(e.target.value)} />
                            </div>
                        </div>
                    )}
                    
                    {step === 2 && candidates && (
                        <div className="space-y-6">
                            {candidates.warnings.length > 0 && (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-3">
                                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                                    <p className="text-xs text-amber-700 leading-tight">
                                        Tienes viajes sin cerrar. Es recomendable cerrarlos antes de incluirlos en una hoja de gastos.
                                    </p>
                                </div>
                            )}

                            <div className="grid gap-4">
                                <Label>Viajes disponibles ({selectedTrips.length})</Label>
                                <div className="grid gap-2">
                                    {candidates.ready.map(trip => (
                                        <div key={trip.id} className="flex items-center justify-between p-3 border rounded-xl hover:bg-slate-50 transition-colors cursor-pointer" 
                                             onClick={() => {
                                                 if(selectedTrips.includes(trip.id)) setSelectedTrips(selectedTrips.filter(id => id !== trip.id))
                                                 else setSelectedTrips([...selectedTrips, trip.id])
                                             }}>
                                            <div className="flex items-center gap-3">
                                                <Checkbox checked={selectedTrips.includes(trip.id)} />
                                                <div className="grid">
                                                    <span className="text-sm font-medium">{trip.name}</span>
                                                    <span className="text-[10px] text-slate-500">{trip.start_date}</span>
                                                </div>
                                            </div>
                                            <CheckCircle2 className={`h-4 w-4 ${selectedTrips.includes(trip.id) ? 'text-green-500' : 'text-slate-200'}`} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="pt-4 border-t bg-white">
                    {step === 1 ? (
                        <Button className="w-full h-12" onClick={handleNext} disabled={!selectedEmployer || !reportName || isPending}>
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Siguiente paso"}
                        </Button>
                    ) : (
                        <form action={formAction}>
                            <input type="hidden" name="employerId" value={selectedEmployer} />
                            <input type="hidden" name="reportName" value={reportName} />
                            <input type="hidden" name="reportCode" value={reportCode} />
                            <Button type="submit" className="w-full h-12" disabled={selectedTrips.length === 0 || isPending}>
                                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generar Hoja Ahora"}
                            </Button>
                        </form>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}