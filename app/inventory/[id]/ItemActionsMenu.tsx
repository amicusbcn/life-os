'use client'

import { useState } from "react"
import { deleteInventoryItem } from "@/app/inventory/actions"
import { EditItemDialog } from "./EditItemDialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreVertical, Edit, Trash2 } from "lucide-react"

export function ItemActionsMenu({ item, categories, locations }: any) {
  const [isEditOpen, setIsEditOpen] = useState(false)

  const handleDelete = async () => {
    if (confirm("¿Seguro que quieres eliminar este item y su foto? No se puede deshacer.")) {
       await deleteInventoryItem(item.id, item.photo_path)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100">
            <MoreVertical className="h-5 w-5 text-slate-600" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
            <Edit className="mr-2 h-4 w-4" /> Editar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600 focus:bg-red-50">
            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* El Dialog de Edición se renderiza aquí pero solo se ve si isEditOpen es true */}
      <EditItemDialog 
         item={item} 
         categories={categories} 
         locations={locations}
         open={isEditOpen}
         onOpenChange={setIsEditOpen}
      />
    </>
  )
}