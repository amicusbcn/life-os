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
    // 1. Uso moderno de la función de seguridad (Leyes de Life-OS v2.0)
    const { profile, accessibleModules } = await getAccessControl('finance');

    const supabase = await createClient();

    // 2. Cargamos los datos necesarios para las acciones del menú
    const [accounts, categories, rules] = await Promise.all([
        getAccounts(),
        getCategories(),
        getRules()
    ]);

    // 3. Cargamos el historial de lotes cruzado con las cuentas
    const { data: rawLogs } = await supabase
        .from('finance_importers')
        .select(`
            id,
            created_at,
            filename,
            row_count,
            import_date,
            account_id,
            finance_accounts ( name, color_theme, icon_name )
        `)
        .order('created_at', { ascending: false });

    const formattedLogs: ImportLogItem[] = rawLogs?.map((item: any) => ({
        id: item.id,
        created_at: item.created_at,
        filename: item.filename,
        row_count: item.row_count,
        import_date: item.import_date,
        account_id: item.account_id,
        account_name: item.finance_accounts?.name || 'Cuenta no disponible',
        account_color: item.finance_accounts?.color_theme,
        account_icon: item.finance_accounts?.icon_name,
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