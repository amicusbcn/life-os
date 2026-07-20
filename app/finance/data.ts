// app/finance/data.ts
import { createClient } from '@/utils/supabase/server'
import { 
    FinanceAccount, 
    FinanceCategory, 
    FinanceTransaction, 
    FinanceRule, 
    FinanceDashboardData, 
    ImportLogItem
} from '@/types/finance';

// ==========================================
// === ÁTOMOS: FUNCIONES BASE (REUTILIZABLES)
// ==========================================

export async function getAccounts(): Promise<FinanceAccount[]> {
    const supabase = await createClient();
    
    // 1. Traemos todas las cuentas
    const { data: accounts, error } = await supabase
        .from('finance_accounts')
        .select('*')
        .order('account_type', { ascending: true })
        .order('name', { ascending: true });

    if (error || !accounts) return [];

    // 2. Para cada cuenta, traemos en paralelo SOLO la transacción más antigua y la más reciente (1 fila de cada)
    const enrichedAccounts = await Promise.all(
        accounts.map(async (acc) => {
            // Transacción MÁS RECIENTE (Techo / Saldo Actual)
            const { data: latestTxs } = await supabase
                .from('finance_transactions')
                .select('date, amount, bank_balance')
                .eq('account_id', acc.id)
                .order('date', { ascending: false })
                .order('created_at', { ascending: false })
                .limit(1);

            // Transacción MÁS ANTIGUA (Cimiento / Saldo Inicial)
            const { data: oldestTxs } = await supabase
                .from('finance_transactions')
                .select('date, amount, bank_balance')
                .eq('account_id', acc.id)
                .order('date', { ascending: true })
                .order('created_at', { ascending: true })
                .limit(1);

            const latestTx = latestTxs && latestTxs.length > 0 ? latestTxs[0] : null;
            const oldestTx = oldestTxs && oldestTxs.length > 0 ? oldestTxs[0] : null;

            let calculatedCurrentBalance = parseFloat((acc.current_balance || 0).toString());
            let calculatedInitialBalance = parseFloat((acc.initial_balance || 0).toString());
            let oldestDate: string | null = null;
            let newestDate: string | null = null;

            if (latestTx && oldestTx) {
                oldestDate = oldestTx.date || null;
                newestDate = latestTx.date || null;

                if (latestTx.bank_balance !== null && latestTx.bank_balance !== undefined) {
                    // ESCENARIO A: Cuenta Bancaria
                    calculatedCurrentBalance = latestTx.bank_balance;
                    calculatedInitialBalance = (Math.round((oldestTx.bank_balance ?? 0) * 100) - Math.round((oldestTx.amount ?? 0) * 100)) / 100;
                } else {
                    // ESCENARIO B: Cuenta Auxiliar / Manual (Si no tiene bank_balance, sumamos importes de esa cuenta)
                    const { data: sumData } = await supabase
                        .from('finance_transactions')
                        .select('amount')
                        .eq('account_id', acc.id);
                    
                    calculatedCurrentBalance = sumData?.reduce((sum, t) => sum + (t.amount || 0), 0) ?? 0;
                    calculatedInitialBalance = 0;
                }
            }

            return {
                ...acc,
                initial_balance: calculatedInitialBalance,
                current_balance: calculatedCurrentBalance,
                oldest_date: oldestDate,
                newest_date: newestDate,
            };
        })
    );

    return enrichedAccounts;
}

export async function getCategories(): Promise<FinanceCategory[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('finance_categories')
        .select('*, parent:parent_id(*)')
        .order('name', { ascending: true }); 

    if (error) return [];
    return data as FinanceCategory[];
}

export async function getRules(): Promise<FinanceRule[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('finance_rules')
        .select('*')
        .order('created_at', { ascending: false });

    return error ? [] : data;
}

