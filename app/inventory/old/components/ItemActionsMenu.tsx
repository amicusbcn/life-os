// app/inventory/[id]/components/ItemActionsMenu.tsx
'use client'

import React from 'react';
import { Wrench, History, Edit, Trash2, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { NewMaintenanceDialog } from '../NewMaintenanceDialog';
import { NewLoanDialog } from '../NewLoanDialog';

export function ItemActionsMenu({ item, categories, locations, profiles, mode }: any) {
  const router = useRouter();

  if (mode === 'operative') {
    return (
      <SidebarMenu>
        {/* VOLVER */}
        <SidebarMenuItem>
          <SidebarMenuButton onClick={() => router.push('/inventory')} className="text-slate-500 mb-2">
            <ChevronLeft className="h-4 w-4" />
            <span className="font-bold">Volver al Inventario</span>
          </SidebarMenuButton>
        </SidebarMenuItem>

        {/* ACCIONES PRINCIPALES */}
        <SidebarMenuItem>
          <NewMaintenanceDialog itemId={item.id} profiles={profiles}>
            <SidebarMenuButton size="lg" className="bg-indigo-600 text-white hover:bg-indigo-700 hover:text-white shadow-md mb-2">
              <Wrench className="h-4 w-4" />
              <span className="font-bold">Registrar Mantenimiento</span>
            </SidebarMenuButton>
          </NewMaintenanceDialog>
        </SidebarMenuItem>

        <SidebarMenuItem>
          <NewLoanDialog itemId={item.id}>
            <SidebarMenuButton size="lg" className="bg-orange-500 text-white hover:bg-orange-600 hover:text-white shadow-md">
              <History className="h-4 w-4" />
              <span className="font-bold">Nuevo Préstamo</span>
            </SidebarMenuButton>
          </NewLoanDialog>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton className="text-slate-600">
          <Edit className="h-4 w-4" />
          <span>Editar Ítem</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton className="text-red-500 hover:text-red-600 hover:bg-red-50">
          <Trash2 className="h-4 w-4" />
          <span>Eliminar Ítem</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}