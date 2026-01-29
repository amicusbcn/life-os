// app/travel/components/ui/TravelModuleMenu.tsx
'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Gauge, Tag, History, TreePalm, Plus } from 'lucide-react'
import { TravelContext, TravelMileageTemplate, TravelCategory } from '@/types/travel'
import { MileageSettingsDialog } from "../dialogs/MileageSettingsDialog"
import { CategorySettingsDialog } from '../dialogs/CategorySettingsDialog'
import { SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar'
import { NewTripDialog } from '../dialogs/NewTripDialog'

interface TravelModuleMenuProps {
  context: TravelContext;
  templates: TravelMileageTemplate[];
  categories: TravelCategory[];
  mode: 'operative' | 'settings'; // ✨ Añadido para el Sidebar
}

export function TravelModuleMenu({ context, templates, categories, mode, employers }: TravelModuleMenuProps & { employers: any[] }) {
  const router = useRouter()
  const isPersonal = context === 'personal'

  // --- RENDERIZADO OPERATIVO (Cuerpo del Sidebar) ---
  if (mode === 'operative') {
    return (
      <>
      <SidebarMenuItem>
          <NewTripDialog employers={employers} context={context}>
            <SidebarMenuButton 
              size="lg" 
              className={`text-white hover:text-white mt-4 ${
                isPersonal ? "bg-green-600 hover:bg-green-700 shadow-green-100" : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100"
              } shadow-lg`}
            >
              {isPersonal ? <TreePalm className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              <span className="font-bold">{isPersonal ? "Nueva Escapada" : "Nuevo Viaje"}</span>
            </SidebarMenuButton>
          </NewTripDialog>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton 
            onClick={() => router.push(`/travel/${context}/archive`)} 
            tooltip="Histórico de Viajes"
          >
            <History className="h-4 w-4 text-slate-500" />
            <span>Histórico de Viajes</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </>
    )
  }

  // --- RENDERIZADO DE CONFIGURACIÓN (Pie del Sidebar) ---
  return (
    <>
      <SidebarMenuItem>
        <MileageSettingsDialog initialTemplates={templates}>
          <SidebarMenuButton tooltip="Recorridos Fijos">
            <Gauge className="h-4 w-4 text-slate-500" />
            <span>Recorridos Fijos</span>
          </SidebarMenuButton>
        </MileageSettingsDialog>
      </SidebarMenuItem>

      <SidebarMenuItem>
        <CategorySettingsDialog initialCategories={categories} context={context}>
          <SidebarMenuButton tooltip={`Categorías de ${isPersonal ? 'Viaje' : 'Gasto'}`}>
            <Tag className="h-4 w-4 text-slate-500" />
            <span>Categorías de {isPersonal ? 'Viaje' : 'Gasto'}</span>
          </SidebarMenuButton>
        </CategorySettingsDialog>
      </SidebarMenuItem>
    </>
  )
}