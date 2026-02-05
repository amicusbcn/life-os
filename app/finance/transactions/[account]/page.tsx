// app/finance/transactions/[account]/page.tsx
import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import { TransactionList } from '@/app/finance/components/TransactionList'
import { getUserData } from '@/utils/security'
import { UnifiedAppSidebar } from '@/components/layout/UnifiedAppSidebar'
import { FinanceMenu } from '@/app/finance/components/FinanceMenu'
import { getFinanceDashboardData } from '@/app/finance/data'
import { Button } from "@/components/ui/button"
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default async function AccountTransactionsPage({ 
    params,
    searchParams 
}: { 
    params: Promise<{ account: string }>,
    searchParams: Promise<{ year?: string, month?: string }>
}) {
    const { account: accountSlug } = await params;
    const { year: queryYear, month: queryMonth } = await searchParams;

    const currentYear = queryYear ? parseInt(queryYear) : 2026;
    const { profile, accessibleModules } = await getUserData('finance');
    
    // 1. Cargamos todos los datos (asegurándonos de que categorías venga bien)
    const data = await getFinanceDashboardData();
    const { accounts, categories, rules, templates, history } = data;

    const account = accounts.find(a => a.slug === accountSlug);
    if (!account) notFound();

    // 2. Lógica de filtrado por fechas (Año + Mes opcional)
    const supabase = await createClient();
    let query = supabase
        .from('finance_transactions')
        .select(`
            *,
            category:finance_categories(*) 
        `) // ✨ Traemos la categoría unida para asegurar que cargue
        .eq('account_id', account.id)
        .order('date', { ascending: false });

    if (queryMonth && queryMonth !== 'all') {
        const month = queryMonth.padStart(2, '0');
        query = query.gte('date', `${currentYear}-${month}-01`).lte('date', `${currentYear}-${month}-31`);
    } else {
        query = query.gte('date', `${currentYear}-01-01`).lte('date', `${currentYear}-12-31`);
    }

    const { data: transactions } = await query;

    // Años disponibles para el navegador
    const years = [2024, 2025, 2026];

    return (
        <UnifiedAppSidebar
            title={`${account.name}`}
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
                        accountFilter={account.id}
                        isPrivate={false}
                    />
                </div>
            </div>
        </UnifiedAppSidebar>
    );
}