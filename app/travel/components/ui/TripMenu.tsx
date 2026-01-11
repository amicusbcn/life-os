// app/travel/components/TripMenu.tsx
'use client'

import React, { useTransition } from 'react'
import { DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu'
import { updateTripStatus, deleteTrip } from '@/app/travel/actions'
import { TravelTrip, TripDbStatus, TravelCategory, TravelMileageTemplate } from '@/types/travel'
import { getTripState } from '@/utils/trip-logic'
import { Lock, RotateCcw, Trash2, ExternalLink, Loader2, Archive, ArchiveRestore, Gauge, Tag, History, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// Dialogs
import { MileageSettingsDialog } from "../dialogs/MileageSettingsDialog"
import { CategorySettingsDialog } from '../dialogs/CategorySettingsDialog'

interface TripMenuProps {
  trip: TravelTrip;
  categories: TravelCategory[];
  hasPendingReceipts: boolean;
  pendingTicketsCount: number;
}

export function TripMenu({ trip, categories, hasPendingReceipts, pendingTicketsCount}: TripMenuProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  
  const { actions, visualStatus } = getTripState(trip)
  const isPersonal = trip.context === 'personal'
  const hasReport = !!trip.report_id
  const canCloseManual = trip.status === 'open' && visualStatus === 'completed' && !hasPendingReceipts;
  
  const handleAction = (newStatus: TripDbStatus, message: string) => {
    startTransition(async () => {
      const res = await updateTripStatus(trip.id, newStatus)
      if (res.success) {
        toast.success(message)
        router.refresh()
      }
    })
  }

  const handleDelete = () => {
    if (!confirm("¿Eliminar viaje y gastos?")) return
    startTransition(async () => {
      const res = await deleteTrip(trip.id)
      if (res.success) {
        toast.success("Viaje eliminado")
        router.push(`/travel/${trip.context}`)
      }
    })
  }

  return (
    <>
      <DropdownMenuLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 py-2">
        Gestión del Viaje
      </DropdownMenuLabel>

      {/* --- SECCIÓN A: ACCIONES DE ESTADO (Contextuales) --- */}
      {!isPersonal ? (
        <>
          {canCloseManual && (
            <DropdownMenuItem onClick={() => handleAction('closed', "Viaje cerrado")} disabled={isPending} className="py-2.5 cursor-pointer font-medium">
              {isPending ? <Loader2 className="mr-3 h-4 w-4 animate-spin" /> : <Lock className="mr-3 h-4 w-4 text-orange-500" />}
              Cerrar Viaje
            </DropdownMenuItem>
          )}
          {trip.status === 'open' && visualStatus === 'completed' && hasPendingReceipts && (
            <DropdownMenuItem disabled className="py-2.5 opacity-60 flex flex-col items-start gap-1">
              <div className="flex items-center text-slate-400">
                <Lock className="mr-3 h-4 w-4" />
                <span className="font-medium">Cerrar Viaje</span>
              </div>
              <div className="flex items-center gap-1 ml-7 text-[10px] text-orange-600 font-bold bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">
                <AlertCircle className="h-3 w-3" />
                FALTAN {pendingTicketsCount} TICKETS
              </div>
            </DropdownMenuItem>
          )}
          {actions.canReopen && (
            <DropdownMenuItem onClick={() => handleAction('open', "Viaje reabierto")} disabled={isPending} className="py-2.5 cursor-pointer text-emerald-600 font-medium">
              <RotateCcw className="mr-3 h-4 w-4" /> Reabrir Viaje
            </DropdownMenuItem>
          )}
          {hasReport && (
            <Link href={`/travel/reports/${trip.report_id}`} className="w-full">
              <DropdownMenuItem className="py-2.5 cursor-pointer text-indigo-600 font-bold bg-indigo-50/50 focus:bg-indigo-100">
                <ExternalLink className="mr-3 h-4 w-4" /> Ver Liquidación
              </DropdownMenuItem>
            </Link>
          )}
        </>
      ) : (
        <>
          <DropdownMenuItem onClick={() => handleAction(trip.status === 'archived' ? 'open' : 'archived', trip.status === 'archived' ? 'Desarchivado' : 'Archivado')} disabled={isPending} className="py-2.5 cursor-pointer font-medium text-slate-700">
            {trip.status === 'archived' ? <ArchiveRestore className="mr-3 h-4 w-4 text-emerald-500" /> : <Archive className="mr-3 h-4 w-4 text-slate-400" />}
            {trip.status === 'archived' ? 'Desarchivar' : 'Archivar'} Viaje
          </DropdownMenuItem>
          
        </>
      )}

      

            {/* --- SECCIÓN C: PELIGRO --- */}
      {(isPersonal || !actions.isLocked) && (
        <>
          <DropdownMenuItem onClick={handleDelete} disabled={isPending} className="py-2.5 cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50">
            <Trash2 className="mr-3 h-4 w-4" /> Eliminar Viaje
          </DropdownMenuItem>
        </>
      )}
        
          <DropdownMenuSeparator />
      {/* --- SECCIÓN B: GESTIÓN DEL MÓDULO (Lo que pedías) --- */}
      <DropdownMenuLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 py-2">
        Configuración
      </DropdownMenuLabel>

      <CategorySettingsDialog initialCategories={categories} context={trip.context}>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="py-2.5 cursor-pointer text-slate-700">
          <Tag className="mr-3 h-4 w-4 text-slate-400" /> Categorías de {isPersonal ? 'Viaje' : 'Gasto'}
        </DropdownMenuItem>
      </CategorySettingsDialog>
    </>
  )
}