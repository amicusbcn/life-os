//app/settings/users/components/InviteUserDialog.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UserPlus, Loader2 } from 'lucide-react'
import { inviteUser } from '@/app/settings/users/actions' // Ajusta la ruta si es necesario
import { toast } from 'sonner'

export function InviteUserDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    const email = formData.get('email') as string
    
    const res = await inviteUser(email)
    setLoading(false)

    if (res.success) {
      toast.success('Invitación creada')
      setOpen(false)
    } else {
      toast.error('Error', { description: res.error })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
          <UserPlus className="h-4 w-4" /> Invitar Usuario
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invitar Usuario</DialogTitle>
          <DialogDescription>
            +   Enviaremos un email con un enlace de acceso directo para que entre y cree su contraseña.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="usuario@ejemplo.com" required />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar Invitación'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}