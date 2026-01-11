'use client'

import { useState } from 'react'
// FIX: Importación desde la ruta absoluta de acciones de travel
import { updateExpense, deleteExpense, deleteReceipt } from '@/app/travel/actions'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch" // Para la consistencia visual
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
import { Pencil, Trash2, Calculator, X, Wallet } from 'lucide-react'
import { CategoryIcon } from '@/utils/icon-map'
import { toast } from 'sonner'

// TIPOS
import { TravelExpense, TravelCategory, TravelContext } from '@/types/travel'

interface EditExpenseDialogProps {
    expense: TravelExpense
    categories: TravelCategory[]
    context: TravelContext // <-- Requerido para la lógica visual
}

export function EditExpenseDialog({ expense, categories, context }: EditExpenseDialogProps) {
  const [open, setOpen] = useState(false)
  const isPersonal = context === 'personal'
  
  const initialCat = categories.find(c => c.id === expense.category_id)
  const initialIsMileage = initialCat?.is_mileage || false
  const initialRate = expense.mileage_rate_snapshot || initialCat?.current_rate || 0

  const [isMileage, setIsMileage] = useState(initialIsMileage)
  const [currentRate, setCurrentRate] = useState(initialRate)
  
  const [amount, setAmount] = useState(expense.amount.toString())
  const [distance, setDistance] = useState(expense.mileage_distance?.toString() || '')

  const handleCategoryChange = (catId: string) => {
    const cat = categories.find(c => c.id === catId)
    if (cat?.is_mileage) {
      setIsMileage(true)
      setCurrentRate(cat.current_rate || 0)
      if(distance) setAmount((Number(distance) * (cat.current_rate || 0)).toFixed(2))
    } else {
      setIsMileage(false)
    }
  }

  const handleDistanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const kms = e.target.value
    setDistance(kms)
    if (kms && !isNaN(Number(kms))) {
      setAmount((Number(kms) * currentRate).toFixed(2))
    } else {
      setAmount('')
    }
  }

  async function handleUpdate(formData: FormData) {
    formData.append('context', context) // Enviamos el contexto a la acción
    const res = await updateExpense(formData)
    if (res?.success) {
        setOpen(false)
        toast.success("Gasto actualizado")
    } else {
        toast.error(res?.error)
    }
  }

  async function handleDelete() {
    if(!confirm("¿Seguro que quieres borrar este gasto?")) return
    const res = await deleteExpense(expense.id, expense.trip_id)
    if (res?.success) {
        setOpen(false)
        toast.success("Gasto eliminado")
    } else {
        toast.error(res?.error)
    }
  }

  async function handleDeleteReceipt() {
    if(!confirm("¿Borrar la foto del ticket?")) return
    const res = await deleteReceipt(expense.id, expense.trip_id)
    if (res?.success) {
        toast.success("Ticket eliminado")
        setOpen(false) 
    } else {
        toast.error(res?.error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="h-8 px-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 gap-1.5 transition-colors"
        >
          <span className="text-[10px] font-bold uppercase">Editar</span>
          <Pencil className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
             <Pencil className="h-4 w-4 text-slate-400" />
             Editar Gasto {isPersonal ? 'Personal' : ''}
          </DialogTitle>
        </DialogHeader>
        
        <form action={handleUpdate} className="grid gap-4 py-2">
          <input type="hidden" name="expense_id" value={expense.id} />
          <input type="hidden" name="trip_id" value={expense.trip_id} />
          
          <div className="grid gap-1.5">
            <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Categoría</Label>
            <Select 
              name="category_id" 
              defaultValue={expense.category_id ?? undefined} // El doble interrogante convierte null en undefined
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center gap-2">
                      <CategoryIcon name={category?.icon_key || 'Tag'} className="h-5 w-5" />
                      <span>{cat.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="grid gap-1.5">
               <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Fecha</Label>
               <Input type="date" name="date" className="h-10" defaultValue={expense.date} required />
             </div>
             <div className="grid gap-1.5">
               <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Concepto</Label>
               <Input 
                  name="concept" 
                  defaultValue={expense.concept ?? ""} // Si es null, usa string vacío
                  required 
                />
             </div>
           </div>

           {isMileage ? (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid gap-3">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
                <Calculator className="h-3 w-3" /> Kilometraje
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label className="text-[10px]">Distancia (km)</Label>
                  <Input type="number" step="0.1" name="mileage_distance" className="h-9" value={distance} onChange={handleDistanceChange} />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-[10px]">Total (€)</Label>
                  <Input name="amount" value={amount} readOnly className="h-9 bg-gray-100 font-bold" />
                </div>
              </div>
              <input type="hidden" name="mileage_rate_snapshot" value={currentRate} />
            </div>
          ) : (
            <div className="grid gap-1.5">
              <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Importe (€)</Label>
              <Input type="number" step="0.01" name="amount" className="h-10 font-bold text-lg" defaultValue={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          )}

          {/* Ocultamos opciones de ticket si es personal */}
          {!isPersonal && (
            <div className="grid gap-2 border-t pt-4 mt-2">
                <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Ticket / Factura</Label>
                
                {expense.receipt_url ? (
                <div className="flex items-center justify-between bg-indigo-50/50 p-2 rounded-lg border border-indigo-100 mb-1">
                    <div className="text-xs text-indigo-700 flex items-center gap-2">
                        <span className="font-bold">✓ Ticket guardado</span>
                        <a href={expense.receipt_url} target="_blank" rel="noopener noreferrer" className="underline hover:text-indigo-900">Ver</a>
                    </div>
                    
                    <Button 
                    type="button" variant="ghost" size="icon" 
                    className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                    onClick={handleDeleteReceipt}
                    >
                    <X className="h-4 w-4" />
                    </Button>
                </div>
                ) : (
                <p className="text-[10px] text-slate-400 italic mb-1 px-1">Sin ticket adjunto</p>
                )}

                <Input name="receipt_file" type="file" accept="image/*,application/pdf" className="h-9 text-xs cursor-pointer bg-slate-50" capture="environment" />
            </div>
          )}

          {/* Botones de acción final */}
          <div className="flex gap-2 mt-6">
            <Button type="button" variant="outline" onClick={handleDelete} className="flex-1 border-red-100 text-red-500 hover:bg-red-50 hover:text-red-600">
              <Trash2 className="h-4 w-4 mr-2" /> Borrar
            </Button>
            <Button type="submit" className={`flex-[2] font-bold ${isPersonal ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
              Guardar Cambios
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}