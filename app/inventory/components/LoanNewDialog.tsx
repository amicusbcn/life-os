// app/inventory/[id]/components/NewLoanDialog.tsx
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
import { Handshake, Loader2, Calendar, User } from "lucide-react"
import { toast } from "sonner"

interface Props {
  itemId: string;
  onSuccess?: () => void;
  children?: React.ReactNode; // ✨ Slot para el Sidebar
}

export function LoanNewDialog({ itemId, onSuccess,children }: Props) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)
    const formData = new FormData(event.currentTarget)
    
    if (!formData.get('item_id')) {
        formData.append('item_id', itemId)
    }

    try {
      const result = await createInventoryLoan(formData)
      if (result?.error) {
          toast.error("Error: " + result.error)
      } else {
          toast.success("Préstamo registrado correctamente")
          onSuccess?.(); 
          setOpen(false)
      }
    } catch (error) {
      toast.error("Error al guardar")
    } finally {
      setIsLoading(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {/* ✨ Lógica de disparador flexible */}
        {children || (
          <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white shadow-sm gap-2 font-bold">
             <Handshake className="h-4 w-4" />
             <span>Prestar</span>
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-sm rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Handshake className="h-5 w-5 text-orange-600" />
            Registrar Préstamo
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
           <input type="hidden" name="item_id" value={itemId} />

           <div className="space-y-2">
              <Label htmlFor="borrower" className="flex items-center gap-2 text-slate-600 font-medium">
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
              <Label htmlFor="date" className="flex items-center gap-2 text-slate-600 font-medium">
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
              <Label htmlFor="notes" className="text-slate-600 font-medium">Notas (Opcional)</Label>
              <Textarea 
                id="notes" 
                name="notes" 
                placeholder="Condiciones o fecha estimada de devolución..." 
                className="resize-none h-24"
              />
           </div>

           <DialogFooter className="pt-2 gap-2">
             <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancelar
             </Button>
             <Button type="submit" disabled={isLoading} className="bg-orange-600 hover:bg-orange-700 text-white font-bold">
               {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
               Confirmar Préstamo
             </Button>
           </DialogFooter>

        </form>
      </DialogContent>
    </Dialog>
  )
}