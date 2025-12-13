'use client'

import { deleteTimelineEvent } from '../actions'
import { Button } from "@/components/ui/button"
import { Trash2 } from 'lucide-react'
import { useState } from 'react'

export function DeleteEventButton({ eventId }: { eventId: string }) {
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm("¿Seguro que quieres borrar este recuerdo? No se puede deshacer.")) return
    
    setIsDeleting(true)
    const res = await deleteTimelineEvent(eventId)
    
    if (!res?.success) {
      alert("Error: " + res?.error)
      setIsDeleting(false)
    }
  }

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={handleDelete} 
      disabled={isDeleting}
      className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )
}