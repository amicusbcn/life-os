// app/finance/components/FinanceMenu.tsx
import { Fragment } from 'react'; // Necesario para devolver múltiples elementos sin un div
import { FinanceAccount, FinanceCategory } from '@/types/finance';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Settings, FileUp, FolderTree, CreditCard, Banknote } from 'lucide-react';

// Importamos los diálogos Cliente
import { AccountSettingsDialog } from './AccountSettingsDialog';
import { CategorySettingsDialog } from './CategorySettingsDialog';
import { ImporterDialog } from './ImporterDialog';


interface FinanceMenuProps {
    accounts: FinanceAccount[];
    categories: FinanceCategory[];
}

// Este componente es ahora un Server Component que devuelve un Fragmento de JSX
// para ser inyectado directamente en el DropdownMenu del UnifiedAppHeader.
export function FinanceMenu({ accounts, categories }: FinanceMenuProps) {
    
    return (
        <Fragment>
            {/* 1. Importación C43 */}
            <ImporterDialog accounts={accounts}>
                <DropdownMenuItem className="cursor-pointer">
                    <FileUp className="mr-2 h-4 w-4" /> Importar C43
                </DropdownMenuItem>
            </ImporterDialog>
            
            <DropdownMenuSeparator />

            {/* 2. Configuración de Cuentas */}
            <AccountSettingsDialog initialAccounts={accounts}>
                <DropdownMenuItem className="cursor-pointer">
                    <CreditCard className="mr-2 h-4 w-4" /> Gestionar Cuentas
                </DropdownMenuItem>
            </AccountSettingsDialog>

            {/* 3. Configuración de Categorías */}
            <CategorySettingsDialog initialCategories={categories}>
                <DropdownMenuItem className="cursor-pointer">
                    <FolderTree className="mr-2 h-4 w-4" /> Gestionar Categorías
                </DropdownMenuItem>
            </CategorySettingsDialog>

            {/* Separador final, siguiendo el patrón de Timeline */}
            <DropdownMenuSeparator />
            
        </Fragment>
    );
}