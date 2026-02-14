// app/inventory/[id]/components/NewMaintenanceDialog.tsx
'use client'

import { useState } from "react"
import { createMaintenanceTask } from "@/app/inventory/actions"
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
import { Wrench, Loader2, User, Euro } from "lucide-react"
import { toast } from "sonner"

interface Props {
  itemId: string;
  profiles: any[];
  children?: React.ReactNode; // ✨ Slot para el Sidebar
}

export function MaintenanceNewDialog({ itemId, profiles, children }: Props) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)
    const formData = new FormData(event.currentTarget)
    
    if (!formData.get('item_id')) formData.append('item_id', itemId)

    try {
      const result = await createMaintenanceTask(formData)
      if (result?.error) {
        toast.error("Error: " + result.error)
      } else {
        toast.success("Mantenimiento registrado")
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
        {/* ✨ Si hay children (Sidebar), lo usamos. Si no, el botón original */}
        {children || (
          <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white shadow-sm gap-2">
            <Wrench className="h-4 w-4" /> 
            <span>Mantenimiento</span>
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-md rounded-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-indigo-600" />
            Registrar Tarea de Mantenimiento
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
           <div className="grid grid-cols-3 gap-4">
             <div className="col-span-2 space-y-2">
                <Label htmlFor="desc">Título / Acción *</Label>
                <Input id="desc" name="description" placeholder="Ej: Revisión anual..." required autoFocus />
             </div>
             <div className="col-span-1 space-y-2">
                <Label htmlFor="date">Fecha</Label>
                <Input type="date" id="date" name="date" defaultValue={today} required />
             </div>
           </div>

           <div className="space-y-2">
              <Label htmlFor="notes">Detalles (Opcional)</Label>
              <Textarea id="notes" name="notes" placeholder="Explica qué se hizo..." className="resize-none min-h-[80px]" />
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                 <Label htmlFor="cost" className="flex items-center gap-1"><Euro className="h-3.5 w-3.5" /> Coste (€)</Label>
                 <Input type="number" id="cost" name="cost" placeholder="0.00" step="0.01" min="0" />
              </div>

              <div className="space-y-2">
                 <Label htmlFor="user" className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> Responsable</Label>
                 <select id="user" name="responsible_user_id" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" defaultValue="no-user">
                   <option value="no-user">-- Nadie --</option>
                   {profiles.map((p) => (
                     <option key={p.id} value={p.id}>{p.full_name || 'Sin nombre'}</option>
                   ))}
                 </select>
              </div>
           </div>

           <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <Label htmlFor="period" className="text-xs text-slate-500 uppercase font-bold tracking-wider">Recordatorio</Label>
              <div className="flex items-center gap-2">
                 <span className="text-sm text-slate-600">Repetir cada</span>
                 <Input type="number" id="period" name="periodicity_days" placeholder="365" className="w-20 bg-white" />
                 <span className="text-sm text-slate-600">días</span>
              </div>
           </div>

           <DialogFooter className="pt-2 gap-2">
             <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
             <Button type="submit" disabled={isLoading} className="bg-indigo-600 text-white hover:bg-indigo-700">
               {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
               Guardar Tarea
             </Button>
           </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}