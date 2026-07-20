// app/finance/imports/page.tsx

import { createClient } from '@/utils/supabase/server';
import { getAccessControl } from '@/utils/security';
import { UnifiedAppSidebar } from '@/components/layout/UnifiedAppSidebar';
import { FinanceMenu } from '@/app/finance/components/FinanceMenu';
import { 
    getAccounts, 
    getCategories, 
    getRules
} from '@/app/finance/data';
import { ImporterLogsView, ImportLogItem } from './ImporterLogsView';

export default async function ImporterHistoryPage() {
    const { profile, accessibleModules } = await getAccessControl('finance');
    const supabase = await createClient();

    const [accounts, categories, rules] = await Promise.all([
        getAccounts(),
        getCategories(),
        getRules()
    ]);

    // 1. Cargamos el historial de lotes cruzado con la cuenta
    const { data: rawLogs } = await supabase
        .from('finance_importers')
        .select(`
            id,
            created_at,
            filename,
            row_count,
            import_date,
            account_id,
            finance_accounts ( name, color_theme, avatar_letter, icon_name )
        `)
        .order('created_at', { ascending: false });

    // 2. Traemos las fechas min/max de las transacciones vinculadas a los importer_id
    const { data: txBounds } = await supabase
        .from('finance_transactions')
        .select('importer_id, date')
        .not('importer_id', 'is', null);

    // Agrupamos en memoria las fechas extremas por lote
    const rangeMap: Record<string, { oldest: string; newest: string }> = {};
    txBounds?.forEach(tx => {
        if (!tx.importer_id) return;
        if (!rangeMap[tx.importer_id]) {
            rangeMap[tx.importer_id] = { oldest: tx.date, newest: tx.date };
        } else {
            if (tx.date < rangeMap[tx.importer_id].oldest) rangeMap[tx.importer_id].oldest = tx.date;
            if (tx.date > rangeMap[tx.importer_id].newest) rangeMap[tx.importer_id].newest = tx.date;
        }
    });

    const formattedLogs: ImportLogItem[] = rawLogs?.map((item: any) => ({
        id: item.id,
        created_at: item.created_at,
        filename: item.filename,
        row_count: item.row_count,
        import_date: item.import_date,
        account_id: item.account_id,
        account_name: item.finance_accounts?.name || 'Cuenta no disponible',
        account_color: item.finance_accounts?.color_theme || '#6366f1',
        account_letter: item.finance_accounts?.avatar_letter || item.finance_accounts?.name?.charAt(0).toUpperCase() || 'C',
        oldest_date: rangeMap[item.id]?.oldest || null,
        newest_date: rangeMap[item.id]?.newest || null,
    })) || [];

    return (
        <UnifiedAppSidebar
            title="Auditoría de Importaciones"
            profile={profile}
            modules={accessibleModules}
            moduleMenu={
                <FinanceMenu 
                    mode="operative" 
                    accounts={accounts}
                    categories={categories} 
                    currentPanel="history"
                    rules={rules}
                    history={formattedLogs} 
                />
            }
            moduleSettings={
                <FinanceMenu 
                    mode="settings"
                    accounts={accounts} 
                    categories={categories}
                    rules={rules}
                    history={formattedLogs}
                />
            }
        >
            <div className="max-w-7xl mx-auto p-6 space-y-6">
                <ImporterLogsView 
                    initialLogs={formattedLogs} 
                    accounts={accounts} 
                />
            </div>
        </UnifiedAppSidebar>
    );
}