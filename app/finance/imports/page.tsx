// app/finance/imports/page.tsx

import { createClient } from '@/utils/supabase/server';
import { getAccounts } from '../data';
import { ImporterLogsView, ImportLogItem } from './ImporterLogsView';

export default async function ImporterHistoryPage() {
    const supabase = await createClient();

    // 1. Cargamos las cuentas para los filtros
    const accounts = await getAccounts();

    // 2. Cargamos el historial de lotes cruzado con el nombre de la cuenta
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
        account_name: item.finance_accounts?.name || 'Cuenta eliminada',
        account_color: item.finance_accounts?.color_theme,
        account_icon: item.finance_accounts?.icon_name,
    })) || [];

    return <ImporterLogsView initialLogs={formattedLogs} accounts={accounts} />;
}