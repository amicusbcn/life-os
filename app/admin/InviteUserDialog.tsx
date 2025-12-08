'use client'

import { useState } from 'react'
import { inviteUser } from './user-actions' // <--- Ruta a tu acción
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Mail, Loader2 } from 'lucide-react'
import { useFormStatus } from 'react-dom' // Para el estado del formulario

// Componente para manejar el estado de envío (Submit Button)
function SubmitButton() {
    const { pending } = useFormStatus()
    return (
        <Button type="submit" disabled={pending} className="w-full">
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
            {pending ? 'Enviando...' : 'Enviar Invitación'}
        </Button>
    )
}

export function InviteUserDialog() {
    const [open, setOpen] = useState(false)
    const [status, setStatus] = useState<{ message: string | null; error: boolean }>({ message: null, error: false })

    // Handler que se ejecuta después de la acción
    const formActionHandler = async (formData: FormData) => {
        setStatus({ message: null, error: false })
        const result = await inviteUser(formData)

        if (result.success) {
            setStatus({ message: result.message || 'Invitación enviada con éxito.', error: false })
            // Opcional: setOpen(false) si quieres que se cierre automáticamente
        } else {
            setStatus({ message: result.error || 'Fallo al enviar la invitación.', error: true })
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Mail className="h-4 w-4" /> Invitar Usuario
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Invitar Nuevo Usuario</DialogTitle>
                </DialogHeader>
                
                {/* Usamos el prop 'action' del formulario para Server Actions */}
                <form action={formActionHandler} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email del invitado</Label>
                        <Input 
                            id="email" 
                            name="email" 
                            type="email" 
                            placeholder="usuario@ejemplo.com" 
                            required 
                        />
                    </div>
                    
                    {status.message && (
                        <p className={`text-sm ${status.error ? 'text-red-500' : 'text-green-600'}`}>
                            {status.message}
                        </p>
                    )}

                    <SubmitButton />
                </form>
            </DialogContent>
        </Dialog>
    )
}