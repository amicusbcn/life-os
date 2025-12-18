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

    // 1. Definimos todas las promesas (añadimos la de reglas)
    const categoriesPromise = getCategories();
    const rulesPromise = supabase.from('finance_rules').select('*'); // 👈 Nueva promesa
    const transactionsPromise = supabase
        .from('finance_transactions')
        .select(`
            *,
            account:finance_accounts(*),
            category:finance_categories(
                *,
                parent:parent_id(*) 
            )
        `)
        .order('date', { ascending: false })
        .limit(500);

    // 2. Obtener las cuentas base y su saldo real
    const baseAccounts = await getAccounts();
    const accountsWithRealBalance = await Promise.all(
        baseAccounts.map(async (acc) => {
            const realBalance = await getAccountRealBalance(acc.id);
            return {
                ...acc,
                current_balance: realBalance
            };
        })
    );

    // 3. Ejecutamos el resto de promesas en paralelo
    const [
        categories, 
        { data: transactionsData, error: transactionsError },
        { data: rulesData, error: rulesError } // 👈 Recuperamos los datos de reglas
    ] = await Promise.all([categoriesPromise, transactionsPromise, rulesPromise]);

    if (transactionsError) console.error('Error fetching transactions:', transactionsError);
    if (rulesError) console.error('Error fetching rules:', rulesError);
    
    // 4. Mapeo de transacciones
    const transactions: FinanceTransaction[] = (transactionsData || []).map((t: any) => ({
        ...t,
        amount: parseFloat(t.amount.toString()), 
        account: t.account as FinanceAccount,
        category: t.category ? {
            ...t.category,
            parent: t.category.parent ? t.category.parent : null
        } : null,
    }));

    // 5. Devolvemos todo (ahora 'rules' existe)
    return {
        accounts: accountsWithRealBalance,
        categories,
        transactions,
        rules: rulesData || [], // 👈 Devolvemos las reglas obtenidas
    };
}

/**
 * Obtiene el saldo calculado (Real) de una cuenta específica llamando al RPC de Postgres.
 */
export async function getAccountRealBalance(accountId: string): Promise<number> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
        .rpc('get_real_balance', { target_account_id: accountId });

    if (error) {
        console.error(`Error fetching real balance for account ${accountId}:`, error);
        return 0;
    }

    return parseFloat(data.toString());
}

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
