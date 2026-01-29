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
import { UserPlus, Loader2, Mail } from 'lucide-react'
import { inviteUser } from '@/app/settings/users/actions' // Ajusta la ruta si es necesario
import { toast } from 'sonner'

export function InviteUserDialog({ variant }: { variant?: 'sidebar' }) {
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
                    <DialogTrigger asChild>
                {/* Botón para el menu lateral (sidebar) y para otros sitios */}
                {variant === 'sidebar' ? (
                    <button className="transition-all flex w-full items-center py-1.5 px-2 text-[12px] text-slate-500 hover:text-indigo-700">
                    <span className="mr-2"><Mail className="h-4 w-4" /></span> Invitar Usuario
                    </button>
                ) : (
                    <Button variant="outline" className="gap-2">
                        <Mail className="h-4 w-4" /> Invitar Usuario
                    </Button>
                )}    
            </DialogTrigger>
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