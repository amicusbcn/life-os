'use client'

import { useState } from "react"
import { createInventoryLoan } from "@/app/inventory/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Handshake, Loader2, Calendar, User } from "lucide-react" // Cambiamos History por Handshake

export function NewLoanDialog({ itemId }: { itemId: string }) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)
    const formData = new FormData(event.currentTarget)
    
    // Aseguramos que el ID va en el formData (aunque usamos input hidden, esto es doble seguridad)
    if (!formData.get('item_id')) {
        formData.append('item_id', itemId)
    }

    try {
      const result = await createInventoryLoan(formData)
      if (result?.error) {
         alert("Error: " + result.error)
      } else {
         setOpen(false)
      }
    } catch (error) {
      alert("Error al guardar")
    } finally {
      setIsLoading(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {/* CAMBIO CLAVE: Botón ancho y Naranja para la barra inferior */}
        <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white shadow-sm gap-2">
           <Handshake className="h-4 w-4" />
           <span>Prestar</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-sm rounded-xl">
        <DialogHeader>
          <DialogTitle>Registrar Préstamo</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
           {/* Mantenemos tu input hidden, es una técnica sólida */}
           <input type="hidden" name="item_id" value={itemId} />

           <div className="space-y-2">
              <Label htmlFor="borrower" className="flex items-center gap-2 text-slate-600">
                 <User className="h-3.5 w-3.5" /> ¿A quién se lo prestas?
              </Label>
              <Input 
                id="borrower" 
                name="borrower_name" 
                placeholder="Ej: Vecino, Hermano..." 
                required 
                autoFocus 
              />
           </div>

           <div className="space-y-2">
              <Label htmlFor="date" className="flex items-center gap-2 text-slate-600">
                 <Calendar className="h-3.5 w-3.5" /> Fecha de préstamo
              </Label>
              <Input 
                type="date" 
                id="date" 
                name="loan_date" 
                defaultValue={today} 
                required 
              />
           </div>

           <div className="space-y-2">
              <Label htmlFor="notes" className="text-slate-600">Notas (Opcional)</Label>
              <Textarea 
                id="notes" 
                name="notes" 
                placeholder="Condiciones, fecha de devolución estimada..." 
                className="resize-none"
              />
           </div>

           <DialogFooter className="pt-2 gap-2">
             <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancelar
             </Button>
             <Button type="submit" disabled={isLoading} className="bg-orange-600 hover:bg-orange-700 text-white">
               {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
               Confirmar Préstamo
             </Button>
           </DialogFooter>

        </form>
      </DialogContent>
    </Dialog>
  )
}