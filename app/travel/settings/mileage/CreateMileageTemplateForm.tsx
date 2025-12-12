'use client'

import { createMileageTemplate } from '@/app/travel/actions'
import { ActionResponse } from '@/types/common'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useFormStatus } from 'react-dom'
import { toast } from 'sonner'
import { useState } from 'react'
import { Loader2, Save } from 'lucide-react'

// Componente para el botón de envío
function SubmitButton() {
  const { pending } = useFormStatus()
  
  return (
    <Button type="submit" disabled={pending} className="w-full mt-4">
      {pending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Save className="mr-2 h-4 w-4" />
      )}
      Guardar Plantilla
    </Button>
  )
}

export function CreateMileageTemplateForm() {
    const [name, setName] = useState('');
    const [distance, setDistance] = useState('');

    async function handleAction(formData: FormData) {
        // Reiniciamos los campos inmediatamente para sensación de rapidez
        setName('');
        setDistance('');
        
        const res: ActionResponse = await createMileageTemplate(formData);
        
        if (res?.success) {
            toast.success("Plantilla creada con éxito.");
        } else {
            toast.error(`Error: ${res?.error || "Fallo al crear la plantilla."}`);
        }
    }

    return (
        <div className="mb-8 p-4 border rounded-lg bg-white shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Añadir Nuevo Recorrido Fijo</h2>
            <form action={handleAction}>
                <div className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Nombre del Recorrido (ej: Oficina A {'<->'} Oficina B)</Label>
                        <Input 
                            id="name" 
                            name="name" 
                            placeholder="Ej: Casa - Oficina Central" 
                            required 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="distance">Distancia (km)</Label>
                        <Input 
                            id="distance" 
                            name="distance" 
                            type="number" 
                            step="0.1" 
                            min="0.1"
                            placeholder="Ej: 15.5" 
                            required 
                            value={distance}
                            onChange={(e) => setDistance(e.target.value)}
                        />
                    </div>
                </div>
                <SubmitButton />
            </form>
        </div>
    )
}