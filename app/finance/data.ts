// app/finance/data.ts
import { createClient } from '@/utils/supabase/server'
import { 
    FinanceAccount, 
    FinanceCategory, 
    FinanceTransaction, 
    FinanceRule, 
    FinanceDashboardData 
} from '@/types/finance';

// === FUNCIONES DE CUENTA ===
export async function getAccounts(): Promise<FinanceAccount[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('finance_accounts')
        .select('*')
        .order('name', { ascending: true });

    if (error) return [];
    return data.map(item => ({
        ...item,
        initial_balance: parseFloat(item.initial_balance.toString()),
        current_balance: parseFloat((item.current_balance || 0).toString()),
    }));
}

// === FUNCIONES DE CATEGORÍA ===
export async function getCategories(): Promise<FinanceCategory[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('finance_categories')
        .select('*, parent:parent_id(*)')
        .order('name', { ascending: true }); 

    if (error) return [];
    return data as FinanceCategory[];
}

// === FUNCIONES DE IMPORTACIÓN (NUEVAS) ===
export async function getImporterTemplates() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('finance_importer_templates')
        .select('*')
        .order('name');
    
    if (error) return [];
    return data;
}

export async function getImportHistory() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('finance_importers')
        .select('*, accounts:account_id(name)')
        .order('created_at', { ascending: false })
        .limit(10);
    
    if (error) return [];
    return data;
}

// === FUNCIONES DE REGLAS ===
export async function getRules(): Promise<FinanceRule[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('finance_rules')
        .select('*')
        .order('created_at', { ascending: false });

    return error ? [] : data;
}

// === FUNCIÓN DE TRANSACCIONES (MODULARIZADA) ===
async function getTransactions(): Promise<FinanceTransaction[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('finance_transactions')
        .select(`
            *,
            account:finance_accounts(*),
            category:finance_categories(*, parent:parent_id(*)),
            splits:finance_transaction_splits(*, category:finance_categories(*))
        `)
        .order('date', { ascending: false });

    if (error) return [];

    return data.map((t) => ({
        ...t,
        amount: Number(t.amount),
        is_split: t.is_split ?? false,
        account: t.account as FinanceAccount,
        category: t.category ? { ...t.category, parent: t.category.parent || null } : null,
        splits: (t.splits || []).map((s: any) => ({
            ...s,
            amount: Number(s.amount),
            category: s.category || null
        }))
    }));
}

// === FUNCIÓN DASHBOARD (LA ORQUESTA) ===
export async function getFinanceDashboardData(): Promise<FinanceDashboardData> {
    // Disparamos todo en paralelo. Súper eficiente en Server Components.
    const [
        accounts,
        categories,
        transactions,
        rules,
        templates,
        history
    ] = await Promise.all([
        getAccounts(),
        getCategories(),
        getTransactions(),
        getRules(),
        getImporterTemplates(),
        getImportHistory()
    ]);

    return {
        accounts,
        categories,
        transactions,
        rules,
        templates,
        history
    };
}