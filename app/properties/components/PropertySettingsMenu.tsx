'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
    Settings, Users, Map, BellRing, Box, 
    CreditCard, ArrowLeft 
} from 'lucide-react';
import { 
    SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarGroupLabel 
} from '@/components/ui/sidebar';

export function PropertySettingsMenu({ slug }: { slug: string }) {
    const searchParams = useSearchParams();
    const currentSection = searchParams.get('section') || 'general';

    // Helper para generar la URL manteniendo el scroll o estado si fuera necesario
    const getLink = (section: string) => `/properties/${slug}/settings?section=${section}`;

    return (
        <SidebarMenu>
            <SidebarGroupLabel>Administración</SidebarGroupLabel>

            {/* 1. GENERAL */}
            <SidebarMenuItem>
                <Link href={getLink('general')}>
                    <SidebarMenuButton 
                        isActive={currentSection === 'general'}
                        className="data-[active=true]:bg-indigo-50 data-[active=true]:text-indigo-700 font-medium"
                    >
                        <Settings className="h-4 w-4" />
                        <span>General</span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>

            {/* 2. ESTRUCTURA */}
            <SidebarMenuItem>
                <Link href={getLink('structure')}>
                    <SidebarMenuButton 
                        isActive={currentSection === 'structure'}
                        className="data-[active=true]:bg-indigo-50 data-[active=true]:text-indigo-700 font-medium"
                    >
                        <Map className="h-4 w-4" />
                        <span>Estructura y Zonas</span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>

            {/* 3. PERSONAS */}
            <SidebarMenuItem>
                <Link href={getLink('members')}>
                    <SidebarMenuButton 
                        isActive={currentSection === 'members'}
                        className="data-[active=true]:bg-indigo-50 data-[active=true]:text-indigo-700 font-medium"
                    >
                        <Users className="h-4 w-4" />
                        <span>Miembros y Acceso</span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>

            {/* 4. MÓDULOS */}
            <SidebarMenuItem>
                <Link href={getLink('modules')}>
                    <SidebarMenuButton 
                        isActive={currentSection === 'modules'}
                        className="data-[active=true]:bg-indigo-50 data-[active=true]:text-indigo-700 font-medium"
                    >
                        <Box className="h-4 w-4" />
                        <span>Módulos Activos</span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>

            {/* 5. AVISOS */}
            <SidebarMenuItem>
                <Link href={getLink('alerts')}>
                    <SidebarMenuButton 
                        isActive={currentSection === 'alerts'}
                        className="data-[active=true]:bg-indigo-50 data-[active=true]:text-indigo-700 font-medium"
                    >
                        <BellRing className="h-4 w-4" />
                        <span>Tablón de Avisos</span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}