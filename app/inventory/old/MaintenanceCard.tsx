'use client'

import { useState } from "react"
import { deleteMaintenanceTask } from "@/app/inventory/actions"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Wrench, Pencil, Trash2, MoreVertical } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EditMaintenanceDialog } from "./EditMaintenanceDialog"

export function MaintenanceCard({ task, profiles }: { task: any, profiles: any[] }) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm("¿Seguro que quieres borrar este registro?")) return
    setIsDeleting(true)
    try {
        await deleteMaintenanceTask(task.id, task.item_id)
    } catch (e) {
        console.error(e)
        setIsDeleting(false)
    }
  }

  return (
    <>
      <Card className={`border-0 shadow-sm rounded-xl ring-1 ring-slate-100 bg-white overflow-hidden ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}>
        <CardContent className="p-0 flex min-h-[64px]">
          
          {/* ICONO (Izquierda) */}
          <div className="w-14 bg-slate-50 flex items-center justify-center border-r border-slate-100 text-slate-400">
             <Wrench className="h-5 w-5" />
          </div>
          
          {/* INFO (Centro) */}
          <div className="flex-1 px-4 py-3 flex flex-col justify-center">
             <div className="flex justify-between items-start">
                 <p className="font-semibold text-sm text-slate-800 line-clamp-1">{task.description}</p>
                 {/* Coste si existe */}
                 {task.cost > 0 && (
                    <span className="text-xs font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded ml-2">
                        {task.cost}€
                    </span>
                 )}
             </div>
             
             {/* Notas cortas */}
             {task.notes && (
                 <p className="text-xs text-slate-500 line-clamp-1 mt-0.5 italic">
                    {task.notes}
                 </p>
             )}

             <div className="flex flex-wrap items-center gap-2 mt-1.5">
               {task.periodicity_days && (
                 <Badge variant="secondary" className="text-[10px] h-5 font-normal px-1.5 bg-slate-100 text-slate-500 hover:bg-slate-200">
                   Cada {task.periodicity_days} días
                 </Badge>
               )}
               {task.profiles && (
                 <span className="text-[10px] text-slate-400 flex items-center gap-1">
                   Resp: {task.profiles.full_name?.split(' ')[0]}
                 </span>
               )}
             </div>
          </div>

          {/* FECHA Y MENÚ (Derecha) */}
          <div className="pl-2 pr-1 py-2 flex flex-col justify-between items-end border-l border-slate-50 min-w-[85px] bg-white relative">
             
             {/* Menú de opciones (Tres puntos) */}
             <div className="absolute top-1 right-1">
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-300 hover:text-slate-600">
                            <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                            <Pencil className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                 </DropdownMenu>
             </div>

             <div className="mt-auto pr-2 pb-1 text-right">
                <span className="block text-sm font-bold text-slate-700 leading-tight">
                  {task.last_maintenance_date 
                    ? new Date(task.last_maintenance_date).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: '2-digit'}) 
                    : '-'}
                </span>
             </div>
          </div>
        </CardContent>
      </Card>

      {/* MODAL DE EDICIÓN */}
      <EditMaintenanceDialog 
        task={task} 
        profiles={profiles} 
        open={isEditOpen} 
        onOpenChange={setIsEditOpen} 
      />
    </>
  )
}