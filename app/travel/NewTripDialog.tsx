// app/travel/NewTripDialog.tsx
'use client'

import { useState, useEffect } from 'react'
import { createTrip } from './actions'
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
import { Plus } from 'lucide-react'
// IMPORTAMOS EL TIPO CENTRALIZADO
import { TravelEmployer } from '@/types/travel'

// Usamos TravelEmployer[] en las props
export function NewTripDialog({ employers }: { employers: TravelEmployer[] }) {
  const [open, setOpen] = useState(false)
  
  // ESTADOS PARA LAS FECHAS
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // OPTIMIZACIÓN: Calculamos el ID por defecto directamente.
  // Al venir 'employers' del servidor, ya tenemos los datos. No hace falta un useEffect.
  const defaultEmployerId = employers.find(e => e.name.toUpperCase().includes('BAIDATA'))?.id

  useEffect(() => {
    // Inicializamos fechas solo en cliente para evitar error de hidratación
    if (open) {
        const today = new Date().toISOString().split('T')[0]
        setStartDate(today)
        setEndDate(today)
    }
  }, [open]) // Se ejecuta cada vez que abrimos el diálogo

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value
    setStartDate(newDate)
    setEndDate(newDate) // UX: Al cambiar inicio, el fin se pone igual por defecto
  }

  async function handleSubmit(formData: FormData) {
    const res = await createTrip(formData)
    if (res?.success) {
      setOpen(false)
    } else {
      alert("Error: " + res?.error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {/* BOTÓN ADAPTADO A BARRA INFERIOR */}
        <Button className="w-full h-11 text-base font-bold shadow-md bg-indigo-600 hover:bg-indigo-700 gap-2">
          <Plus className="h-5 w-5" /> Nuevo Viaje
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Viaje</DialogTitle>
        </DialogHeader>
        
        <form action={handleSubmit} className="grid gap-4 py-4">
          
          <div className="grid gap-2">
            <Label htmlFor="name">Nombre del Viaje</Label>
            <Input id="name" name="name" placeholder="Ej: Reunión Cliente..." required autoFocus />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="employer">Empresa</Label>
            {/* Usamos key para forzar re-render si el default cambia (truco de React) */}
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

          <Button type="submit" className="w-full mt-2">Crear Viaje</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}