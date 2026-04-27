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

// Un ejemplo de cómo estructurar la respuesta para los gráficos
// app/finance/data.ts

// app/finance/data.ts

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

    const safeTransactions = transactions || [];
    const TRANSFER_CAT_ID = "10310a6a-5d3b-4e95-a19f-bfef8cd2dd1a";
    
    const expenses = safeTransactions.filter(t => t.amount < 0 && t.category_id !== TRANSFER_CAT_ID);
    const income = safeTransactions.filter(t => t.amount > 0 && t.category_id !== TRANSFER_CAT_ID);

    const monthlyEvolution = Array.from({ length: 12 }, (_, i) => {
        const monthLabel = new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(new Date(year, i));
        return { name: monthLabel.toUpperCase(), gastos: 0, ingresos: 0 };
    });

    // --- NUEVA ESTRUCTURA PARA DRILL-DOWN ---
    const parentMap: Record<string, { id: string, name: string, value: number, color: string }> = {};
    const subMap: Record<string, Record<string, { name: string, value: number, color: string }>> = {};

    expenses.forEach(t => {
        const absAmount = Math.abs(t.amount);
        monthlyEvolution[new Date(t.date).getMonth()].gastos += absAmount;

        const cat = categories.find(c => c.id === t.category_id);
        const parent = cat?.parent_id ? categories.find(p => p.id === cat.parent_id) : cat;
        
        if (parent) {
            // 1. Agrupar nivel Padre
            if (!parentMap[parent.id]) {
                parentMap[parent.id] = { 
                    id: parent.id, 
                    name: parent.name, 
                    value: 0, 
                    color: parent.color || "#94a3b8" 
                };
            }
            parentMap[parent.id].value += absAmount;

            // 2. Agrupar nivel Subcategoría (solo si la transacción tiene una subcategoría)
            if (cat && cat.id !== parent.id) {
                if (!subMap[parent.id]) subMap[parent.id] = {};
                if (!subMap[parent.id][cat.id]) {
                    subMap[parent.id][cat.id] = { 
                        name: cat.name, 
                        value: 0, 
                        color: cat.color || parent.color || "#cbd5e1" 
                    };
                }
                subMap[parent.id][cat.id].value += absAmount;
            } else if (cat && cat.id === parent.id) {
                // Caso: Transacción categorizada directamente al padre
                if (!subMap[parent.id]) subMap[parent.id] = {};
                const generalKey = `${parent.id}_gen`;
                if (!subMap[parent.id][generalKey]) {
                    subMap[parent.id][generalKey] = { 
                        name: `${parent.name} (General)`, 
                        value: 0, 
                        color: parent.color || "#cbd5e1" 
                    };
                }
                subMap[parent.id][generalKey].value += absAmount;
            }
        }
    });

    income.forEach(t => {
        monthlyEvolution[new Date(t.date).getMonth()].ingresos += t.amount;
    });

    const totalSpent = expenses.reduce((acc, t) => acc + Math.abs(t.amount), 0);
    const totalIncome = income.reduce((acc, t) => acc + t.amount, 0);
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalSpent) / totalIncome) * 100 : 0;

    // Convertimos los mapas internos de subcategorías a arrays para Recharts
    const subCategoryDistribution: Record<string, any[]> = {};
    Object.keys(subMap).forEach(parentId => {
        subCategoryDistribution[parentId] = Object.values(subMap[parentId]).sort((a, b) => b.value - a.value);
    });

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