'use client'

import { useState } from "react"
import { createMaintenanceTask } from "@/app/inventory/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Wrench, Loader2, Calendar, User } from "lucide-react"

// FÍJATE AQUÍ: Ahora aceptamos 'profiles' en las props
export function NewMaintenanceDialog({ itemId, profiles }: { itemId: string, profiles: any[] }) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)
    const formData = new FormData(event.currentTarget)
    // Añadimos el ID del item oculto
    formData.append('item_id', itemId)

    try {
      await createMaintenanceTask(formData)
      setOpen(false)
    } catch (error) {
      alert("Error al guardar")
    } finally {
      setIsLoading(false)
    }
  }

  // Fecha de hoy para el input por defecto
  const today = new Date().toISOString().split('T')[0]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white shadow-sm">
          <Wrench className="mr-2 h-4 w-4" /> Añadir Mantenimiento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Tarea</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
           
           {/* DESCRIPCIÓN */}
           <div className="space-y-2">
              <Label htmlFor="desc">¿Qué se ha hecho?</Label>
              <Input id="desc" name="description" placeholder="Ej: Limpieza de filtros..." required autoFocus />
           </div>

           <div className="grid grid-cols-2 gap-4">
              {/* FECHA */}
              <div className="space-y-2">
                <Label htmlFor="date" className="flex items-center gap-2">
                   <Calendar className="h-3 w-3" /> Fecha
                </Label>
                <Input type="date" id="date" name="date" defaultValue={today} required />
              </div>

              {/* RESPONSABLE */}
              <div className="space-y-2">
                <Label htmlFor="user" className="flex items-center gap-2">
                   <User className="h-3 w-3" /> Responsable
                </Label>
                <select 
                  id="user" 
                  name="responsible_user_id" 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  defaultValue="no-user"
                >
                  <option value="no-user" disabled>Seleccionar...</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>{p.full_name || 'Usuario sin nombre'}</option>
                  ))}
                </select>
              </div>
           </div>

           {/* PERIODICIDAD */}
           <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <Label htmlFor="period" className="text-xs text-slate-500 uppercase font-bold">Recordatorio (Opcional)</Label>
              <div className="flex items-center gap-2">
                 <span className="text-sm text-slate-600">Repetir cada</span>
                 <Input 
                    type="number" 
                    id="period" 
                    name="periodicity_days" 
                    placeholder="180" 
                    className="w-20 bg-white" 
                 />
                 <span className="text-sm text-slate-600">días</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Deja vacío si es una reparación puntual.</p>
           </div>

           <DialogFooter className="pt-2">
             <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
             <Button type="submit" disabled={isLoading}>
               {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
               Guardar Tarea
             </Button>
           </DialogFooter>

        </form>
      </DialogContent>
    </Dialog>
  )
}