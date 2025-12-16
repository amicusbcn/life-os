// app/finance/data.ts
import { createClient } from '@/utils/supabase/server'
import { FinanceAccount, FinanceCategory,FinanceTransaction } from '@/types/finance';

// === FUNCIONES DE CUENTA (Ya corregidas) ===

/**
 * Obtiene todas las cuentas financieras del usuario.
 * @returns Array de FinanceAccount o un array vacío en caso de error.
 */
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

    const accounts: FinanceAccount[] = data.map(item => ({
        ...item,
        initial_balance: parseFloat(item.initial_balance.toString()), 
    }));

    return accounts;
}


// === FUNCIONES DE CATEGORÍA (Nuevas) ===

/**
 * Obtiene todas las categorías financieras (Ingreso/Gasto) del usuario.
 * @returns Array de FinanceCategory o un array vacío en caso de error.
*/
export async function getCategories(): Promise<FinanceCategory[]> {
    const supabase = await createClient();
    
    // RLS se encarga de filtrar por user_id.
    const { data, error } = await supabase
        .from('finance_categories')
        // Al seleccionar, también obtenemos el parent_id (UUID o null)
        .select('*')
        // Ordenamos primero por si es Ingreso (is_income), luego por jerarquía y nombre.
        .order('is_income', { ascending: false }) // Ingresos primero
        .order('name', { ascending: true }); 

    if (error) {
        console.error('Error fetching finance categories:', error);
        return [];
    }
    
    // Dado que la BBDD maneja 'parent_id' como UUID o NULL, el mapeo directo es correcto.
    return data as FinanceCategory[];
} 


// === NUEVO FETCH PARA EL DASHBOARD ===

interface FinanceDashboardData {
    accounts: FinanceAccount[];
    categories: FinanceCategory[];
    transactions: FinanceTransaction[];
}

/**
 * Obtiene todos los datos necesarios para el dashboard de finanzas.
 */
export async function getFinanceDashboardData(): Promise<FinanceDashboardData> {
    const supabase = await createClient();

    // 1. Obtener Cuentas (incluye initial_balance)
    const accountsPromise = getAccounts();

    // 2. Obtener Categorías
    const categoriesPromise = getCategories();

    // 3. Obtener Transacciones Recientes (Limitamos a 100 y ordenamos por fecha descendente)
    const { data: transactionsData, error: transactionsError } = await supabase
        .from('finance_transactions')
        .select(`
            *,
            account:finance_accounts(*),
            category:finance_categories(*)
        `)
        .order('date', { ascending: false })
        .limit(100);

    if (transactionsError) {
        console.error('Error fetching dashboard transactions:', transactionsError);
    }
    
    // Esperamos las promesas de Cuentas y Categorías
    const [accounts, categories] = await Promise.all([accountsPromise, categoriesPromise]);

    // Mapeo y tipado de transacciones
    const transactions: FinanceTransaction[] = (transactionsData || []).map((t: any) => ({
        ...t,
        // Conversión numérica necesaria si el campo es 'numeric' en Postgres
        amount: parseFloat(t.amount.toString()), 
        
        // Asociamos los objetos de JOINs
        account: t.account as FinanceAccount,
        category: t.category as FinanceCategory,
    }));

    // NOTA: Para calcular el saldo actual de cada cuenta, se necesitaría una función
    // de BBDD (RPC o View) que sume las transacciones por account_id al initial_balance. 
    // Por ahora, solo usamos el initial_balance.

    return {
        accounts,
        categories,
        transactions,
    };
}