'use client'

import Link from 'next/link'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FeedbackDialog } from './FeedbackDialog'
import { AdminNotificationDialog } from './AdminNotificationDialog' // <--- Importamos
import { UserMenuProps } from '@/types/common' 
import { LogOut, MoreVertical, Zap, Megaphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { logout } from '@/app/login/actions' 

export function UserMenu({ userEmail, userRole, additionalItems = [], currentPath }: UserMenuProps) {
    const isAdmin = userRole === 'admin'; // O tu lógica de roles
    
    // Helper para clases (sin cambios)
    const defaultClasses = "cursor-pointer";
    const activeClasses = "bg-slate-100 font-semibold text-indigo-600 pointer-events-none";

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" title="Opciones de usuario">
                    <MoreVertical className="h-4 w-4" /> 
                </Button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{userEmail}</DropdownMenuLabel>
       
                {/* 1. RENDERIZADO DE ELEMENTOS ADICIONALES */}
                {additionalItems.length > 0 && (
                    <>
                        <DropdownMenuSeparator />
                        {additionalItems}
                    </>
                )}

                <DropdownMenuSeparator />

                {/* 2. OPCIONES DE ADMIN (NUEVO) */}
                {isAdmin && (
                    <>
                        {/* Envolvemos el MenuItem con nuestro Dialog */}
                        <AdminNotificationDialog>
                            <DropdownMenuItem 
                                className="cursor-pointer text-indigo-600 focus:text-indigo-700 focus:bg-indigo-50"
                                onSelect={(e) => e.preventDefault()} // <--- VITAL: Evita que se cierre el dropdown
                            >
                                <Megaphone className="mr-2 h-4 w-4" />
                                <span>Difusión (Admin)</span>
                            </DropdownMenuItem>
                        </AdminNotificationDialog>
                        <DropdownMenuSeparator />
                    </>
                )}

                {/* 3. CORE: BUZÓN DE SUGERENCIAS */}
                <FeedbackDialog /> 

                {/* 4. CORE: HISTORIAL DE VERSIONES */}
                <Link href="/settings/changelog" passHref>
                  <DropdownMenuItem className="cursor-pointer">
                    <Zap className="mr-2 h-4 w-4 text-amber-500" />
                    <span>Historial de Versiones</span>
                  </DropdownMenuItem>
                </Link>
                
                {/* 5. CORE: CERRAR SESIÓN */}
                <DropdownMenuSeparator />
                <form action={logout}>
                    <button type="submit" className="w-full">
                        <DropdownMenuItem className="text-red-600 focus:bg-red-50 focus:text-red-600 cursor-pointer">
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Cerrar Sesión</span>
                        </DropdownMenuItem>
                    </button>
                </form>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}