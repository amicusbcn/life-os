'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { updateInitialPassword } from '../actions'

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

// Recibimos el estado del perfil como prop
export default function ForcePasswordChangeDialog({ 
  profileStatus 
}: { 
  profileStatus: string | null | undefined 
}) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // SI NO ESTÁ PENDING, NO RENDERIZAMOS NADA
  if (profileStatus !== 'pending') return null

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    const result = await updateInitialPassword(formData)
    setLoading(false)

    if (result.success) {
      toast.success("¡Todo listo!", { description: "Bienvenido a Life-OS" })
      router.refresh() // Recarga para ocultar el modal
    } else {
      toast.error("Error", { description: result.message })
    }
  }

  return (
    <AlertDialog open={true}>
      <AlertDialogContent className="pointer-events-auto" onEscapeKeyDown={(e) => e.preventDefault()}>
        <AlertDialogHeader>
          <AlertDialogTitle>👋 ¡Hola! Configuremos tu seguridad</AlertDialogTitle>
          <AlertDialogDescription>
            Como es tu primer acceso, necesitamos que cambies tu contraseña temporal por una segura personal.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form action={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="password">Nueva Contraseña</Label>
            <Input 
              id="password" 
              name="password" 
              type="password" 
              required 
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
            <Input 
              id="confirmPassword" 
              name="confirmPassword" 
              type="password" 
              required 
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Actualizando..." : "Establecer Contraseña y Entrar"}
          </Button>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}