// app/finance/data.ts
import { createClient } from '@/utils/supabase/server'
import { FinanceAccount, FinanceCategory, FinanceTransaction, FinanceRule, FinanceDashboardData } from '@/types/finance';

// === FUNCIONES DE CUENTA ===

export async function getAccounts(): Promise<FinanceAccount[]> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
        .from('finance_accounts')
        .select('*')
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching finance accounts:', error);
        return [];
    }

    return data.map(item => ({
    ...item,
        initial_balance: parseFloat(item.initial_balance.toString()),
        current_balance: parseFloat((item.current_balance || 0).toString()), // ✨ Limpieza del saldo actual
    }));
}

// === FUNCIONES DE CATEGORÍA ===

export async function getCategories(): Promise<FinanceCategory[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('finance_categories')
        .select(`
            *,
            parent:parent_id(*)
        `)
        .order('name', { ascending: true }); 

    if (error) {
        console.error('Error fetching finance categories:', error);
        return [];
    }
    return data as FinanceCategory[];
}

// === NUEVO FETCH PARA EL DASHBOARD (ACTUALIZADO CON SALDO REAL) ===


export async function getFinanceDashboardData(): Promise<FinanceDashboardData> {
    const supabase = await createClient();

    // 1. Ejecutamos todas las promesas base en paralelo
    const [
        accounts,
        categories,
        { data: transactionsData, error: txError },
        { data: rulesData, error: rulesError }
    ] = await Promise.all([
        getAccounts(),
        getCategories(),
        supabase
            .from('finance_transactions')
            .select(`
                *,
                account:finance_accounts(*),
                category:finance_categories(
                    *,
                    parent:parent_id(*) 
                ),
                splits:finance_transaction_splits(
                    *,
                    category:finance_categories(*)
                )
            `) // 👈 Añadido el join con splits y su categoría
            .order('date', { ascending: false }),
        supabase.from('finance_rules').select('*')
    ]);

    if (txError) console.error('Error fetching transactions:', txError);
    if (rulesError) console.error('Error fetching rules:', rulesError);

    // 2. Mapeo tipado de transacciones incluyendo desgloses
    const transactions: FinanceTransaction[] = (transactionsData || []).map((t) => ({
        ...t,
        amount: Number(t.amount),
        is_split: t.is_split ?? false, // Garantizamos el booleano
        account: t.account as FinanceAccount,
        category: t.category ? {
            ...t.category,
            parent: t.category.parent || null
        } : null,
        // Mapeo de los hijos (splits)
        splits: (t.splits || []).map((s: any) => ({
            ...s,
            amount: Number(s.amount),
            category: s.category || null
        }))
    }));

    return {
        accounts,
        categories,
        transactions,
        rules: rulesData || [],
    };
}

/**
 * Obtiene el saldo calculado (Real) de una cuenta específica llamando al RPC de Postgres.

export async function getAccountRealBalance(accountId: string): Promise<number> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
        .rpc('get_real_balance', { target_account_id: accountId });

    if (error) {
        console.error(`Error fetching real balance for account ${accountId}:`, error);
        return 0;
    }

    return parseFloat(data.toString());
} */

export async function getRules(): Promise<FinanceRule[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('finance_rules')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching rules:', error);
        return [];
    }
    return data as FinanceRule[];
}
