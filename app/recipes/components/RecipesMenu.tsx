'use client'

import React from 'react';
import { MenuRecipeCategory } from '@/types/recipes';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { FolderTree, Plus } from 'lucide-react';
import Link from 'next/link';
import { RecipeCategorySettingsDialog } from './RecipeCategorySettingsDialog';

export function RecipesMenu({ categories }: { categories: MenuRecipeCategory[] }) {
    const menuItems = [
        {
            id: 'new-recipe',
            component: (
                <Link href="/recipes/create">
                    <DropdownMenuItem className="cursor-pointer">
                        <Plus className="mr-2 h-4 w-4 text-orange-500" /> Nueva Receta
                    </DropdownMenuItem>
                </Link>
            )
        },
        {
            id: 'manage-categories',
            component: (
                <RecipeCategorySettingsDialog initialCategories={categories}>
                    <DropdownMenuItem 
                        className="cursor-pointer" 
                        onSelect={(e) => e.preventDefault()}
                    >
                        <FolderTree className="mr-2 h-4 w-4" /> Gestionar Categorías
                    </DropdownMenuItem>
                </RecipeCategorySettingsDialog>
            )
        },
        { id: 'sep-1', component: <DropdownMenuSeparator /> }
    ];

    return (
        <div key="recipes-menu-wrapper">
            {menuItems.map((item) => (
                <React.Fragment key={item.id}>
                    {item.component}
                </React.Fragment>
            ))}
        </div>
    );
}