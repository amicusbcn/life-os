// app/finance/data.ts
import { createClient } from '@/utils/supabase/server'
import { 
    FinanceAccount, 
    FinanceCategory, 
    FinanceTransaction, 
    FinanceRule, 
    FinanceDashboardData 
} from '@/types/finance';

// ==========================================
// === ÁTOMOS: FUNCIONES BASE (REUTILIZABLES)
// ==========================================

export async function getAccounts(): Promise<FinanceAccount[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('finance_accounts')
        .select('*')
        .order('account_type', { ascending: true })
        .order('name', { ascending: true });

    if (error) return [];
    return data.map(item => ({
        ...item,
        initial_balance: parseFloat(item.initial_balance.toString()),
        current_balance: parseFloat((item.current_balance || 0).toString()),
    }));
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

export async function getImporterData() {
    const supabase = await createClient();
    const [templates, history] = await Promise.all([
        supabase.from('finance_importer_templates').select('*').order('name'),
        supabase.from('finance_importers')
            .select('*, accounts:account_id(name)')
            .order('created_at', { ascending: false })
            .limit(10)
    ]);
    
    return { 
        templates: templates.data || [], 
        history: history.data || [] 
    };
}

// ==========================================
// === ORQUESTADORES: DATOS POR VISTA
// ==========================================

/**
 * DATOS PARA EL DASHBOARD DE PATRIMONIO
 * Carga lo necesario para saldos, sidebar y configuración, pero ignora transacciones.
 */
export async function getDashboardViewData() {
    const [accounts, categories, importer, rules] = await Promise.all([
        getAccounts(),
        getCategories(),
        getImporterData(),
        getRules()
    ]);

    return {
        accounts,
        categories,
        templates: importer.templates,
        history: importer.history,
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
    const [accounts, categories, rules, importer] = await Promise.all([
        getAccounts(),
        getCategories(),
        getRules(),
        getImporterData()
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
        .order('date', { ascending: false });

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
        templates: importer.templates,
        history: importer.history,
        currentAccount: account, // Será null si es 'all', perfecto para la lógica de la página
        isAllMode: isAll,        // Flag útil para la UI
        year
    };
}



export async function getAnalyticsViewData(year: number = new Date().getFullYear()) {
    const supabase = await createClient();
    const start = `${year}-01-01`;
    const end = `${year}-12-31`;

    const [accounts, categories, rules, importer] = await Promise.all([
        getAccounts(),
        getCategories(),
        getRules(),
        getImporterData()
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
        .lte('date', end);

    if (error) console.error("Error en Analytics:", error);

    // No procesamos nada aquí (salvo que quieras valores iniciales por defecto),
    // simplemente enviamos la materia prima al cliente.
    return {
        accounts,
        categories,
        rules,
        templates: importer.templates,
        history: importer.history,
        year,
        rawTransactions: transactions || [] 
    };
}

// app/finance/data.ts

// app/finance/data.ts

export async function getInvestmentViewData(year: number = new Date().getFullYear()) {
    const supabase = await createClient();

    // 1. Cargamos todos los datos de soporte (igual que en Analytics)
    // Los necesitamos para que el Sidebar y los selectores del menú funcionen
    const [accounts, categories, rules, importer] = await Promise.all([
        getAccounts(),
        getCategories(),
        getRules(),
        getImporterData()
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
        .order('date', { ascending: true });

    if (error) console.error("Error en Investment Data:", error);

    // 4. Devolvemos la estructura unificada
    return {
        // Datos de contexto para el Sidebar/Menú
        accounts, 
        categories,
        rules,
        templates: importer.templates,
        history: importer.history,
        
        // Datos específicos para el Dashboard de Inversión
        investmentAccounts,
        investmentTransactions: transactions || [],
        year
    };
}