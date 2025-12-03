'use client'

import { useState, useEffect } from 'react'
import { createExpense } from './actions'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch" // Necesitaremos instalar este componente abajo*
import { CategoryIcon } from '@/utils/icon-map'
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
import { Plus, Calculator } from 'lucide-react'

// Tipos de datos que recibimos
interface Category {
  id: string
  name: string
  is_mileage: boolean
  current_rate: number
  icon_key?:string
}

export function NewExpenseDialog({ tripId, categories }: { tripId: string, categories: Category[] }) {
  const [open, setOpen] = useState(false)
  const [selectedCatId, setSelectedCatId] = useState('')
  const [isMileage, setIsMileage] = useState(false)
  
  // Estados para cálculos
  const [amount, setAmount] = useState('') // Euros totales
  const [distance, setDistance] = useState('') // Kms
  const [currentRate, setCurrentRate] = useState(0) // Precio actual (0.26)

  // 1. Cuando cambiamos de categoría, detectamos si es de tipo "Kilometraje"
  const handleCategoryChange = (catId: string) => {
    setSelectedCatId(catId)
    const cat = categories.find(c => c.id === catId)
    
    if (cat?.is_mileage) {
      setIsMileage(true)
      setCurrentRate(cat.current_rate || 0)
      setAmount('') // Limpiamos importe para que se recalcule
    } else {
      setIsMileage(false)
      setDistance('') // Limpiamos distancia
    }
  }

  // 2. Calculadora automática: Si cambian los Kms, se actualiza el Precio
  const handleDistanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const kms = e.target.value
    setDistance(kms)
    
    if (kms && !isNaN(Number(kms))) {
      const total = Number(kms) * currentRate
      setAmount(total.toFixed(2)) // Redondeamos a 2 decimales
    } else {
      setAmount('')
    }
  }

  async function handleSubmit(formData: FormData) {
    const res = await createExpense(formData)
    if (res?.success) {
      setOpen(false)
      // Limpiamos formulario
      setAmount('')
      setDistance('')
      setSelectedCatId('')
    } else {
      alert("Error: " + res?.error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> Añadir Gasto
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nuevo Gasto</DialogTitle>
        </DialogHeader>
        
        <form action={handleSubmit} className="grid gap-4 py-4">
          <input type="hidden" name="trip_id" value={tripId} />
          
          {/* Categoría */}
          <div className="grid gap-2">
            <Label>Categoría</Label>
            <Select name="category_id" onValueChange={handleCategoryChange} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  <div className="flex items-center gap-2">
                    <CategoryIcon name={cat.icon_key} className="h-4 w-4 text-slate-500" />
                    <span>{cat.name}</span>
                  </div>
                </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fecha y Concepto */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1 grid gap-2">
              <Label>Fecha</Label>
              <Input type="date" name="date" defaultValue={new Date().toISOString().split('T')[0]} required />
            </div>
            <div className="col-span-2 grid gap-2">
              <Label>Concepto</Label>
              <Input name="concept" placeholder="Ej: Taxi aeropuerto..." required />
            </div>
          </div>

          {/* ZONA DINÁMICA: ¿Es Kilometraje o Gasto Normal? */}
          {isMileage ? (
             // MODO KILOMETRAJE
            <div className="bg-slate-50 p-3 rounded border border-slate-200 grid gap-3">
              <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                <Calculator className="h-4 w-4" /> Cálculo Automático
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Distancia (Km)</Label>
                  <Input 
                    type="number" step="0.1" name="mileage_distance" 
                    value={distance} onChange={handleDistanceChange} 
                    placeholder="0" required 
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Total Calculado (€)</Label>
                  {/* Este input es readonly, el usuario no lo toca, se calcula solo */}
                  <Input 
                    type="number" name="amount" 
                    value={amount} readOnly 
                    className="bg-gray-100 font-bold text-slate-700" 
                  />
                </div>
              </div>
              {/* Guardamos el ratio usado (oculto) */}
              <input type="hidden" name="mileage_rate_snapshot" value={currentRate} />
              <p className="text-xs text-slate-400 text-right">Tarifa actual: {currentRate} €/km</p>
            </div>
          ) : (
            // MODO NORMAL
            <div className="grid gap-2">
              <Label>Importe (€)</Label>
              <Input type="number" step="0.01" name="amount" placeholder="0.00" required />
            </div>
          )}

          {/* Reembolsable (Checkbox manual simple) */}
          <div className="flex items-center gap-2 mt-2">
             <input type="checkbox" name="is_reimbursable" id="reimbursable" defaultChecked className="w-4 h-4" />
             <Label htmlFor="reimbursable" className="cursor-pointer">¿Es reembolsable? (Paga la empresa)</Label>
          </div>
          {/* INPUT DE ARCHIVO */}
          <div className="grid gap-2">
            <Label htmlFor="receipt">Foto del Ticket</Label>
            <Input 
              id="receipt" 
              name="receipt_file" 
              type="file" 
              capture="environment"
              accept="image/*,application/pdf" // Aceptamos imágenes y PDF
              className="cursor-pointer bg-slate-50"
            />
          </div>
          <Button type="submit" className="w-full mt-2">Guardar Gasto</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}