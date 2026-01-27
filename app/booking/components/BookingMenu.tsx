'use client'

import React from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { UserCircle, Settings, CalendarClock, UserCog, House, Building } from 'lucide-react'
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { BookingProperty } from '@/types/booking' 

interface BookingMenuProps {
  isSuperAdmin: boolean;
  isModuleAdmin: boolean;
  isPropertyOwner: boolean;
  isDebugActive: boolean;
  currentProperty?: BookingProperty;
}

export function BookingMenu({ 
  isSuperAdmin,
  isModuleAdmin, 
  isPropertyOwner,
  isDebugActive, 
  currentProperty, 
}: BookingMenuProps) {
  
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Función helper para añadir parámetros a la URL
  const openDialog = (dialogName: 'settings' | 'wizard' | 'admin') => {
      const params = new URLSearchParams(searchParams.toString());
      
      // Seteamos la clave única "dialog"
      params.set('dialog', dialogName);
      
      router.replace(`${pathname}?${params.toString()}`);
  };

  if (!isSuperAdmin && !isModuleAdmin && !isPropertyOwner && !currentProperty) return null;

  return (
      <>

          {/* NIVEL 0: MODO DIOS */}
          {isSuperAdmin && (
              <>
                <DropdownMenuItem 
                    className="cursor-pointer text-violet-600 font-bold bg-violet-50"
                    onSelect={() => {
                        const url = new URL(window.location.href);
                        if (isDebugActive) url.searchParams.delete('debug');
                        else url.searchParams.set('debug', 'true');
                        window.location.href = url.toString();
                    }}
                >
                    <UserCircle className="mr-2 h-4 w-4" />
                    <span>{isDebugActive ? 'Apagar Modo Dios' : 'Encender Modo Dios'}</span>
                </DropdownMenuItem>
      
              </>
          )}
          {/* NIVEL 1: ADMIN */}
          {isModuleAdmin && (
            <>
              <DropdownMenuItem className="cursor-pointer" onSelect={() => openDialog('admin')}>
                  <Settings className="mr-2 h-4 w-4 text-indigo-600" />
                  <span className="font-medium text-indigo-900">Administrar Módulo</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          {/* NIVEL 2: PROPIEDAD */}
          {currentProperty && (isPropertyOwner || isModuleAdmin) && (
             <>
              <div className="px-2 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1 mx-1">
                 Propiedad: {currentProperty.name}
              </div>
              <DropdownMenuItem className="cursor-pointer" onSelect={() => openDialog('settings')}>
                  <Building className="mr-2 h-4 w-4" /> 
                  <span>Configuración y Miembros</span>
              </DropdownMenuItem>
              {/* El Wizard lo dejamos local o lo pasas al manager si quieres */}
              <DropdownMenuItem className="cursor-pointer" onSelect={() => openDialog('wizard')}> 
                  <CalendarClock className="mr-2 h-4 w-4" />
                  <span>Generador de Turnos</span>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
             </>
          )}
      </>
  )
}