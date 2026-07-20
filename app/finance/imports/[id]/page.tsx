// app/finance/imports/[id]/page.tsx

import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getAccessControl } from '@/utils/security';
import { UnifiedAppSidebar } from '@/components/layout/UnifiedAppSidebar';
import { FinanceMenu } from '@/app/finance/components/FinanceMenu';
import { 
    getAccounts, 
    getCategories, 
    getRules, 
    getImporterHistory
} from '@/app/finance/data';
import { ImportBatchDetailView, BatchDetailLog, BatchTransactionItem } from './ImportBatchDetailView';

export default async function ImportBatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { profile, accessibleModules } = await getAccessControl('finance');

    const supabase = await createClient();

    // 1. Carga paralela de menú y referencias
    const [accounts, categories, rules, history] = await Promise.all([
        getAccounts(),
        getCategories(),
        getRules(),
        getImporterHistory()
    ]);

    // 2. Traemos el lote de importación
    const { data: rawBatch } = await supabase
        .from('finance_importers')
        .select(`
            id,
            filename,
            row_count,
            skipped_count,
            created_at,
            import_date,
            account_id,
            finance_accounts ( name, color_theme, avatar_letter )
        `)
        .eq('id', id)
        .single();

    if (!rawBatch) {
        notFound();
    }

    // 3. Traemos las transacciones pertenecientes a este lote ordenadas por import_sequence
    const { data: rawTransactions } = await supabase
        .from('finance_transactions')
        .select(`
            id,
            date,
            concept,
            amount,
            bank_balance,
            import_sequence,
            finance_categories ( name, color_theme )
        `)
        .eq('importer_id', id)
        .order('import_sequence', { ascending: true })
        .order('date', { ascending: true });

    // Calculamos rango de fechas del lote
    const oldestDate = rawTransactions && rawTransactions.length > 0 ? rawTransactions[0].date : null;
    const newestDate = rawTransactions && rawTransactions.length > 0 ? rawTransactions[rawTransactions.length - 1].date : null;

    const formattedBatch: BatchDetailLog = {
        id: rawBatch.id,
        filename: rawBatch.filename,
        row_count: rawBatch.row_count,
        skipped_count: rawBatch.skipped_count || 0,
        created_at: rawBatch.created_at,
        import_date: rawBatch.import_date,
        account_name: (rawBatch.finance_accounts as any)?.name || 'Cuenta no disponible',
        account_color: (rawBatch.finance_accounts as any)?.color_theme,
        account_letter: (rawBatch.finance_accounts as any)?.avatar_letter,
        oldest_date: oldestDate,
        newest_date: newestDate,
    };

    const formattedTransactions: BatchTransactionItem[] = rawTransactions?.map((tx: any, idx: number) => ({
        id: tx.id,
        date: tx.date,
        concept: tx.concept,
        amount: Number(tx.amount || 0),
        bank_balance: tx.bank_balance !== null && tx.bank_balance !== undefined ? Number(tx.bank_balance) : null,
        import_sequence: tx.import_sequence || idx + 1,
        category_name: tx.finance_categories?.name,
        category_color: tx.finance_categories?.color_theme,
    })) || [];

    return (
        <UnifiedAppSidebar
            title={`Lote: ${formattedBatch.filename}`}
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
                    batch={formattedBatch} 
                    initialTransactions={formattedTransactions} 
                />
            </div>
        </UnifiedAppSidebar>
    );
}