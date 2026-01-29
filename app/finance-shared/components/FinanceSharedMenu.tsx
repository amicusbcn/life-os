// app/finance-shared/components/FinanceSharedMenu.tsx
'use client'

import React from 'react'
import { Settings, FileUp, Link as LinkIcon, UserCircle } from 'lucide-react' 
import { GroupSettingsDialog } from './dialogs/GroupSettingsDialog'
import { ImportCsvDialog } from './dialogs/ImportCsvDialog'
import { DashboardData } from '@/types/finance-shared'
import { 
    SidebarMenuItem, 
    SidebarMenuButton 
} from '@/components/ui/sidebar'
import { toast } from 'sonner'

interface MenuProps {
    groupId?: string
    data?: DashboardData
    currentUserId: string 
    isAdminGlobal?: boolean
    isDebugActive: boolean
    mode: 'operative' | 'settings' // Añadimos modo para decidir qué renderizar
}

export function FinanceSharedMenu({ groupId, data, currentUserId, isAdminGlobal, isDebugActive, mode }: MenuProps) {
    if (!groupId || !data) return null

    const myMember = data.members.find(m => m.user_id === currentUserId)
    const isGroupAdmin = myMember?.role === 'admin'

    const handleCopyLink = () => {
        const url = `${window.location.origin}/shared/finance-shared/${groupId}`
        navigator.clipboard.writeText(url)
            .then(() => toast.success('Enlace copiado al portapapeles'))
            .catch(() => toast.error('Error al copiar el enlace'))
    }

    // --- RENDERIZADO OPERATIVO (Cuerpo del Sidebar) ---
    if (mode === 'operative') {
        return (
            <>
                <SidebarMenuItem>
                    <SidebarMenuButton onClick={handleCopyLink} tooltip="Link para reportar gasto">
                        <LinkIcon className="h-4 w-4" />
                        <span>Link de reporte rápido</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                {isGroupAdmin && (
                    <SidebarMenuItem>
                        <ImportCsvDialog groupId={groupId}>
                            <SidebarMenuButton tooltip="Importar CSV">
                                <FileUp className="h-4 w-4" />
                                <span>Importar CSV</span>
                            </SidebarMenuButton>
                        </ImportCsvDialog>
                    </SidebarMenuItem>
                )}
            </>
        )
    }

    // --- RENDERIZADO DE CONFIGURACIÓN (Pie del Sidebar) ---
    return (
        <>
            {isGroupAdmin && (
                <>
                    <SidebarMenuItem>
                        <GroupSettingsDialog groupId={groupId} initialData={data}>
                            <SidebarMenuButton tooltip="Configuración del grupo">
                                <Settings className="h-4 w-4" />
                                <span>Ajustes del Grupo</span>
                            </SidebarMenuButton>
                        </GroupSettingsDialog>
                    </SidebarMenuItem>
                </>
            )}

            {isAdminGlobal && (
                <SidebarMenuItem>
                    <SidebarMenuButton 
                        className="text-indigo-600 font-medium"
                        onClick={() => {
                            const url = new URL(window.location.href);
                            if (isDebugActive) url.searchParams.delete('debug');
                            else url.searchParams.set('debug', 'true');
                            window.location.href = url.toString();
                        }}
                    >
                        <UserCircle className="h-4 w-4" />
                        <span>{isDebugActive ? 'Desactivar Modo Dios' : 'Activar Modo Dios'}</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            )}
        </>
    )
}