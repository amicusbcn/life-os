'use client'

import { updateTripStatus } from '@/app/travel/actions' // Asegúrate de la ruta
import { getTripState } from '@/utils/trip-logic' // La nueva lógica centralizada
import { TravelTrip, TripDbStatus } from '@/types/travel'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner" // O tu sistema de alertas preferido

interface TripStatusSelectorProps {
  trip: TravelTrip;
  hasPendingReceipts: boolean;
}

export function TripStatusSelector({ trip, hasPendingReceipts }: TripStatusSelectorProps) {
  
  // 1. Obtenemos toda la lógica visual y de permisos del "cerebro" central
  const { label, color, actions, visualStatus } = getTripState(trip);

  // 2. CASO ESPECIAL: REPORTADO
  // Si está bloqueado y no se puede reabrir (caso reportado), mostramos solo un badge estático.
  if (actions.isLocked && !actions.canReopen) {
    return (
      <Badge variant="outline" className={`h-8 px-3 text-xs font-bold ${color}`}>
        {label}
      </Badge>
    );
  }

  // 3. VALIDACIÓN DE CIERRE EXTRA (Regla de negocio: Tickets pendientes)
  // Aunque la fecha permita cerrar, si hay tickets pendientes, bloqueamos.
  const isClosingBlocked = !actions.canClose || (hasPendingReceipts && trip.status !== 'closed');

  async function handleValueChange(newValue: string) {
    // Protección doble
    if (newValue === 'closed' && hasPendingReceipts) {
      toast.error("⛔ No puedes cerrar: Faltan tickets por justificar.");
      return;
    }

    const statusToSend = newValue as TripDbStatus; // 'open' | 'closed'
    
    // Optimistic UI o espera simple
    const res = await updateTripStatus(trip.id, statusToSend);
    
    if (res?.error) {
      toast.error("Error al actualizar estado");
    } else {
      toast.success("Estado actualizado");
    }
  }

  return (
    <Select 
      // El valor del select siempre coincide con la BBDD ('open' o 'closed')
      // Si visualStatus es 'planned', 'active' o 'completed', el valor real en BBDD es 'open'.
      value={trip.status} 
      onValueChange={handleValueChange}
    >
      <SelectTrigger 
        className={`w-[180px] h-8 text-xs font-bold border transition-colors ${color}`}
      >
        {/* Aquí mostramos la etiqueta calculada (ej: "EN CURSO"), no el valor crudo */}
        <span>{label}</span>
      </SelectTrigger>
      
      <SelectContent align="end">
        {/* OPCIÓN 1: ESTADO ABIERTO (Automático) */}
        {/* Si seleccionas esto, la BBDD guarda 'open', y la UI calculará si es Planificado/En Curso */}
        <SelectItem value="open">
          {trip.status === 'closed' ? '🔄 Reabrir / Automático' : '✅ Estado Automático'}
        </SelectItem>
        
        <div className="h-px bg-slate-100 my-1" />
        
        {/* OPCIÓN 2: CERRAR */}
        <SelectItem 
          value="closed" 
          disabled={isClosingBlocked}
          className="text-slate-700 font-medium"
        >
          <div className="flex flex-col items-start gap-1">
            <span className="flex items-center gap-2">
               {hasPendingReceipts ? '⚠️' : '🔒'} CERRAR VIAJE
            </span>
            
            {/* Mensajes de ayuda si está deshabilitado */}
            {isClosingBlocked && trip.status !== 'closed' && (
               <span className="text-[10px] text-red-400 font-normal">
                 {hasPendingReceipts 
                   ? 'Faltan tickets' 
                   : '(Aún no realizado)' // Este mensaje saldrá si intentas cerrar un viaje futuro y tu lógica lo prohibe
                 }
               </span>
            )}
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  )
}