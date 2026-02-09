// app/finance/transactions/[account]/page.tsx
import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import { TransactionList } from '@/app/finance/components/TransactionList'
import { getUserData } from '@/utils/security'
import { UnifiedAppSidebar } from '@/components/layout/UnifiedAppSidebar'
import { FinanceMenu } from '@/app/finance/components/FinanceMenu'
import { getTransactionViewData } from '@/app/finance/data'
import { Button } from "@/components/ui/button"
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default async function AccountTransactionsPage({ 
    searchParams 
}: { 
    searchParams: Promise<{ year?: string, month?: string }>
}) {
    const { year: queryYear, month: queryMonth } = await searchParams;

    const currentYear = queryYear ? parseInt(queryYear) : new Date().getFullYear();
    const { profile, accessibleModules } = await getUserData('finance');
    
    // 1. Cargamos todos los datos (asegurándonos de que categorías venga bien)
    const data = await getTransactionViewData(currentYear);
    const { transactions, accounts, categories, rules, templates, history,currentAccount,year } = data;

    // 2. Lógica de filtrado por fechas (Año + Mes opcional)
    const supabase = await createClient();
    const startDate = `${currentYear}-01-01`;
    const endDate = `${currentYear}-12-31`;

    // 2. Query simplificada: Un solo bloque de datos anual
    return (
        <UnifiedAppSidebar
            title="Detalle Anual"
            profile={profile}
            modules={accessibleModules}
            moduleMenu={
                <FinanceMenu 
                    mode="operative" 
                    accounts={accounts}
                    categories={categories} 
                    currentPanel='transactions' 
                    rules={rules}
                    templates={templates} 
                    history={history} />
            }
        >
            <div className="max-w-6xl mx-auto px-6 py-6 space-y-4">
                
                {/* LISTADO DE TRANSACCIONES */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
                    <TransactionList 
                        transactions={transactions || []}
                        categories={categories} // 🚩 REVISA QUE ESTO NO LLEGUE VACÍO
                        accounts={accounts}
                        accountFilter='all'
                        isPrivate={false}
                    />
                </div>
            </div>
        </UnifiedAppSidebar>
    );
}