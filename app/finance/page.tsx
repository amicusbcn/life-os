// app/finance/page.tsx
import { getUserData } from '@/utils/security';
import { UnifiedAppSidebar } from '@/components/layout/UnifiedAppSidebar';

// Componentes y datos Server-Side
import { getFinanceDashboardData } from './data'; 
import { FinanceDashboardView } from './components/FinanceDashboardView';
import { FinanceMenu } from './components/FinanceMenu';

export default async function FinancePage() {
    // 1. Seguridad centralizada: obtenemos perfil, módulos y rol en una sola ráfaga
    const { profile, accessibleModules, userRole } = await getUserData('finance');

    // 2. Obtener todos los datos del Dashboard (Delegado a data.ts)
    const { 
        accounts, 
        categories, 
        transactions, 
        rules, 
        templates, 
        history 
    } = await getFinanceDashboardData();
    
    // 3. Calcular el Saldo Total Global
    const totalBalance = accounts.reduce((acc, account) => acc + (account.current_balance || 0), 0);

    return (
        <UnifiedAppSidebar
            title="Finanzas Personales"
            profile={profile}
            modules={accessibleModules}
            // Slot Cuerpo: Operaciones de importación y plantillas
            moduleMenu={
                <FinanceMenu 
                    mode="operative"
                    accounts={accounts} 
                    categories={categories}
                    rules={rules}
                    templates={templates}
                    history={history}
                />
            }
            // Slot Pie: Gestión de la estructura (Cuentas y Categorías)
            moduleSettings={
                <FinanceMenu 
                    mode="settings"
                    accounts={accounts} 
                    categories={categories}
                    rules={rules}
                    templates={templates}
                    history={history}
                />
            }
        >
            {/* Contenido Principal */}
            <div className="max-w-7xl mx-auto">
                <FinanceDashboardView 
                    accounts={accounts}
                    categories={categories}
                    transactions={transactions}
                    rules={rules}
                    totalBalance={totalBalance}
                />
            </div>
        </UnifiedAppSidebar>
    );
}