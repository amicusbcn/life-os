'use client'

import { useState } from 'react'
import { submitFeedback } from '@/app/core/actions' 
import { ActionResponse } from '@/types/common'
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Lightbulb, Send, Loader2 } from 'lucide-react'
import { useFormStatus } from 'react-dom'
import { toast } from 'sonner'
import { usePathname } from 'next/navigation';

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="w-full">
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Enviar Sugerencia
        </Button>
    )
}

// Añadimos la prop children para que sea flexible
export function FeedbackDialog({ children }: { children?: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const currentPath = usePathname();
            
    async function handleSubmit(formData: FormData) {
        const content = formData.get('content') as string;
        if (!content || content.length < 5) {
            toast.error("Por favor, describe tu idea.");
            return;
        }

        const res: ActionResponse = await submitFeedback(formData);
        if (res.success) {
            toast.success(res.message);
            setOpen(false);
        } else {
            toast.error(res.error);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {/* Si hay children (como el SidebarMenuButton), lo usa. 
                  Si no, puedes dejar un botón por defecto para no romper otras partes.
                */}
                {children || (
                    <Button variant="outline" size="sm">
                        <Lightbulb className="mr-2 h-4 w-4" /> Sugerencias
                    </Button>
                )}
            </DialogTrigger>
            
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-indigo-500" />
                        Enviar Petición de Cambio Rápida
                    </DialogTitle>
                </DialogHeader>
                
                <form action={handleSubmit} className="grid gap-4 py-4">
                    <input type="hidden" name="currentPath" value={currentPath} />
                    <p className="text-sm text-slate-600 -mt-2">
                        Describe brevemente tu idea de mejora, *bug* o nueva funcionalidad para Life-OS.
                    </p>
                    <div className="grid gap-2">
                        <Label htmlFor="content">Tu Idea</Label>
                        <Textarea 
                            id="content"
                            name="content"
                            placeholder="Ej: La tabla de gastos..."
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