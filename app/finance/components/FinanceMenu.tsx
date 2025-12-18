'use client'

import React from 'react';
import { FinanceAccount, FinanceCategory,FinanceRule,FinanceDashboardData } from '@/types/finance';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { FileUp, FolderTree, CreditCard } from 'lucide-react';
import { AccountSettingsDialog } from './AccountSettingsDialog';
import { CategorySettingsDialog } from './CategorySettingsDialog';
import { ImporterDialog } from './ImporterDialog';

export function FinanceMenu({ accounts, categories, rules }: { accounts: FinanceAccount[], categories: FinanceCategory[], rules: FinanceRule[]}) {
    // Definimos los items en un array para que React los gestione con Keys de forma nativa
    const menuItems = [
        {
            id: 'importer',
            component: (
                <ImporterDialog accounts={accounts}>
                    <DropdownMenuItem className="cursor-pointer" onSelect={(e) => e.preventDefault()}>
                        <FileUp className="mr-2 h-4 w-4" /> Importar CSV
                    </DropdownMenuItem>
                </ImporterDialog>
            )
        },
        { id: 'sep-1', component: <DropdownMenuSeparator /> },
        {
            id: 'accounts',
            component: (
                <AccountSettingsDialog initialAccounts={accounts}>
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