export async function getImporterHistory(): Promise<ImportLogItem[]> {
    const supabase = await createClient();

    // 1. Cargamos el historial de lotes cruzado con la información visual de la cuenta
    const { data: rawLogs, error: logError } = await supabase
        .from('finance_importers')
        .select(`
            id,
            created_at,
            filename,
            row_count,
            skipped_count,
            import_date,
            account_id,
            finance_accounts (
                name,
                color_theme,
                avatar_letter,
                icon_name
            )
        `)
        .order('created_at', { ascending: false });

    if (logError || !rawLogs) {
        console.error('Error al obtener el historial de importaciones:', logError?.message);
        return [];
    }

    // 2. Traemos las fechas min/max de las transacciones vinculadas a los importer_id
    const { data: txBounds } = await supabase
        .from('finance_transactions')
        .select('importer_id, date')
        .not('importer_id', 'is', null);

    // Agrupamos en memoria las fechas extremas por lote
    const rangeMap: Record<string, { oldest: string; newest: string }> = {};

    txBounds?.forEach(tx => {
        if (!tx.importer_id || !tx.date) return;

        if (!rangeMap[tx.importer_id]) {
            rangeMap[tx.importer_id] = { oldest: tx.date, newest: tx.date };
        } else {
            if (tx.date < rangeMap[tx.importer_id].oldest) rangeMap[tx.importer_id].oldest = tx.date;
            if (tx.date > rangeMap[tx.importer_id].newest) rangeMap[tx.importer_id].newest = tx.date;
        }
    });

    // 3. Retornamos la lista totalmente mapeada y tipada
    return rawLogs.map((item: any) => {
        const account = item.finance_accounts;
        const accountName = account?.name || 'Cuenta no disponible';

        return {
            id: item.id,
            created_at: item.created_at,
            filename: item.filename,
            row_count: Number(item.row_count || 0),
            skipped_count: Number(item.skipped_count || 0),
            import_date: item.import_date || null,
            account_id: item.account_id,
            account_name: accountName,
            account_color: account?.color_theme || '#6366f1',
            account_letter: account?.avatar_letter || accountName.charAt(0).toUpperCase() || 'C',
            account_icon: account?.icon_name || null,
            oldest_date: rangeMap[item.id]?.oldest || null,
            newest_date: rangeMap[item.id]?.newest || null,
        };
    });
}

// ==========================================
// === ORQUESTADORES: DATOS POR VISTA
// ==========================================

/**
 * DATOS PARA EL DASHBOARD DE PATRIMONIO
 * Carga lo necesario para saldos, sidebar y configuración, pero ignora transacciones.
 */
export async function getDashboardViewData() {
    const [accounts, categories, history, rules] = await Promise.all([
        getAccounts(),
        getCategories(),
        getImporterHistory(),
        getRules()
    ]);

    return {
        accounts,
        categories,
        history: history,
        rules
    };
}

/**
 * DATOS PARA LA VISTA DE TRANSACCIONES
 * Soporta una cuenta específica por slug o 'all' para el global anual.
 */
export async function getTransactionViewData(
    
    year: number = new Date().getFullYear(),
    accountSlug: string = 'all'
) {
    const supabase = await createClient();
    const start = `${year}-01-01`;
    const end = `${year}-12-31`;

    // 1. Cargamos estructura base (Cuentas, Categorías, Reglas e Importador)
    const [accounts, categories, rules, history] = await Promise.all([
        getAccounts(),
        getCategories(),
        getRules(),
        getImporterHistory()
    ]);

    // 2. Identificamos la cuenta. 
    // Si el slug es 'all', account será null explícitamente.
    const isAll = accountSlug === 'all';
    const account = !isAll ? accounts.find(a => a.slug === accountSlug) : null;

    // 3. Construimos la Query base
    let query = supabase
        .from('finance_transactions')
        .select(`
            *,
            account:finance_accounts(*),
            category:finance_categories(*, parent:parent_id(*)),
            splits:finance_transaction_splits(*, category:finance_categories(*))
        `)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: false })
        .order('import_sequence', { ascending: false });

    // 4. Filtro condicional: 
    // Solo aplicamos el eq('account_id') si NO estamos en modo 'all' Y tenemos una cuenta válida
    if (!isAll && account) {
        query = query.eq('account_id', account.id);
    }

    const { data: transactions, error } = await query;
    if (error) console.error("Error en getTransactionViewData:", error);

    return {
        transactions: transactions || [],
        accounts,
        categories,
        rules,
        history,
        currentAccount: account, // Será null si es 'all', perfecto para la lógica de la página
        isAllMode: isAll,        // Flag útil para la UI
        year
    };
}



