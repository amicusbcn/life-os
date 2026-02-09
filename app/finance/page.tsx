// app/finance/page.tsx
import { getUserData } from '@/utils/security';
import { UnifiedAppSidebar } from '@/components/layout/UnifiedAppSidebar';
import { getDashboardViewData } from './data'; 
import { FinanceDashboardView } from './components/FinanceDashboardView';
import { FinanceMenu } from './components/FinanceMenu';

export default async function FinancePage() {
    // 1. Seguridad centralizada
    const { profile, accessibleModules } = await getUserData('finance');

    // 2. Obtener dat(Quitamos transactions de la vista de saldos si prefieres)
    const { accounts, categories, rules, templates, history } = await getDashboardViewData();
    
    // 3. Saldo Global (opcional aquí, lo puede calcular el cliente también)
    const totalBalance = accounts.reduce((acc, account) => acc + (account.current_balance || 0), 0);

    return (
        <UnifiedAppSidebar
            title="Finanzas Personales"
            profile={profile}
            modules={accessibleModules}
            // Slot Cuerpo: El menú lateral de operativa
            moduleMenu={
                <FinanceMenu 
                    mode="operative"
                    accounts={accounts} 
                    categories={categories}
                    rules={rules}
                    templates={templates}
                    history={history}
                    currentPanel='dashboard'
                />
            }
            // Slot Pie: Configuración
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
            {/* 4. VISTA DEL DASHBOARD (Saldos por grupos) */}
            <div className="max-w-6xl mx-auto px-6 py-8">
                <FinanceDashboardView 
                    initialAccounts={accounts} 
                    templates={templates}
                />
            </div>
        </UnifiedAppSidebar>
    );
}