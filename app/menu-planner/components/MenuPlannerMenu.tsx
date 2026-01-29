// app/menu-planner/components/MenuPlannerMenu.tsx
'use client'

import React from 'react';
import { Folder, BookOpen } from 'lucide-react';
import MenuCategoriesSettings from './MenuCategoriesSettings'; 
import Link from 'next/link';
import MenuRecipesSettings from './MenuRecipesSettings';
import { 
    SidebarMenuItem, 
    SidebarMenuButton 
} from '@/components/ui/sidebar';

interface MenuPlannerMenuProps {
    mode: 'operative' | 'settings';
}

export default function MenuPlannerMenu({ mode }: MenuPlannerMenuProps) {
    
    // Si en el futuro tienes acciones rápidas (ej: "Generar Menú Aleatorio"), irían aquí
    if (mode === 'operative') {
        return (
            <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Libro de Visitas">
                    <Link href="/recipes">
                        <BookOpen className="h-4 w-4" />
                        <span className="font-bold text-sm">Libro de Recetas</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
            
        );
    }

    // --- RENDERIZADO DE CONFIGURACIÓN (Pie del Sidebar) ---
    return (
        <>

            <SidebarMenuItem>
                <MenuCategoriesSettings>
                    <SidebarMenuButton tooltip="Gestionar Categorías">
                        <Folder className="h-4 w-4 text-slate-500" />
                        <span>Gestionar Categorías</span>
                    </SidebarMenuButton>
                </MenuCategoriesSettings>
            </SidebarMenuItem>
        </>
    );
}