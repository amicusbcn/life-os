'use client'

import { useState } from 'react'
import { updateExpense, deleteExpense, deleteReceipt } from './actions'
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
import { Pencil, Trash2, Calculator, X } from 'lucide-react'
import { CategoryIcon } from '@/utils/icon-map'

// --- CAMBIO 1: Importamos los tipos centralizados y borramos los locales ---
import { TravelExpense, TravelCategory } from '@/types/travel'

// (Borramos interface Category e interface Expense locales)

export function EditExpenseDialog({ expense, categories }: { expense: TravelExpense, categories: TravelCategory[] }) {
  const [open, setOpen] = useState(false)
  
  // --- CAMBIO 2: Inicialización segura de estados ---
  // Buscamos si la categoría original es de kilometraje para inicializar bien el estado
  const initialCat = categories.find(c => c.id === expense.category_id)
  const initialIsMileage = initialCat?.is_mileage || false
  // Usamos el snapshot guardado o el actual de la categoría
  const initialRate = expense.mileage_rate_snapshot || initialCat?.current_rate || 0

  const [isMileage, setIsMileage] = useState(initialIsMileage)
  const [currentRate, setCurrentRate] = useState(initialRate)
  
  const [amount, setAmount] = useState(expense.amount.toString())
  const [distance, setDistance] = useState(expense.mileage_distance?.toString() || '')

  const handleCategoryChange = (catId: string) => {
    const cat = categories.find(c => c.id === catId)
    if (cat?.is_mileage) {
      setIsMileage(true)
      // Usamos || 0 por seguridad con los tipos opcionales
      setCurrentRate(cat.current_rate || 0)
      if(distance) setAmount((Number(distance) * (cat.current_rate || 0)).toFixed(2))
    } else {
      setIsMileage(false)
      // setDistance('') // Opcional: ¿Quieres borrar la distancia si cambian a taxi? A tu gusto.
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
    const res = await updateExpense(formData)
    if (res?.success) setOpen(false)
    else alert(res?.error)
  }

  async function handleDelete() {
    if(!confirm("¿Seguro que quieres borrar este gasto ENTERO?")) return
    const res = await deleteExpense(expense.id, expense.trip_id)
    if (res?.success) setOpen(false)
    else alert(res?.error)
  }

  // --- MANTENEMOS TU FUNCIÓN DE BORRAR TICKET ---
  async function handleDeleteReceipt() {
    if(!confirm("¿Borrar solo la foto del ticket?")) return
    const res = await deleteReceipt(expense.id, expense.trip_id)
    if (res?.success) {
        setOpen(false) 
    }
    else alert(res?.error)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          className="h-8 px-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 gap-1.5 transition-colors"
        >
          <span className="text-xs font-medium">Editar</span>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Gasto</DialogTitle>
        </DialogHeader>
        
        <form action={handleUpdate} className="grid gap-4 py-4">
          <input type="hidden" name="expense_id" value={expense.id} />
          <input type="hidden" name="trip_id" value={expense.trip_id} />
          
          <div className="grid gap-2">
            <Label>Categoría</Label>
            <Select name="category_id" defaultValue={expense.category_id} onValueChange={handleCategoryChange}>
              <SelectTrigger>
                <SelectValue />
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

          <div className="grid grid-cols-3 gap-4">
             <div className="col-span-1 grid gap-2">
               <Label>Fecha</Label>
               <Input type="date" name="date" defaultValue={expense.date} required />
             </div>
             <div className="col-span-2 grid gap-2">
               <Label>Concepto</Label>
               <Input name="concept" defaultValue={expense.concept} required />
             </div>
           </div>

           {isMileage ? (
            <div className="bg-slate-50 p-3 rounded border border-slate-200 grid gap-3">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Calculator className="h-4 w-4" /> Recálculo
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Distancia</Label>
                  <Input type="number" step="0.1" name="mileage_distance" value={distance} onChange={handleDistanceChange} />
                </div>
                <div className="grid gap-2">
                  <Label>Total</Label>
                  <Input name="amount" value={amount} readOnly className="bg-gray-100 font-bold" />
                </div>
              </div>
              <input type="hidden" name="mileage_rate_snapshot" value={currentRate} />
            </div>
          ) : (
            <div className="grid gap-2">
              <Label>Importe (€)</Label>
              <Input type="number" step="0.01" name="amount" defaultValue={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          )}

          <div className="flex items-center gap-2 mt-2">
             <input type="checkbox" name="is_reimbursable" id="reimb_edit" defaultChecked={expense.is_reimbursable} className="w-4 h-4 accent-indigo-600" />
             <Label htmlFor="reimb_edit" className="cursor-pointer">¿Es reembolsable?</Label>
          </div>

          {/* INPUT FOTO CON BOTÓN DE BORRAR (TU LÓGICA MANTENIDA) */}
          <div className="grid gap-2 mt-2">
            <Label htmlFor="receipt_edit">Ticket / Factura</Label>
            
            {expense.receipt_url ? (
              <div className="flex items-center justify-between bg-green-50 p-2 rounded border border-green-100 mb-1">
                 <div className="text-sm text-green-700 flex items-center gap-2">
                    <span>✓ Ticket actual</span>
                    <a href={expense.receipt_url} target="_blank" rel="noopener noreferrer" className="underline font-bold hover:text-green-900">Ver</a>
                 </div>
                 
                 <Button 
                   type="button" 
                   variant="ghost" 
                   size="icon" 
                   className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-100"
                   onClick={handleDeleteReceipt}
                   title="Borrar ticket"
                 >
                   <X className="h-3.5 w-3.5" />
                 </Button>
              </div>
            ) : (
               <p className="text-[10px] text-slate-400 mb-1">Sin ticket adjunto</p>
            )}

            <Input id="receipt_edit" name="receipt_file" type="file" accept="image/*,application/pdf" className="cursor-pointer bg-slate-50" capture="environment" />
            <p className="text-[10px] text-slate-500">Subir uno nuevo reemplazará el anterior.</p>
          </div>

          <div className="flex gap-2 mt-4">
            <Button type="button" variant="destructive" onClick={handleDelete} className="w-1/3">
              <Trash2 className="h-4 w-4 mr-2" /> Borrar
            </Button>
            <Button type="submit" className="w-2/3">Guardar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}