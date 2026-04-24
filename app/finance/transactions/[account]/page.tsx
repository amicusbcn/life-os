// app/finance/transactions/[account]/page.tsx
import { notFound } from 'next/navigation'
import { TransactionList } from '@/app/finance/components/TransactionList'
import { getUserData } from '@/utils/security'
import { UnifiedAppSidebar } from '@/components/layout/UnifiedAppSidebar'
import { FinanceMenu } from '@/app/finance/components/FinanceMenu'
import { getTransactionViewData } from '@/app/finance/data'

export default async function AccountTransactionsPage({ 
    params,
    searchParams 
}: { 
    params: Promise<{ account: string }>,
    searchParams: Promise<{ year?: string }>
}) {
    // 1. Await de ambos (Obligatorio en Next.js 15)
    const { account: accountSlug } = await params;
    const { year: queryYear } = await searchParams;

    // 2. Lógica de fecha dinámica
    const currentYear = queryYear ? parseInt(queryYear) : new Date().getFullYear();
    const { profile, accessibleModules } = await getUserData('finance');
    
    // 3. Cargamos los datos usando el orquestador que limpiamos
    // Pasamos el slug y el año
    const data = await getTransactionViewData(currentYear,accountSlug);
    
    const { 
        transactions, 
        accounts, 
        categories, 
        rules, 
        templates, 
        history, 
        currentAccount 
    } = data;

    // 4. Si el slug no existe en nuestras cuentas, 404
    if (accountSlug !== 'all' && !currentAccount) {
        notFound();
    }

    return (
        <UnifiedAppSidebar
            title={currentAccount ? currentAccount.name : "Todas las Cuentas"}
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
            <div className="max-w-6xl mx-auto px-6 py-6 space-y-4">
                {/* FILA SUPERIOR: Navegador de años y contexto 
                   (Esto lo pusimos dentro de TransactionList, pero podrías 
                   sacar aquí un título si quisieras)
                */}

                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
                    <TransactionList 
                        transactions={transactions || []}
                        categories={categories}
                        accounts={accounts}
                        // Si es 'all', pasamos 'all', si no el ID de la cuenta
                        accountFilter={currentAccount ? currentAccount.id : 'all'}
                        isPrivate={false}
                    />
                </div>
            </div>
        </UnifiedAppSidebar>
    );
}