export async function getAnalyticsViewData(year: number = new Date().getFullYear()) {
    const supabase = await createClient();
    const start = `${year}-01-01`;
    const end = `${year}-12-31`;

    const [accounts, categories, rules, history] = await Promise.all([
        getAccounts(),
        getCategories(),
        getRules(),
        getImporterHistory()
    ]);

    const { data: transactions, error } = await supabase
        .from('finance_transactions')
        .select(`
            *,
            account:finance_accounts(*),
            category:finance_categories(*, parent:parent_id(*)),
            splits:finance_transaction_splits(*, category:finance_categories(*))
        `)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: true })
        .order('import_sequence', { ascending: false });;

    if (error) console.error("Error en Analytics:", error);

    // No procesamos nada aquí (salvo que quieras valores iniciales por defecto),
    // simplemente enviamos la materia prima al cliente.
    return {
        accounts,
        categories,
        rules,
        history,
        year,
        rawTransactions: transactions || [] 
    };
}

// app/finance/data.ts

export async function getExpenseAnalytics(year: number) {
    const { transactions, categories } = await getTransactionViewData( year,'all');

    // 1. Filtrado de gastos puros (Negativos y que no sean transferencias)
    // El ID de transferencia es el que definimos antes
    const TRANSFER_CAT_ID = "10310a6a-5d3b-4e95-a19f-bfef8cd2dd1a";
    const expenses = transactions.filter(t => t.amount < 0 && t.category_id !== TRANSFER_CAT_ID);

    // 2. Evolución mensual (Barras)
    const monthlyEvolution = Array.from({ length: 12 }, (_, i) => {
        const monthLabel = new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(new Date(year, i));
        return { name: monthLabel.toUpperCase(), total: 0 };
    });

    // 3. Distribución por Categoría Padre (Donut)
    const categoryDistribution: Record<string, { name: string, value: number, color: string }> = {};

    expenses.forEach(t => {
        const date = new Date(t.date);
        const monthIndex = date.getMonth();

        // Sumar al mes correspondiente
        monthlyEvolution[monthIndex].total += Math.abs(t.amount);

        // Agrupar por categoría padre
        const cat = categories.find(c => c.id === t.category_id);
        const parent = cat?.parent_id ? categories.find(p => p.id === cat.parent_id) : cat;
        const parentName = parent?.name || "Sin categoría";
        const parentColor = parent?.color || "#94a3b8";

        if (!categoryDistribution[parentName]) {
            categoryDistribution[parentName] = { 
                name: parentName, 
                value: 0, 
                color: parentColor 
            };
        }
        categoryDistribution[parentName].value += Math.abs(t.amount);
    });

    return {
        totalSpent: expenses.reduce((acc, t) => acc + Math.abs(t.amount), 0),
        monthlyEvolution,
        categoryDistribution: Object.values(categoryDistribution).sort((a, b) => b.value - a.value)
    };
}
// app/finance/data.ts

export async function getInvestmentViewData(year: number = new Date().getFullYear()) {
    const supabase = await createClient();

    // 1. Cargamos todos los datos de soporte (igual que en Analytics)
    // Los necesitamos para que el Sidebar y los selectores del menú funcionen
    const [accounts, categories, rules, history] = await Promise.all([
        getAccounts(),
        getCategories(),
        getRules(),
        getImporterHistory()
    ]);

    // 2. Filtramos solo las cuentas de tipo inversión
    const investmentAccounts = accounts.filter(a => a.account_type === 'investment');
    const investmentAccountIds = investmentAccounts.map(a => a.id);

    // 3. Traemos el histórico completo de transacciones para estas cuentas
    // Importante: En inversiones solemos necesitar TODO el histórico para calcular
    // el capital invertido acumulado, no solo el año actual.
    const { data: transactions, error } = await supabase
        .from('finance_transactions')
        .select(`
            *,
            account:finance_accounts(*),
            category:finance_categories(*, parent:parent_id(*)),
            splits:finance_transaction_splits(*, category:finance_categories(*))
        `)
        .in('account_id', investmentAccountIds)
        .order('date', { ascending: true })
        .order('import_sequence', { ascending: false });

    if (error) console.error("Error en Investment Data:", error);

    // 4. Devolvemos la estructura unificada
    return {
        // Datos de contexto para el Sidebar/Menú
        accounts, 
        categories,
        rules,
        history: history,
        
        // Datos específicos para el Dashboard de Inversión
        investmentAccounts,
        investmentTransactions: transactions || [],
        year
    };
}

