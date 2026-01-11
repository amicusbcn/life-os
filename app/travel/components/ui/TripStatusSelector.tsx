// app/travel/[Bid]/TripStatusSelector.tsx
'use client'

import { updateTripStatus, deleteTrip } from '@/app/travel/actions' // <-- ¡Importar deleteTrip!
import { getTripState } from '@/utils/trip-logic'
import { TravelTrip, TripDbStatus } from '@/types/travel' // <-- Tipos ya existentes
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog" 
import { toast } from "sonner" 
import { useRouter } from 'next/navigation' 
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from "@/components/ui/button"

interface TripStatusSelectorProps {
  tripId: string;
  currentStatus: TripDbStatus;
  hasPendingReceipts: boolean;
  hasExpenses: boolean;
  isPersonal: boolean;
  onStatusChange?: (newStatus: TripDbStatus) => void;
  trip?: any; // Lo dejamos opcional por si acaso se pasa el objeto entero
}

export function TripStatusSelector({ trip, hasPendingReceipts, hasExpenses }: TripStatusSelectorProps) { // <-- ¡Actualizar Destructuring!
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { label, color, actions, visualStatus } = getTripState(trip);

  // Requisito: Solo se puede eliminar si NO está bloqueado (reportado o cerrado).
  const canDeleteTrip = trip.status === 'open';

  // 2. CASO ESPECIAL: REPORTADO
  // ... (código que se mantiene) ...
  if (actions.isLocked && !actions.canReopen) {
    return (
      <Badge variant="outline" className={`h-8 px-3 text-xs font-bold ${color}`}>
        {label}
      </Badge>
    );
  }

  // 3. VALIDACIÓN DE CIERRE EXTRA (Regla de negocio: Tickets pendientes)
  const isClosingBlocked = !actions.canClose || (hasPendingReceipts && trip.status !== 'closed');

  async function handleValueChange(newValue: string) {
    // Protección doble para cerrar
    if (newValue === 'closed' && hasPendingReceipts) {
      toast.error("⛔ No puedes cerrar: Faltan tickets por justificar.");
      return;
    }
    
    if (newValue === 'delete') return; // Se gestiona con AlertDialog

    const statusToSend = newValue as TripDbStatus; 
    
    const res = await updateTripStatus(trip.id, statusToSend);
    
    if (res?.error) {
      toast.error("Error al actualizar estado");
    } else {
      toast.success("Estado actualizado");
    }
  }
  
  async function handleDeleteTrip() {
    setIsDeleting(true);
    const res = await deleteTrip(trip.id);
    setIsDeleting(false);
    
    if (res?.error) {
      // Si el error es por "No se puede eliminar un viaje cerrado o reportado", avisamos
      if (res.error.includes('cerrado o reportado')) {
        toast.error('❌ Error: El viaje no puede eliminarse en su estado actual.');
      } else {
        toast.error(`Error al eliminar viaje: ${res.error}`);
      }
      
    } else {
      toast.success("Viaje eliminado con éxito.");
      router.push('/travel'); 
    }
  }

  return (
    <AlertDialog>
      <Select 
        value={trip.status} 
        onValueChange={handleValueChange}
      >
        <SelectTrigger 
          className={`w-[180px] h-8 text-xs font-bold border transition-colors ${color}`}
        >
          <span>{label}</span>
        </SelectTrigger>
        
        <SelectContent align="end">
          {/* OPCIÓN 1: ESTADO ABIERTO */}
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
              
              {isClosingBlocked && trip.status !== 'closed' && (
                <span className="text-[10px] text-red-400 font-normal">
                  {hasPendingReceipts 
                    ? 'Faltan tickets' 
                    : '(Aún no realizado)' 
                  }
                </span>
              )}
            </div>
          </SelectItem>

          {/* OPCIÓN 3: ELIMINAR */}
          {canDeleteTrip && (
						<>
							<div className="h-px bg-slate-100 my-1" />
							
							{/* Aquí usamos el AlertDialogTrigger y envolvemos un Button 
								para que el SelectContent lo vea como un elemento que debe cerrar el desplegable, 
								pero el Trigger se asegura de abrir el modal. */}
							<AlertDialogTrigger asChild>
								<Button
									variant="ghost"
									// Usamos w-full y text-left para que parezca una opción de SelectItem
									className="w-full justify-start text-red-600 font-medium hover:bg-red-50 text-sm h-8 px-2"
								>
									<span className="flex items-center gap-2">
										🗑️ ELIMINAR VIAJE
									</span>
								</Button>
							</AlertDialogTrigger>
						</>
					)}
				</SelectContent>
			</Select>
      
      {/* Diálogo de Confirmación de Eliminación */}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción es **irreversible**. Eliminarás el viaje **{trip.name}**.
            {hasExpenses 
              ? (
                <div className='mt-2 p-2 border-l-4 border-red-500 bg-red-50 text-sm'>
                  <p className="font-bold text-red-700">⚠️ ADVERTENCIA DE GASTOS:</p>
                  <p>Este viaje tiene gastos asociados. Se eliminarán **todos los gastos** y se borrarán
                  **todos los archivos de recibos** del Storage de forma permanente.</p>
                </div>
              )
              : (
                <span className="font-bold"> No tiene gastos asociados, se eliminará solo el registro del viaje.</span>
              )
            }
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDeleteTrip} 
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
          >
            {isDeleting ? (
              <span className="flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Eliminando...
              </span>
            ) : (
              'Eliminar Viaje'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}