// app/finance/components/FinanceMenu.tsx
'use client'

import React from 'react';
import { FinanceAccount, FinanceCategory, FinanceRule } from '@/types/finance';
import { FileUp, FolderTree, CreditCard, Settings2, Scale, NotebookTabs, LinkIcon } from 'lucide-react';
import { AccountSettingsDialog } from './AccountSettingsDialog';
import { CategorySettingsDialog } from './CategorySettingsDialog';
import { ImporterDialog } from './ImporterDialog';
import { ImporterTemplatesDialog } from './ImporterTemplatesDialog';
import { 
    SidebarMenuItem, 
    SidebarMenuButton, 
    SidebarSeparator
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface FinanceMenuProps {
    accounts: FinanceAccount[];
    categories: FinanceCategory[];
    rules: FinanceRule[];
    templates: any[];
    history: any[];
    mode: 'operative' | 'settings';
    currentPanel?: 'dashboard' | 'transactions' 
}

export function FinanceMenu({ 
    accounts, 
    categories, 
    rules, 
    templates, 
    history,
    mode,
    currentPanel
}: FinanceMenuProps) {

    // --- RENDERIZADO OPERATIVO (Cuerpo del Sidebar) ---
    if (mode === 'operative') {
        return (
            <>
                <SidebarMenuItem>
                    <SidebarMenuButton 
                    isActive={currentPanel === 'dashboard'}
                    tooltip="Posición global"
                    className={cn(
                        "transition-all duration-200",
                        // 1. ESTADO ACTIVO: Contraste total y bloqueo de hover
                        "data-[active=true]:!bg-indigo-700 data-[active=true]:!text-indigo-50 data-[active=true]:font-bold",
                        "data-[active=true]:hover:!bg-indigo-700 data-[active=true]:hover:!text-indigo-50", 
                        
                        // 2. ESTADO NORMAL: Texto slate y hover suave (solo si no está activo)
                        "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        )}
                    >
                        <Scale className="w-4 h-4" />
                        <Link href="/finance">Posición Global</Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton 
                    isActive={currentPanel === 'transactions'}
                    tooltip="Detalle anual"
                    className={cn(
                        "transition-all duration-200",
                        // 1. ESTADO ACTIVO: Contraste total y bloqueo de hover
                        "data-[active=true]:!bg-indigo-700 data-[active=true]:!text-indigo-50 data-[active=true]:font-bold",
                        "data-[active=true]:hover:!bg-indigo-700 data-[active=true]:hover:!text-indigo-50", 
                        
                        // 2. ESTADO NORMAL: Texto slate y hover suave (solo si no está activo)
                        "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        )}
                    >
                        <Scale className="w-4 h-4" />
                        <Link href="/finance/transactions">Detalle Anual</Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarSeparator />


                <SidebarMenuItem>
                    <ImporterDialog accounts={accounts} templates={templates}>
                        <SidebarMenuButton tooltip="Principal">
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