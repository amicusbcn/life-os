// app/finance-shared/components/FinanceSharedMenu.tsx
'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Settings } from 'lucide-react'
import { GroupSettingsDialog } from './dialogs/GroupSettingsDialog'
import { ImportCsvDialog } from './dialogs/ImportCsvDialog' // <--- IMPORTAR
import { DashboardData } from '@/app/finance-shared/data'
import { DropdownMenuSeparator } from '@/components/ui/dropdown-menu'

interface MenuProps {
    groupId?: string
    data?: DashboardData
    currentUserId: string // <--- NUEVO: Necesario para comprobar permisos
}

export function FinanceSharedMenu({ groupId, data, currentUserId }: MenuProps) {
  if (!groupId || !data) return null

  // Comprobar si soy admin
  const myMember = data.members.find(m => m.user_id === currentUserId)
  const isAdmin = myMember?.role === 'admin'
  const menuItems = [
          {
              id: 'importer',
              component: (
                  <ImportCsvDialog groupId={groupId} />
              )
          },
          {
              id: 'config',
              component: (
                <GroupSettingsDialog groupId={groupId} initialData={data}>
                  <Button variant="outline" size="sm" className="gap-2 text-slate-600">
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline">Configuración del grupo</span>
                  </Button>
                </GroupSettingsDialog>
              )
          }
        ]
  return (

            <div key="finance-menu-wrapper">
            {menuItems.map((item) => (
                <React.Fragment key={item.id}>
                    {item.component}
                </React.Fragment>
            ))}
            <DropdownMenuSeparator />
        </div>
  )
}

