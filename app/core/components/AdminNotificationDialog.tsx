'use client'

import { useState } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Megaphone } from 'lucide-react'
import { NotificationSender } from '@/app/settings/notifications/NotificationSender'

// Props opcionales: 'children' permite personalizar el botón que abre el modal
interface AdminNotificationDialogProps {
  children?: React.ReactNode;
}

export function AdminNotificationDialog({ children }: AdminNotificationDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {/* Si le pasamos un hijo (Item de menú), usa ese. Si no, usa el botón por defecto */}
        {children ? children : (
            <Button variant="ghost" size="icon" title="Enviar Notificación Global">
                <Megaphone className="h-5 w-5 text-slate-500" />
            </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Centro de Difusión</DialogTitle>
          <DialogDescription>
            Envía una notificación a los usuarios del sistema.
          </DialogDescription>
        </DialogHeader>
        
        <NotificationSender onSuccess={() => setOpen(false)} />
        
      </DialogContent>
    </Dialog>
  )
}