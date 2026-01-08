'use client'

import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger, 
  DropdownMenuLabel, 
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreVertical, Gauge, MapPin, Tag } from 'lucide-react'
import { useRouter } from 'next/navigation'
// Importamos el tipo para mantener la coherencia
import { TravelContext, TravelMileageTemplate } from '@/types/travel'

import { MileageSettingsDialog } from "../dialogs/MileageSettingsDialog"


// Definimos la interfaz de Props para que TypeScript no se queje en page.tsx
interface TravelSettingsButtonProps {
  context: TravelContext;
  templates: TravelMileageTemplate[];
}

export function TravelSettingsButton({ context,templates }: TravelSettingsButtonProps) {
    const router = useRouter();

    const navigateToSettings = (path: string) => {
        // Mantenemos la estructura de carpetas que decidimos
        router.push(`/travel/settings/${path}`);
    }

    const isPersonal = context === 'personal';

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900">
                    <MoreVertical className="h-5 w-5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>
                    {isPersonal ? '⚙️ Ajustes Personales' : '⚙️ Ajustes de Trabajo'}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {/* Opción 1: Kilometraje */}
                <MileageSettingsDialog initialTemplates={templates}> 
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer">
                        <Gauge className="mr-2 h-4 w-4" />
                        <span>Recorridos Fijos (Kilometraje)</span>
                    </DropdownMenuItem>
                </MileageSettingsDialog>

                {/* Opción 2: Categorías */}
                <DropdownMenuItem 
                    onClick={() => navigateToSettings('categories')} 
                    className="cursor-pointer"
                >
                    <Tag className="mr-2 h-4 w-4" />
                    <span>Categorías de {isPersonal ? 'Viaje' : 'Gasto'}</span>
                </DropdownMenuItem>
                
                {/* Opción 3: Empleadores - Solo útil en modo Trabajo */}
                {!isPersonal && (
                    <DropdownMenuItem 
                        onClick={() => navigateToSettings('employers')} 
                        className="cursor-pointer"
                    >
                        <MapPin className="mr-2 h-4 w-4" />
                        <span>Empleadores</span>
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}