// app/finance/analytics/page.tsx
import { getUserData } from '@/utils/security';
import { UnifiedAppSidebar } from '@/components/layout/UnifiedAppSidebar';
import { FinanceMenu } from '@/app/finance/components/FinanceMenu';
import { getTransactionViewData, getExpenseAnalytics, getAnalyticsViewData } from '@/app/finance/data';
import { AnalyticsDashboard } from '../components/AnalyticsDashboard';

export default async function AnalyticsPage({ 
    searchParams 
}: { 
    searchParams: Promise<{ year?: string }> 
}) {
    const { year: queryYear } = await searchParams;
    const currentYear = queryYear ? parseInt(queryYear) : new Date().getFullYear();
    
    // 1. Datos de seguridad y perfil
    const { profile, accessibleModules } = await getUserData('finance');


    // 3. Cargamos los datos específicos procesados para los gráficos
    const data = await getAnalyticsViewData(currentYear);
    
    const { 
        accounts, 
        categories, 
        rules, 
        templates, 
        history,
        rawTransactions
    } = data;

    return (
        <UnifiedAppSidebar
            title="Analítica de Gastos"
            profile={profile}
            modules={accessibleModules}
            moduleMenu={
                <FinanceMenu 
                    mode="operative" 
                    accounts={accounts}
                    categories={categories} 
                    currentPanel='analytics' // Cambiado a analytics para que el menú sepa dónde está
                    rules={rules}
                    templates={templates} 
                    history={history} 
                />
            }
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
            <div className="max-w-7xl mx-auto p-6 space-y-6">
                {/* Pasamos los datos procesados al cliente */}
                <AnalyticsDashboard 
                    data={rawTransactions} 
                    year={currentYear} 
                />
            </div>
        </UnifiedAppSidebar>
    );
}