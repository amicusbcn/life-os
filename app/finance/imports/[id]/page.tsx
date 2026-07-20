// app/finance/imports/[id]/page.tsx

import { notFound } from 'next/navigation';
import { getAccessControl } from '@/utils/security';
import { UnifiedAppSidebar } from '@/components/layout/UnifiedAppSidebar';
import { FinanceMenu } from '@/app/finance/components/FinanceMenu';
import { 
    getAccounts, 
    getCategories, 
    getRules, 
    getImporterHistory,
    getImportBatchDetail
} from '@/app/finance/data';
import { ImportBatchDetailView } from './ImportBatchDetailView';

export default async function ImportBatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    
    // 1. Verificación de Seguridad y Permisos
    const { profile, accessibleModules } = await getAccessControl('finance');

    // 2. Carga limpia y centralizada desde data.ts (Cero llamadas directas a Supabase aquí)
    const [accounts, categories, rules, history, batchDetail] = await Promise.all([
        getAccounts(),
        getCategories(),
        getRules(),
        getImporterHistory(),
        getImportBatchDetail(id)
    ]);

    // 3. Validación de existencia del lote
    if (!batchDetail) {
        notFound();
    }

    const { batch, transactions } = batchDetail;

    return (
        <UnifiedAppSidebar
            title={`Lote: ${batch.filename}`}
            profile={profile}
            modules={accessibleModules}
            moduleMenu={
                <FinanceMenu 
                    mode="operative" 
                    accounts={accounts}
                    categories={categories} 
                    currentPanel="history"
                    rules={rules}
                    history={history} 
                />
            }
            moduleSettings={
                <FinanceMenu 
                    mode="settings"
                    accounts={accounts} 
                    categories={categories}
                    rules={rules}
                    history={history}
                />
            }
        >
            <div className="max-w-7xl mx-auto p-6 space-y-6">
                <ImportBatchDetailView 
                    batch={batch} 
                    initialTransactions={transactions} 
                />
            </div>
        </UnifiedAppSidebar>
    );
}