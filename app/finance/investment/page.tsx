// app/finance/investment/page.tsx
import { getUserData } from '@/utils/security';
import { UnifiedAppSidebar } from '@/components/layout/UnifiedAppSidebar';
import { FinanceMenu } from '@/app/finance/components/FinanceMenu';
import { getInvestmentViewData } from '@/app/finance/data';
import { InvestmentDashboard } from '../components/InvestmentDashboard';

export default async function InvestmentPage({ 
    searchParams 
}: { 
    searchParams: Promise<{ year?: string }> 
}) {
    const { year: queryYear } = await searchParams;
    const currentYear = queryYear ? parseInt(queryYear) : new Date().getFullYear();
    
    // 1. Datos de seguridad y perfil (usando tu utilidad centralizada)
    const { profile, accessibleModules } = await getUserData('finance');

    // 2. Cargamos los datos específicos procesados para las inversiones
    // Esta función en data.ts debe devolver rawTransactions de cuentas tipo 'investment'
    const data = await getInvestmentViewData(currentYear);
    
    const { 
        investmentAccounts, // Cambiado para reflejar lo que viene de getInvestmentViewData
        categories, 
        rules, 
        templates, 
        history,
        investmentTransactions
    } = data;

    return (
        <UnifiedAppSidebar
            title="Cartera de Inversión"
            profile={profile}
            modules={accessibleModules}
            moduleMenu={
                <FinanceMenu 
                    mode="operative" 
                    accounts={investmentAccounts}
                    categories={categories} 
                    currentPanel='investments' // Para que el menú sepa dónde está
                    rules={rules}
                    templates={templates} 
                    history={history} 
                />
            }
            moduleSettings={
                <FinanceMenu 
                    mode="settings"
                    accounts={investmentAccounts} 
                    categories={categories}
                    rules={rules}
                    templates={templates}
                    history={history}
                />
            }
        >
            <div className="max-w-7xl mx-auto p-6 space-y-6">
                {/* Dashboard específico de Inversiones */}
                <InvestmentDashboard 
                    data={data} 
                    year={currentYear} 
                />
            </div>
        </UnifiedAppSidebar>
    );
}