// app/core/components/UserMenu.tsx
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
import { UserMenuProps } from '@/types/common' 
import { LogOut, MoreVertical, Zap, User, Users, Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { logout } from '@/app/login/actions' 

export function UserMenu({ userEmail, userRole, additionalItems = [],currentPath }: UserMenuProps) {
	const isAdmin = userRole === 'admin';
	const renderMenuItem = (href: string, Icon: React.ElementType, label: string) => {
		const isActive = currentPath === href;
        
        // Clases base y activas
        const defaultClasses = "cursor-pointer";
        const activeClasses = "bg-slate-100 font-semibold text-indigo-600 pointer-events-none";

        return (
            <Link href={href} passHref key={href}>
                <DropdownMenuItem 
                    className={`${defaultClasses} ${isActive ? activeClasses : 'hover:bg-slate-50'}`}
                    // Desactivar interacción si está activo
                    disabled={isActive} 
                >
                    <Icon className="mr-2 h-4 w-4" />
                    <span>{label}</span>
                </DropdownMenuItem>
            </Link>
        );
    }
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon" title="Opciones de usuario">
					<MoreVertical className="h-4 w-4" /> 
				</Button>
			</DropdownMenuTrigger>
			
			<DropdownMenuContent align="end" className="w-56">
				<DropdownMenuLabel className="truncate">{userEmail}</DropdownMenuLabel>
       
        {/* 1. RENDERIZADO DE ELEMENTOS ADICIONALES (FLEXIBILIDAD TOTAL) */}
        {additionalItems.length > 0 && (
            <>
                <DropdownMenuSeparator />
                {additionalItems}
            </>
        )}


        {/* 2. CORE: BUZÓN DE SUGERENCIAS (MANTENIDO COMO FIJO) */}
        <FeedbackDialog /> 

        {/* 3. CORE: HISTORIAL DE VERSIONES (MANTENIDO COMO FIJO) */}
        <Link href="/settings/changelog" passHref>
          <DropdownMenuItem className="cursor-pointer">
            <Zap className="mr-2 h-4 w-4 text-indigo-500" />
            <span>Historial de Versiones</span>
          </DropdownMenuItem>
        </Link>
        
        {/* 4. CORE: CERRAR SESIÓN */}
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