'use client'

import { useState, useEffect } from 'react'
import { createTrip } from '@/app/travel/actions' // Ajustada la ruta
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Plane, TreePalm } from 'lucide-react'
import { toast } from 'sonner'

// IMPORTAMOS TIPOS CENTRALIZADOS
import { TravelEmployer, TravelContext } from '@/types/travel'

interface NewTripDialogProps {
  employers: TravelEmployer[]
  context: TravelContext
}

export function NewTripDialog({ employers, context }: NewTripDialogProps) {
  const [open, setOpen] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const isPersonal = context === 'personal'

  // Lógica de Empresa por defecto (Solo para trabajo)
  const defaultEmployerId = !isPersonal 
    ? employers.find(e => e.name.toUpperCase().includes('BAIDATA'))?.id 
    : undefined

  useEffect(() => {
    if (open) {
        const today = new Date().toISOString().split('T')[0]
        setStartDate(today)
        setEndDate(today)
    }
  }, [open])

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value
    setStartDate(newDate)
    setEndDate(newDate)
  }

  async function handleSubmit(formData: FormData) {
    // Inyectamos el contexto manualmente en el FormData antes de enviar
    formData.append('context', context)

    const res = await createTrip(formData)
    if (res?.success) {
      toast.success(isPersonal ? "Viaje personal creado" : "Viaje de trabajo creado")
      setOpen(false)
    } else {
      toast.error("Error: " + res?.error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          className={`w-full h-11 text-base font-bold shadow-md gap-2 transition-colors ${
            isPersonal 
              ? "bg-green-600 hover:bg-green-700" 
              : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          {isPersonal ? <TreePalm className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
          {isPersonal ? "Nueva Escapada" : "Nuevo Viaje"}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isPersonal ? <TreePalm className="h-5 w-5 text-green-600" /> : <Plane className="h-5 w-5 text-indigo-600" />}
            {isPersonal ? "Planificar Viaje Personal" : "Crear Viaje de Trabajo"}
          </DialogTitle>
        </DialogHeader>
        
        <form action={handleSubmit} className="grid gap-4 py-4">
          {/* REGLA DE ORO: Input oculto para sincronizar contexto */}
          <input type="hidden" name="context" value={context} />

          <div className="grid gap-2">
            <Label htmlFor="name">Nombre del Viaje</Label>
            <Input 
              id="name" 
              name="name" 
              placeholder={isPersonal ? "Ej: Vacaciones Japón..." : "Ej: Reunión Cliente..."} 
              required 
              autoFocus 
            />
          </div>

          {/* Solo mostramos el selector de empresa si es un viaje de TRABAJO */}
          {!isPersonal && (
            <div className="grid gap-2">
              <Label htmlFor="employer">Empresa</Label>
              <Select name="employer_id" defaultValue={defaultEmployerId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona empresa" />
                </SelectTrigger>
                <SelectContent>
                  {employers.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="start">Inicio</Label>
              <Input 
                id="start" 
                name="start_date" 
                type="date" 
                required 
                value={startDate} 
                onChange={handleStartDateChange} 
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="end">Fin</Label>
              <Input 
                id="end" 
                name="end_date" 
                type="date" 
                required 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)} 
              />
            </div>
          </div>

          <Button 
            type="submit" 
            className={`w-full mt-2 ${isPersonal ? "bg-green-600 hover:bg-green-700" : ""}`}
          >
            Guardar Viaje
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}