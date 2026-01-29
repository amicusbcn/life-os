// app/finance/components/FinanceMenu.tsx
'use client'

import React from 'react';
import { FinanceAccount, FinanceCategory, FinanceRule } from '@/types/finance';
import { FileUp, FolderTree, CreditCard, Settings2 } from 'lucide-react';
import { AccountSettingsDialog } from './AccountSettingsDialog';
import { CategorySettingsDialog } from './CategorySettingsDialog';
import { ImporterDialog } from './ImporterDialog';
import { ImporterTemplatesDialog } from './ImporterTemplatesDialog';
import { 
    SidebarMenuItem, 
    SidebarMenuButton 
} from '@/components/ui/sidebar';

interface FinanceMenuProps {
    accounts: FinanceAccount[];
    categories: FinanceCategory[];
    rules: FinanceRule[];
    templates: any[];
    history: any[];
    mode: 'operative' | 'settings'; // ✨ Prop para control de slots
}

export function FinanceMenu({ 
    accounts, 
    categories, 
    rules, 
    templates, 
    history,
    mode
}: FinanceMenuProps) {

    // --- RENDERIZADO OPERATIVO (Cuerpo del Sidebar) ---
    if (mode === 'operative') {
        return (
            <>
                <SidebarMenuItem>
                    <ImporterDialog accounts={accounts} templates={templates}>
                        <SidebarMenuButton tooltip="Importar CSV">
                            <FileUp className="h-4 w-4" />
                            <span>Importar CSV</span>
                        </SidebarMenuButton>
                    </ImporterDialog>
                </SidebarMenuItem>

                <SidebarMenuItem>
                    <ImporterTemplatesDialog initialTemplates={templates} history={history}>
                        <SidebarMenuButton tooltip="Plantillas de Importación">
                            <Settings2 className="h-4 w-4" />
                            <span>Plantillas Importación</span>
                        </SidebarMenuButton>
                    </ImporterTemplatesDialog>
                </SidebarMenuItem>
            </>
        );
    }

    // --- RENDERIZADO DE CONFIGURACIÓN (Pie del Sidebar) ---
    return (
        <>
            <SidebarMenuItem>
                <AccountSettingsDialog initialAccounts={accounts} templates={templates}>
                    <SidebarMenuButton tooltip="Gestionar Cuentas">
                        <CreditCard className="h-4 w-4" />
                        <span>Gestionar Cuentas</span>
                    </SidebarMenuButton>
                </AccountSettingsDialog>
            </SidebarMenuItem>

            <SidebarMenuItem>
                <CategorySettingsDialog initialCategories={categories} initialRules={rules}>
                    <SidebarMenuButton tooltip="Gestionar Categorías">
                        <FolderTree className="h-4 w-4" />
                        <span>Gestionar Categorías</span>
                    </SidebarMenuButton>
                </CategorySettingsDialog>
            </SidebarMenuItem>
        </>
    );
}