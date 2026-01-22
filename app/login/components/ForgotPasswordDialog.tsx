'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { forgotPassword } from '../actions' // Importamos la acción del paso 1
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export function ForgotPasswordDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (formData: FormData) => {
    setLoading(true)
    const res = await forgotPassword(formData)
    setLoading(false)

    if (res?.error) {
      toast.error(res.error)
    } else {
      toast.success('Correo enviado. Revisa tu bandeja de entrada.')
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="text-sm text-slate-500 hover:text-slate-800 hover:underline">
          ¿Olvidaste tu contraseña?
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Recuperar Contraseña</DialogTitle>
          <DialogDescription>
            Te enviaremos un enlace mágico para que puedas establecer una nueva.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reset-email">Email</Label>
            <Input 
                id="reset-email" 
                name="email" 
                type="email" 
                placeholder="nombre@ejemplo.com" 
                required 
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Enviando...' : 'Enviar enlace'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}