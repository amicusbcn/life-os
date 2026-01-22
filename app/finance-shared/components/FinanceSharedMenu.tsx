'use client'

import React from 'react'
import { Settings, FileUp, Link as LinkIcon, UserCircle } from 'lucide-react' 
import { GroupSettingsDialog } from './dialogs/GroupSettingsDialog'
import { ImportCsvDialog } from './dialogs/ImportCsvDialog'
import { DashboardData } from '@/types/finance-shared'
import { DropdownMenuSeparator, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

interface MenuProps {
    groupId?: string
    data?: DashboardData
    currentUserId: string 
    isAdminGlobal?: boolean
    isDebugActive: boolean
}

export function FinanceSharedMenu({ groupId, data, currentUserId,isAdminGlobal,isDebugActive}: MenuProps) {
  if (!groupId || !data) return null

  // 1. Identificamos al miembro actual y su rol en este grupo específico
  const myMember = data.members.find(m => m.user_id === currentUserId)
  const isGroupAdmin = myMember?.role === 'admin'

  const handleCopyLink = () => {
      const url = `${window.location.origin}/shared/finance-shared/${groupId}`
      navigator.clipboard.writeText(url)
          .then(() => toast.success('Enlace copiado al portapapeles'))
          .catch(() => toast.error('Error al copiar el enlace'))
  }

  return (
      <div key="finance-menu-wrapper">
          {/* Opción disponible para todos los miembros */}
          <DropdownMenuItem className="cursor-pointer" onSelect={handleCopyLink}>
              <LinkIcon className="mr-2 h-4 w-4" />
              <span>Link para reportar un gasto</span>
          </DropdownMenuItem>

          {/* Opciones exclusivas para Administradores del grupo */}
          {isGroupAdmin && (
            <>
              <DropdownMenuSeparator />
              
              <ImportCsvDialog groupId={groupId}>
                  <DropdownMenuItem className="cursor-pointer" onSelect={(e) => e.preventDefault()}>
                      <FileUp className="mr-2 h-4 w-4" />
                      <span>Importar CSV</span>
                  </DropdownMenuItem>
              </ImportCsvDialog>

              <GroupSettingsDialog groupId={groupId} initialData={data}>
                  <DropdownMenuItem className="cursor-pointer" onSelect={(e) => e.preventDefault()}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Configuración del grupo</span>
                  </DropdownMenuItem>
              </GroupSettingsDialog>
            </>
          )}
          
          <DropdownMenuSeparator />
          {isAdminGlobal && (
            <DropdownMenuItem 
                className="cursor-pointer text-indigo-600 font-medium"
                onSelect={() => {
                const url = new URL(window.location.href);
                if (isDebugActive) url.searchParams.delete('debug');
                else url.searchParams.set('debug', 'true');
                window.location.href = url.toString();
                }}
            >
                <UserCircle className="mr-2 h-4 w-4" />
                <span>{isDebugActive ? 'Desactivar Modo Dios' : 'Activar Modo Dios'}</span>
            </DropdownMenuItem>
            )}
      </div>
  )
}