// app/finance-shared/components/FinanceSharedMenu.tsx
'use client'

import React from 'react'
// Añadimos Link (lo renombro a LinkIcon para evitar conflictos si usas next/link)
import { Settings, FileUp, Link as LinkIcon } from 'lucide-react' 
import { GroupSettingsDialog } from './dialogs/GroupSettingsDialog'
import { ImportCsvDialog } from './dialogs/ImportCsvDialog'
import { DashboardData } from '@/types/finance-shared'
import { DropdownMenuSeparator, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { toast } from 'sonner' // Necesario para confirmar la copia

interface MenuProps {
    groupId?: string
    data?: DashboardData
    currentUserId: string 
}

export function FinanceSharedMenu({ groupId, data, currentUserId }: MenuProps) {
  if (!groupId || !data) return null

  const myMember = data.members.find(m => m.user_id === currentUserId)
  // const isAdmin = myMember?.role === 'admin' // Por si quieres restringirlo

  // Función para copiar
  const handleCopyLink = () => {
      // Construimos la URL completa usando el origen actual del navegador
      const url = `${window.location.origin}/finance-shared/${groupId}`
      
      navigator.clipboard.writeText(url)
          .then(() => toast.success('Enlace copiado al portapapeles'))
          .catch(() => toast.error('Error al copiar el enlace'))
  }

  const menuItems = [
      // 1. NUEVO: COPIAR ENLACE
      {
          id: 'copy-link',
          component: (
              <DropdownMenuItem className="cursor-pointer" onSelect={handleCopyLink}>
                  <LinkIcon className="mr-2 h-4 w-4" />
                  <span>Copiar enlace público</span>
              </DropdownMenuItem>
          )
      },
      // 2. IMPORTADOR
      {
          id: 'importer',
          component: (
              <ImportCsvDialog groupId={groupId}>
                  <DropdownMenuItem className="cursor-pointer" onSelect={(e) => e.preventDefault()}>
                      <FileUp className="mr-2 h-4 w-4" />
                      <span>Importar CSV</span>
                  </DropdownMenuItem>
              </ImportCsvDialog>
          )
      },
      // 3. CONFIGURACIÓN
      {
          id: 'config',
          component: (
              <GroupSettingsDialog groupId={groupId} initialData={data}>
                  <DropdownMenuItem className="cursor-pointer" onSelect={(e) => e.preventDefault()}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Configuración del grupo</span>
                  </DropdownMenuItem>
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