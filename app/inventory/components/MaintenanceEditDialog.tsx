'use client'

import { useState } from "react"
import { updateMaintenanceTask } from "@/app/inventory/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Loader2, Calendar, User, Euro } from "lucide-react"

export function MaintenanceEditDialog({ 
  task, 
  profiles, 
  open, 
  onOpenChange 
}: { 
  task: any, 
  profiles: any[], 
  open: boolean, 
  onOpenChange: (open: boolean) => void 
}) {
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)
    const formData = new FormData(event.currentTarget)
    
    // IDs necesarios para la actualización y revalidación
    formData.append('id', task.id)
    formData.append('item_id', task.item_id)

    try {
      const result = await updateMaintenanceTask(formData)
      if (result?.error) {
         alert("Error: " + result.error)
      } else {
         onOpenChange(false)
      }
    } catch (error) {
      alert("Error al actualizar")
    } finally {
      setIsLoading(false)
    }
  }

  // Formatear fecha para el input type="date" (YYYY-MM-DD)
  const dateValue = task.last_maintenance_date 
    ? new Date(task.last_maintenance_date).toISOString().split('T')[0] 
    : ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Tarea</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
           
           {/* TÍTULO Y FECHA */}
           <div className="grid grid-cols-3 gap-4">
             <div className="col-span-2 space-y-2">
                <Label htmlFor="edit-desc">Título / Acción</Label>
                <Input 
                  id="edit-desc" 
                  name="description" 
                  defaultValue={task.description}
                  required 
                />
             </div>
             <div className="col-span-1 space-y-2">
                <Label htmlFor="edit-date">Fecha</Label>
                <Input type="date" id="edit-date" name="date" defaultValue={dateValue} />
             </div>
           </div>

           {/* DETALLES */}
           <div className="space-y-2">
              <Label htmlFor="edit-notes">Detalles</Label>
              <Textarea 
                id="edit-notes" 
                name="notes" 
                defaultValue={task.notes || ''}
                className="resize-none min-h-[80px]"
              />
           </div>

           {/* COSTE Y RESPONSABLE */}
           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                 <Label htmlFor="edit-cost" className="flex items-center gap-1">
                    <Euro className="h-3.5 w-3.5" /> Coste (€)
                 </Label>
                 <Input 
                    type="number" 
                    id="edit-cost" 
                    name="cost" 
                    defaultValue={task.cost || ''}
                    step="0.01" 
                    min="0"
                 />
              </div>

              <div className="space-y-2">
                 <Label htmlFor="edit-user" className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" /> Responsable
                 </Label>
                 <select 
                   id="edit-user" 
                   name="responsible_user_id" 
                   className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                   defaultValue={task.responsible_user_id || "no-user"}
                 >
                   <option value="no-user">-- Nadie --</option>
                   {profiles.map((p) => (
                     <option key={p.id} value={p.id}>{p.full_name}</option>
                   ))}
                 </select>
              </div>
           </div>

           {/* PERIODICIDAD */}
           <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <Label className="text-xs text-slate-500 uppercase font-bold">Recordatorio</Label>
              <div className="flex items-center gap-2">
                 <span className="text-sm text-slate-600">Repetir cada</span>
                 <Input 
                    type="number" 
                    name="periodicity_days" 
                    defaultValue={task.periodicity_days || ''}
                    className="w-20 bg-white" 
                 />
                 <span className="text-sm text-slate-600">días</span>
              </div>
           </div>

           <DialogFooter className="pt-2 gap-2">
             <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
             <Button type="submit" disabled={isLoading} className="bg-slate-900 text-white">
               {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
               Guardar Cambios
             </Button>
           </DialogFooter>

        </form>
      </DialogContent>
    </Dialog>
  )
}