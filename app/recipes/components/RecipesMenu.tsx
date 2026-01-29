// app/recipes/components/RecipesMenu.tsx
'use client'

import React from 'react';
import { MenuRecipeCategory } from '@/types/recipes';
import { FolderTree, Plus, ChevronLeft } from 'lucide-react';
import NextLink from 'next/link';
import { RecipeCategorySettingsDialog } from './RecipeCategorySettingsDialog';
import { 
    SidebarMenuItem, 
    SidebarMenuButton,
    SidebarMenu
} from '@/components/ui/sidebar';

interface RecipesMenuProps {
    categories: MenuRecipeCategory[];
    mode: 'operative' | 'settings';
}

export function RecipesMenu({ categories, mode }: RecipesMenuProps) {
    
    // --- RENDERIZADO OPERATIVO (Cuerpo del Sidebar) ---
    if (mode === 'operative') {
        return (
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton 
                        asChild 
                        size="lg" 
                        className="bg-orange-500 text-white hover:bg-orange-600 hover:text-white shadow-lg my-2"
                    >
                        <NextLink href="/recipes/create">
                            <Plus className="h-5 w-5" />
                            <span className="font-bold">Nueva Receta</span>
                        </NextLink>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        );
    }

    // --- RENDERIZADO DE CONFIGURACIÓN (Pie del Sidebar) ---
    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <RecipeCategorySettingsDialog initialCategories={categories}>
                    <SidebarMenuButton tooltip="Gestionar Categorías">
                        <FolderTree className="h-4 w-4 text-slate-500" />
                        <span>Gestionar Categorías</span>
                    </SidebarMenuButton>
                </RecipeCategorySettingsDialog>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}