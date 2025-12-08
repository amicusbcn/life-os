// components/UserMenu.tsx

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
import { AppWindow, LogOut, MoreVertical, User, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { logout } from './login/actions' // Importamos la server action

// Definimos los tipos para las props (propiedades) que recibirá el componente
interface UserMenuProps {
  userEmail: string;
  userRole: string | null;
}

export function UserMenu({ userEmail, userRole }: UserMenuProps) {
  const isAdmin = userRole === 'admin';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* El botón de tres puntos (MoreVertical) */}
        <Button variant="ghost" size="icon" title="Opciones de usuario">
          <MoreVertical className="h-4 w-4" /> 
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-56">
        {/* Etiqueta con el email del usuario */}
        <DropdownMenuLabel className="truncate">{userEmail}</DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        {/* Opción: Mi Perfil */}
        <Link href="/profile" passHref>
          <DropdownMenuItem className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            <span>Mi perfil</span>
          </DropdownMenuItem>
        </Link>

        {/* Opción: Usuarios (solo para admins) */}
        {isAdmin && (
          <Link href="/users" passHref>
            <DropdownMenuItem className="cursor-pointer">
              <Users className="mr-2 h-4 w-4" />
              <span>Usuarios</span>
            </DropdownMenuItem>
          </Link>
        )}

        {/* Opción: Aplicaciones (solo para admins) */}
        {isAdmin && (
          <DropdownMenuItem className="cursor-pointer" disabled>
            <AppWindow className="mr-2 h-4 w-4" />
            <span>Aplicaciones</span>
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        {/* Opción 2: Cerrar Sesión (usando una Server Action) */}
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