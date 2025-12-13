// app/timeline/components/TimelineMenu.tsx (Server Component - FINAL)

import { Fragment } from 'react';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Settings } from 'lucide-react';
import { TimelineSettings } from './TimelineSettings'; // Componente Cliente
import { TimelineMenuProps } from '@types/timeline'; 

export async function TimelineMenu({ allTags, allPeople }: TimelineMenuProps) {
    return (
        <Fragment>
            {/* 🚨 1. ÍTEM: TimelineSettings (Client) envuelve el DropdownMenuItem (JSX simple) */}
            <TimelineSettings 
                allTags={allTags} 
                allPeople={allPeople} 
            >
                {/* ESTE ES EL ÍTEM QUE VERÁS EN EL MENÚ DESPLEGABLE */}
                <DropdownMenuItem className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Configurar Etiquetas y Personas</span>
                </DropdownMenuItem>
            </TimelineSettings>
            
            {/* 2. SEPARADOR: Para separar esta opción del Timeline de las opciones CORE */}
            <DropdownMenuSeparator />
        </Fragment>
    );
}