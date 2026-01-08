// app/finance/components/FinanceMenu.tsx
'use client'

import React from 'react';
import { FinanceAccount, FinanceCategory,FinanceRule,FinanceDashboardData } from '@/types/finance';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { FileUp, FolderTree, CreditCard } from 'lucide-react';
import { AccountSettingsDialog } from './AccountSettingsDialog';
import { CategorySettingsDialog } from './CategorySettingsDialog';
import { ImporterDialog } from './ImporterDialog';
import { ImporterTemplatesDialog } from './ImporterTemplatesDialog';
import { Settings2 } from 'lucide-react';
interface FinanceMenuProps {
    accounts: FinanceAccount[];
    categories: FinanceCategory[];
    rules: FinanceRule[];
    templates: any[]; // ✨ Añadido
    history: any[];   // ✨ Añadido
}
export function FinanceMenu({ 
    accounts, 
    categories, 
    rules, 
    templates, 
    history 
}: FinanceMenuProps) {    // Definimos los items en un array para que React los gestione con Keys de forma nativa
    const menuItems = [
        {
            id: 'importer',
            component: (
                <ImporterDialog 
                    accounts={accounts} 
                    templates={templates} // ✨ Añade esta línea para cumplir el contrato
                >
                    <DropdownMenuItem className="cursor-pointer" onSelect={(e) => e.preventDefault()}>
                        <FileUp className="mr-2 h-4 w-4" /> Importar CSV
                    </DropdownMenuItem>
                </ImporterDialog>
            )
        },
        {
            id: 'templates',
            component: (
                <ImporterTemplatesDialog initialTemplates={templates} history={history}> 
                    <DropdownMenuItem className="cursor-pointer" onSelect={(e) => e.preventDefault()}>
                        <Settings2 className="mr-2 h-4 w-4" /> Plantillas de Importación
                    </DropdownMenuItem>
                </ImporterTemplatesDialog>
            )
        },
        { id: 'sep-1', component: <DropdownMenuSeparator /> },
        {
            id: 'accounts',
            component: (
                <AccountSettingsDialog initialAccounts={accounts} templates={templates}>
                    <DropdownMenuItem className="cursor-pointer" onSelect={(e) => e.preventDefault()}>
                        <CreditCard className="mr-2 h-4 w-4" /> Gestionar Cuentas
                    </DropdownMenuItem>
                </AccountSettingsDialog>
            )
        },
        {
            id: 'categories',
            component: (
                <CategorySettingsDialog initialCategories={categories} initialRules={rules}>
                    <DropdownMenuItem className="cursor-pointer" onSelect={(e) => e.preventDefault()}>
                        <FolderTree className="mr-2 h-4 w-4" /> Gestionar Categorías
                    </DropdownMenuItem>
                </CategorySettingsDialog>
            )
        }
    ];

    return (
        <div key="finance-menu-wrapper">
            {menuItems.map((item) => (
                <React.Fragment key={item.id}>
                    {item.component}
                </React.Fragment>
            ))}
            <DropdownMenuSeparator />
        </div>
    );
}