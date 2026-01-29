// app/settings/components/SettingsMenu.tsx
'use client'

import React from 'react'
import { Users, ShieldCheck, Megaphone, Lightbulb, ChevronRight } from "lucide-react"
import Link from 'next/link'
import { 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton, 
  SidebarMenuSub,
  SidebarMenuSubItem
} from "@/components/ui/sidebar"
import { cn } from '@/lib/utils'
import { AddModuleSheet } from '../modules/components/AddModuleSheet'
import { InviteUserDialog } from '../users/components/InviteUserDialog'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
interface Props {
  currentPanel?: 'users' | 'modules' | 'broadcast' | 'feedback'
}

export function SettingsMenu({ currentPanel}: Props) {
  return (
    <SidebarMenu>
      {/* 1. USUARIOS */}
      <Collapsible open={currentPanel === 'users'} className="group/collapsible">
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton 
              isActive={currentPanel === 'users'}
              tooltip="Usuarios"
              className={cn(
                  "transition-all duration-200",
                  // 1. ESTADO ACTIVO: Contraste total y bloqueo de hover
                  "data-[active=true]:!bg-indigo-700 data-[active=true]:!text-indigo-50 data-[active=true]:font-bold",
                  "data-[active=true]:hover:!bg-indigo-700 data-[active=true]:hover:!text-indigo-50", 
                  
                  // 2. ESTADO NORMAL: Texto slate y hover suave (solo si no está activo)
                  "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
              <Users className={cn("w-4 h-4", currentPanel === 'users' ? "text-indigo-50" : "text-slate-500")} />
              <Link href="/settings/users" className="flex-1">Usuarios y Accesos</Link>
              <ChevronRight className={cn("ml-auto h-3 w-3 transition-transform", currentPanel !== 'users' ? "hidden": "rotate-90")} />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              <SidebarMenuSubItem>
                {/* Variant minimal para que no rompa el diseño del sidebar */}
                <InviteUserDialog variant="sidebar" />
              </SidebarMenuSubItem>
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>

      {/* 2. MÓDULOS */}
      <Collapsible open={currentPanel === 'modules'} className="group/collapsible">
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton 
              isActive={currentPanel === 'modules'}
              tooltip="Módulos"
              className={cn(
                  "transition-all duration-200",
                  // 1. ESTADO ACTIVO: Contraste total y bloqueo de hover
                  "data-[active=true]:!bg-indigo-700 data-[active=true]:!text-indigo-50 data-[active=true]:font-bold",
                  "data-[active=true]:hover:!bg-indigo-700 data-[active=true]:hover:!text-indigo-50", 
                  
                  // 2. ESTADO NORMAL: Texto slate y hover suave (solo si no está activo)
                  "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
              <ShieldCheck className={cn("w-4 h-4", currentPanel === 'modules' ? "text-indigo-600" : "text-slate-500")} />
              <Link href="/settings/modules" className="flex-1">Módulos del Sistema</Link>
              <ChevronRight className={cn("ml-auto h-3 w-3 transition-transform", currentPanel !== 'modules' ? "hidden": "rotate-90")} />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              <SidebarMenuSubItem>
                <AddModuleSheet variant="sidebar" />
              </SidebarMenuSubItem>
              <SidebarMenuSubItem>
                <SidebarMenuButton size="sm" className="text-[11px] text-slate-500">
                   <span>• Reorganizar</span>
                </SidebarMenuButton>
              </SidebarMenuSubItem>
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>

      {/* 3. DIFUSIÓN */}
      <SidebarMenuItem>
        <SidebarMenuButton 
          isActive={currentPanel === 'broadcast'}
          className="text-amber-700 hover:bg-amber-50"
        >
          <Megaphone className="w-4 h-4" />
          <Link href="/settings/broadcast">Nueva Difusión</Link>
        </SidebarMenuButton>
      </SidebarMenuItem>

      {/* 4. SUGERENCIAS */}
      <SidebarMenuItem>
        <SidebarMenuButton 
          asChild 
          tooltip="Sugerencias"
          isActive={currentPanel === 'feedback'}
        >
          <Link href="/settings/feedback">
            <Lightbulb className={cn("w-4 h-4", currentPanel === 'feedback' ? "text-indigo-600" : "text-slate-500")} />
            <span>Sugerencias</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}