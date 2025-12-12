'use client'

import { useState } from 'react'
import { submitFeedback } from '@/app/core/actions' // Server Action
import { ActionResponse } from '@/types/common'
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Lightbulb, Send, Loader2 } from 'lucide-react'
import { useFormStatus } from 'react-dom'
import { toast } from 'sonner'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu' // Para usarlo dentro del UserMenu

// Componente para el estado de envío
function SubmitButton() {
    const { pending } = useFormStatus();

    return (
        <Button type="submit" disabled={pending} className="w-full">
            {pending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <Send className="mr-2 h-4 w-4" />
            )}
            Enviar Sugerencia
        </Button>
    )
}

export function FeedbackDialog() {
    const [open, setOpen] = useState(false);
    
    // Función de envío que usa la Server Action
    async function handleSubmit(formData: FormData) {
        const content = formData.get('content') as string;
        
        // Pequeña validación cliente
        if (!content || content.length < 5) {
            toast.error("Por favor, describe tu idea.");
            return;
        }

        const res: ActionResponse = await submitFeedback(formData);
        
        if (res.success) {
            toast.success(res.message);
            setOpen(false); // Cierra el modal al éxito
        } else {
            toast.error(res.error);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {/* 1. EL TRIGGER: Usaremos el DropdownMenuItem como trigger */}
            <DialogTrigger asChild>
                 <DropdownMenuItem 
                    className="cursor-pointer text-indigo-600 focus:bg-indigo-50 focus:text-indigo-600"

                    onSelect={(e) => {
                        e.preventDefault(); 
                        // Es importante también detener la propagación del evento nativo
                        e.stopPropagation(); 
                    }}
                 >
                    <Lightbulb className="mr-2 h-4 w-4" />
                    <span>Buzón de Sugerencias</span>
                </DropdownMenuItem>
            </DialogTrigger>
            
            {/* 2. EL CONTENIDO DEL DIÁLOGO */}
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-indigo-500" />
                        Enviar Petición de Cambio Rápida
                    </DialogTitle>
                </DialogHeader>
                
                <form action={handleSubmit} className="grid gap-4 py-4">
                    <p className="text-sm text-slate-600 -mt-2">
                        Describe brevemente tu idea de mejora, *bug* o nueva funcionalidad para Life-OS.
                    </p>
                    <div className="grid gap-2">
                        <Label htmlFor="content">Tu Idea</Label>
                        <Textarea 
                            id="content"
                            name="content"
                            placeholder="Ej: La tabla de gastos debería poder ordenarse por importe..."
                            rows={5}
                            maxLength={500}
                            required
                        />
                    </div>
                    <SubmitButton />
                </form>
            </DialogContent>
        </Dialog>
    )
}