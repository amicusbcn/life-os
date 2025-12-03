'use client'

import { updateTripStatus } from '../actions'
import { getTripVisuals } from '@/utils/trip-logic'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// AHORA RECIBIMOS UNA PROPIEDAD NUEVA: hasPendingReceipts
export function TripStatusSelector({ trip, hasPendingReceipts }: { trip: any, hasPendingReceipts: boolean }) {
  
  const { label, className, canClose } = getTripVisuals(trip)
  const currentValue = trip.status === 'closed' ? 'closed' : 'open'

  // Bloqueo total: O lógica temporal (futuro) O lógica de negocio (faltan tickets)
  const isBlocked = !canClose || hasPendingReceipts

  async function handleChange(value: string) {
    // Doble chequeo de seguridad
    if (value === 'closed' && hasPendingReceipts) {
       alert("⛔ No puedes cerrar el viaje: Faltan tickets por justificar.")
       return
    }
    const res = await updateTripStatus(trip.id, value)
    if (!res?.success) alert("Error al cambiar estado")
  }

  return (
    <Select value={currentValue} onValueChange={handleChange}>
      <SelectTrigger className={`w-[200px] h-8 text-xs font-bold border transition-colors ${className}`}>
        <span>{label}</span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="open">
          {trip.status === 'closed' ? '🔓 Reabrir Viaje' : '🔄 Estado Automático'}
        </SelectItem>
        
        <div className="h-px bg-slate-100 my-1" />
        
        {/* OPCIÓN CERRAR: Se deshabilita si hay problemas */}
        <SelectItem 
          value="closed" 
          disabled={isBlocked && trip.status !== 'closed'} 
          className="font-bold text-slate-600"
        >
          {hasPendingReceipts ? '⚠️ FALTAN TICKETS' : '🔒 CERRAR VIAJE'}
          
          {/* Texto explicativo pequeño si está bloqueado */}
          {(isBlocked && trip.status !== 'closed') && (
            <span className="block text-[10px] font-normal text-red-400 mt-0.5">
               {hasPendingReceipts ? '(Revisa los gastos en rojo)' : '(Aún no realizado)'}
            </span>
          )}
        </SelectItem>
      </SelectContent>
    </Select>
  )
}