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
import { History, Loader2, Calendar, User } from "lucide-react"

export function NewLoanDialog({ itemId }: { itemId: string }) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)
    const formData = new FormData(event.currentTarget)
    
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
        <Button variant="outline" className="aspect-square p-0 flex-shrink-0 border-slate-300 shadow-sm" title="Prestar Item">
           <History className="h-5 w-5 text-slate-700" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-xl">
        <DialogHeader>
          <DialogTitle>Prestar Item</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
           <input type="hidden" name="item_id" value={itemId} />

           <div className="space-y-2">
              <Label htmlFor="borrower" className="flex items-center gap-2">
                 <User className="h-3 w-3" /> ¿A quién se lo prestas?
              </Label>
              <Input id="borrower" name="borrower_name" placeholder="Ej: Vecino del 5º, Cuñado..." required autoFocus />
           </div>

           <div className="space-y-2">
              <Label htmlFor="date" className="flex items-center gap-2">
                 <Calendar className="h-3 w-3" /> Fecha de préstamo
              </Label>
              <Input type="date" id="date" name="loan_date" defaultValue={today} required />
           </div>

           <div className="space-y-2">
              <Label htmlFor="notes">Notas (Opcional)</Label>
              <Textarea id="notes" name="notes" placeholder="Condiciones, estado al entregar..." />
           </div>

           <DialogFooter className="pt-2">
             <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
             <Button type="submit" disabled={isLoading}>
               {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
               Registrar Préstamo
             </Button>
           </DialogFooter>

        </form>
      </DialogContent>
    </Dialog>
  )
}