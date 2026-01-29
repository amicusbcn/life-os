'use client'

import React, { useTransition } from 'react'
import { updateTripStatus, deleteTrip } from '@/app/travel/actions'
import { TravelTrip, TripDbStatus, TravelCategory, TravelMileageTemplate } from '@/types/travel'
import { getTripState } from '@/utils/trip-logic'
import { 
  Lock, RotateCcw, Trash2, ExternalLink, Loader2, Archive, 
  ArchiveRestore, Tag, AlertCircle, ChevronLeft, Plus 
} from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { SidebarMenuItem, SidebarMenuButton, SidebarMenuBadge, SidebarMenu, SidebarSeparator } from '@/components/ui/sidebar'
import { CategorySettingsDialog } from '../dialogs/CategorySettingsDialog'
import { NewExpenseDialog } from '../dialogs/NewExpenseDialog'

interface TripMenuProps {
  trip: TravelTrip;
  categories: TravelCategory[];
  mileageTemplates?: TravelMileageTemplate[]; // ✨ Añadido para el diálogo
  hasPendingReceipts: boolean;
  pendingTicketsCount: number;
  mode: 'operative' | 'settings';
}

export function TripMenu({ trip, categories, mileageTemplates, hasPendingReceipts, pendingTicketsCount, mode }: TripMenuProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  
  const { actions, visualStatus } = getTripState(trip)
  const isPersonal = trip.context === 'personal'
  const hasReport = !!trip.report_id
  const isLocked = trip.status === 'closed' || trip.status === 'reported' || trip.status === 'archived'
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

  // --- RENDERIZADO OPERATIVO (Cuerpo del Sidebar) ---
  if (mode === 'operative') {
    return (
      <SidebarMenu>
        {/* 1. ACCIÓN PRINCIPAL: AÑADIR GASTO (Solo si no está bloqueado) */}
        {!isLocked && (
          <SidebarMenuItem>
            <NewExpenseDialog 
              tripId={trip.id} 
              categories={categories} 
              templates={mileageTemplates || []} 
              context={trip.context}
            >
              <SidebarMenuButton 
                size="lg" 
                className="bg-indigo-600 text-white hover:bg-indigo-700 hover:text-white shadow-lg mt-4"
              >
                <Plus className="h-5 w-5" />
                <span className="font-bold text-base">Añadir Gasto</span>
              </SidebarMenuButton>
            </NewExpenseDialog>
          </SidebarMenuItem>
        )}

        {/* 3. ACCIONES DE ESTADO (Cerrar, Reabrir, etc.) */}
        {!isPersonal ? (
          <>
            {canCloseManual && (
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => handleAction('closed', "Viaje cerrado")} disabled={isPending}>
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4 text-orange-500" />}
                  <span>Cerrar Viaje</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {/* CASO: Viaje completado pero faltan tickets (Botón deshabilitado con aviso) */}
            {trip.status === 'open' && visualStatus === 'completed' && hasPendingReceipts && (
                <SidebarMenuItem>
                    <SidebarMenuButton disabled className="opacity-60 flex-col items-start h-auto py-2">
                        <div className="flex items-center w-full text-slate-400">
                            <Lock className="mr-2 h-4 w-4" />
                            <span className="font-medium text-sm">Cerrar Viaje</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1 ml-6 text-[9px] text-orange-600 font-bold bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100 uppercase tracking-tighter">
                            <AlertCircle className="h-3 w-3" />
                            Faltan {pendingTicketsCount} tickets
                        </div>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            )}

            {/* CASO: El viaje puede ser reabierto */}
            {actions.canReopen && (
                <SidebarMenuItem>
                    <SidebarMenuButton 
                        onClick={() => handleAction('open', "Viaje reabierto")} 
                        disabled={isPending}
                        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                    >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        <span className="font-medium">Reabrir Viaje</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            )}
            {hasReport && (
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => router.push(`/travel/reports/${trip.report_id}`)} className="bg-indigo-50 text-indigo-600 font-bold hover:bg-indigo-100">
                  <ExternalLink className="h-4 w-4" />
                  <span>Ver Liquidación</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </>
        ) : (
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => handleAction(trip.status === 'archived' ? 'open' : 'archived', trip.status === 'archived' ? 'Desarchivado' : 'Archivado')} disabled={isPending}>
              {trip.status === 'archived' ? <ArchiveRestore className="h-4 w-4 text-emerald-500" /> : <Archive className="h-4 w-4 text-slate-400" />}
              <span>{trip.status === 'archived' ? 'Desarchivar' : 'Archivar'} Viaje</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}

        {/* ELIMINAR */}
        {(isPersonal || !actions.isLocked) && (
          <SidebarMenuItem className="mb-4 border-t border-slate-100 pt-2">
            <SidebarMenuButton onClick={handleDelete} disabled={isPending} className="text-red-500 hover:text-red-600">
              <Trash2 className="h-4 w-4" />
              <span>Eliminar Viaje</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
      </SidebarMenu>
    )
  }

  // --- RENDERIZADO DE CONFIGURACIÓN (Pie del Sidebar) ---
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <CategorySettingsDialog initialCategories={categories} context={trip.context}>
          <SidebarMenuButton tooltip={`Categorías`}>
            <Tag className="h-4 w-4 text-slate-500" />
            <span>Categorías de {isPersonal ? 'Viaje' : 'Gasto'}</span>
          </SidebarMenuButton>
        </CategorySettingsDialog>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}