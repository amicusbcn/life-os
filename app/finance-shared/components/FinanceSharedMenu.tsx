// /app/finance-shared/components/FinanceSharedMenu.tsx
'use client'

import React from 'react'
import { 
    Settings, FileUp, Link as LinkIcon, UserCircle, 
    PlusCircle, List, LayoutDashboard, Inbox, Scale, 
    Calendar, ChevronLeft, ChevronRight 
} from 'lucide-react' 
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { 
    SidebarMenuItem, 
    SidebarMenuButton,
    SidebarMenuBadge,
    useSidebar,
    SidebarSeparator
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { DashboardData } from '@/types/finance-shared'
import { GroupSettingsDialog } from './dialogs/GroupSettingsDialog'
import { ImportCsvDialog } from './dialogs/ImportCsvDialog'

interface MenuProps {
    groupId?: string
    data?: DashboardData
    currentUserId: string 
    isAdminGlobal?: boolean
    isDebugActive: boolean
    mode: 'operative' | 'settings'
}

export function FinanceSharedMenu({ groupId, data, currentUserId, isAdminGlobal, isDebugActive, mode }: MenuProps) {
    const searchParams = useSearchParams()
    const pathname = usePathname()
    const router = useRouter()
    const { open } = useSidebar()
    
    if (!groupId || !data) return null

    const activeView = searchParams.get('view') || 'general'
    const currentYear = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
    const thisYear = new Date().getFullYear()

    const myMember = data.members.find(m => m.user_id === currentUserId)
    const isGroupAdmin = myMember?.role === 'admin'

    // Función de navegación centralizada
    const navigateTo = (view?: string, year?: number) => {
        const params = new URLSearchParams(searchParams.toString())
        if (view) params.set('view', view)
        if (year) params.set('year', year.toString())
        router.push(`${pathname}?${params.toString()}`)
    }

    const handleCopyLink = () => {
        const url = `${window.location.origin}/shared/finance-shared/${groupId}`
        navigator.clipboard.writeText(url)
            .then(() => toast.success('Enlace copiado'))
            .catch(() => toast.error('Error al copiar'))
    }

    // --- RENDERIZADO OPERATIVO (Cuerpo del Sidebar) ---
    if (mode === 'operative') {
        return (
            <div className="flex flex-col gap-1">
                {/* 1. NAVEGADOR DE AÑO (Arriba) */}
                <div className="mb-4 px-2">
                    {!open ? (
                        /* VISTA COLAPSADA: Solo un icono que indique el año */
                        <SidebarMenuItem>
                            <SidebarMenuButton tooltip={`Año ${currentYear}`} className="justify-center">
                                <span className="text-[10px] font-bold text-indigo-600">{currentYear.toString().slice(-2)}'</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ) : (
                        /* VISTA ABIERTA: Tu navegador completo */
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">
                                Ejercicio
                            </label>
                            <div className="flex items-center justify-between bg-slate-100/50 rounded-lg p-1 border border-slate-200/60">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => navigateTo(undefined, currentYear - 1)}
                                    className="h-7 w-7 hover:bg-white"
                                >
                                    <ChevronLeft className="h-4 w-4 text-slate-600" />
                                </Button>

                                <div className="flex items-center gap-2 font-bold text-xs text-slate-700">
                                    <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                                    <span>{currentYear}</span>
                                </div>

                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    disabled={currentYear >= thisYear}
                                    onClick={() => navigateTo(undefined, currentYear + 1)}
                                    className="h-7 w-7 hover:bg-white disabled:opacity-20"
                                >
                                    <ChevronRight className="h-4 w-4 text-slate-600" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="h-px bg-slate-100 my-4 mx-2" />
                {/* 1. BOTÓN ACCIÓN RÁPIDA */}
                <SidebarMenuItem>
                    <SidebarMenuButton 
                        onClick={() => window.dispatchEvent(new CustomEvent('open-new-tx'))}
                        className="bg-indigo-600 text-white hover:bg-indigo-700 hover:text-white transition-colors mb-2"
                    >
                        <PlusCircle className="h-4 w-4" />
                        <span className="font-bold">Nuevo Gasto</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>

                {/* 2. NAVEGACIÓN DE VISTAS (Los antiguos Tabs) */}
                <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => navigateTo('dashboard')} isActive={activeView === 'dashboard'}>
                        <LayoutDashboard className="h-4 w-4" />
                        <span>Resumen Anual</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => navigateTo('general')} isActive={activeView === 'general'}>
                        <List className="h-4 w-4" />
                        <span>Movimientos</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => navigateTo('mine')} isActive={activeView === 'mine'}>
                        <LayoutDashboard className="h-4 w-4" />
                        <span>Mis Gastos</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => navigateTo('pending')} isActive={activeView === 'pending'}>
                        <Inbox className="h-4 w-4" />
                        <span>Bandeja Pendiente</span>
                        {/* Aquí puedes inyectar un contador si lo tienes en data */}
                        <SidebarMenuBadge className="bg-amber-100 text-amber-700">!</SidebarMenuBadge>
                    </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => navigateTo('balances')} isActive={activeView === 'balances'}>
                        <Scale className="h-4 w-4" />
                        <span>Saldos y Repartos</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarSeparator />
                <SidebarMenuItem>
                    <SidebarMenuButton onClick={handleCopyLink}>
                        <LinkIcon className="h-4 w-4" />
                        <span>Link de reporte rápido</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>

                {isGroupAdmin && (
                    <SidebarMenuItem>
                        <ImportCsvDialog groupId={groupId}>
                            <SidebarMenuButton>
                                <FileUp className="h-4 w-4" />
                                <span>Importar CSV</span>
                            </SidebarMenuButton>
                        </ImportCsvDialog>
                    </SidebarMenuItem>
                )}
            </div>
        )
    }

    // --- RENDERIZADO DE CONFIGURACIÓN (Pie del Sidebar) ---
    return (
        <div className="flex flex-col gap-1">
            {isGroupAdmin && (
                <SidebarMenuItem>
                    <GroupSettingsDialog groupId={groupId} initialData={data}>
                        <SidebarMenuButton tooltip="Configuración del grupo">
                            <Settings className="h-4 w-4" />
                            <span>Ajustes del Grupo</span>
                        </SidebarMenuButton>
                    </GroupSettingsDialog>
                </SidebarMenuItem>
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
        </div>
    )
}