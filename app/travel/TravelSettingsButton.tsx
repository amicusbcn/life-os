'use client'

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Settings, MoreVertical, Gauge, MapPin, Tag } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function TravelSettingsButton() {
    const router = useRouter();

    const navigateToSettings = (path: string) => {
        router.push(`/travel/settings/${path}`);
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                {/* Estilo idéntico al botón que me mostraste de Inventory */}
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900">
                    <MoreVertical className="h-5 w-5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>⚙️ Configuración de Viajes</DropdownMenuLabel>
                <DropdownMenuSeparator />

                {/* Opción 1: Kilometraje (Recorridos Fijos) */}
                <DropdownMenuItem 
                    onClick={() => navigateToSettings('mileage')} 
                    className="cursor-pointer"
                >
                    <Gauge className="mr-2 h-4 w-4" />
                    <span>Recorridos Fijos (Kilometraje)</span>
                </DropdownMenuItem>

                {/* Opción 2: Categorías (Pendiente de implementar) */}
                <DropdownMenuItem 
                    onClick={() => navigateToSettings('categories')} 
                    className="cursor-pointer"
                >
                    <Tag className="mr-2 h-4 w-4" />
                    <span>Categorías de Gasto</span>
                </DropdownMenuItem>
                
                {/* Opción 3: Empleadores (Pendiente de implementar) */}
                <DropdownMenuItem 
                    onClick={() => navigateToSettings('employers')} 
                    className="cursor-pointer"
                >
                    <MapPin className="mr-2 h-4 w-4" />
                    <span>Empleadores</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}