// app/travel/components/ui/TravelModuleMenu.tsx
'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Gauge, Tag, History } from 'lucide-react'
import { TravelContext, TravelMileageTemplate, TravelCategory } from '@/types/travel'
import { MileageSettingsDialog } from "../dialogs/MileageSettingsDialog"
import { CategorySettingsDialog } from '../dialogs/CategorySettingsDialog'
// import { TravelCategorySettingsDialog } from "./dialogs/TravelCategorySettingsDialog" // Próximamente

interface TravelModuleMenuProps {
  context: TravelContext;
  templates: TravelMileageTemplate[];
  categories: TravelCategory[];
}

export function TravelModuleMenu({ context, templates, categories }: TravelModuleMenuProps) {
  const router = useRouter()
  const isPersonal = context === 'personal'

  return (
    <>
      {/* 1. Recorridos Fijos */}
      <MileageSettingsDialog initialTemplates={templates}>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer">
          <Gauge className="mr-2 h-4 w-4 text-slate-400" />
          <span>Recorridos Fijos</span>
        </DropdownMenuItem>
      </MileageSettingsDialog>

      {/* 2. Categorías (Aquí envolveremos con el Dialog cuando lo creemos) */}
      <CategorySettingsDialog 
          initialCategories={categories} // Deberás pasar esta prop desde la page.tsx
          context={context}
      >
          <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer">
              <Tag className="mr-2 h-4 w-4 text-slate-400" />
              <span>Categorías de {isPersonal ? 'Viaje' : 'Gasto'}</span>
          </DropdownMenuItem>
      </CategorySettingsDialog>

      {/* 3. Histórico (Nuevo acceso) */}
      <DropdownMenuItem 
        onClick={() => router.push(`/travel/${context}/archive`)} 
        className="cursor-pointer"
      >
        <History className="mr-2 h-4 w-4 text-slate-400" />
        <span>Histórico de Viajes</span>
      </DropdownMenuItem>

      <DropdownMenuSeparator />
    </>
  )
}