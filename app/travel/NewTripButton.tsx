// components/travel/NewTripButton.tsx
'use client'

import { Button } from "@/components/ui/button"
import { Plus } from 'lucide-react'
import { toast } from 'sonner' // Usaremos toast para el feedback inicial

/**
 * Este componente debe ser reemplazado por la lógica real del diálogo de creación de Viajes.
 */
export function NewTripButton() {
    
    const handleNewTrip = () => {
        // TODO: Implementar el diálogo real de creación de Viaje aquí (similar a NewReportDialog)
        toast.info("Funcionalidad 'Nuevo Viaje' en desarrollo. De momento, solo es un botón de prueba.", {
            duration: 3000
        });
    }

    return (
        <Button variant="outline" className="gap-2 border-dashed" onClick={handleNewTrip}>
            <Plus className="h-4 w-4" /> Nuevo Viaje
        </Button>
    )
}