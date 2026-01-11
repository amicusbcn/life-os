// app/finance/actions/travel-link.ts
'use server'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { FinanceTransaction} from '@/types/finance'; 

export async function getActiveTripsAction(context: 'work' | 'personal') {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('travel_trips')
        .select('id, name, start_date, end_date, context')
        .eq('context', context) // ✨ Filtro vital
        .order('start_date', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, data };
}

export async function createFullTripAction(name: string, startDate: string, context: 'work' | 'personal') {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Si es profesional, necesitamos un empleador
    let employer_id = null;
    if (context === 'work') {
        const { data: emp } = await supabase.from('travel_employers').select('id').limit(1).single();
        employer_id = emp?.id;
    }

    const { data, error } = await supabase
        .from('travel_trips')
        .insert({
            name,
            start_date: startDate,
            end_date: startDate,
            context, // ✨ Asignamos el contexto aquí
            employer_id,
            user_id: user?.id,
            status: 'planned'
        })
        .select().single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
}
// 2. Obtener gastos de un viaje (de la tabla travel_expenses)
// app/finance/actions.ts

export async function getTripExpensesAction(tripId: string) {
    const supabase = await createClient();
    
    // Traemos los gastos del viaje
    // Nota: Asegúrate de que el campo es 'trip_id' o 'travel_trip_id' según tu esquema
    const { data, error } = await supabase
        .from('travel_expenses')
        .select('*')
        .eq('trip_id', tripId)
        .order('date', { ascending: false });

    if (error) {
        console.error("Error cargando gastos:", error);
        return { success: false, error: error.message };
    }

    return { success: true, data };
}

// app/finance/actions.ts

export async function findSuggestedExpenseAction(amount: number, date: string, context: 'work' | 'personal') {
    const supabase = await createClient();
    const absAmount = Math.abs(amount);
    
    // Margen de 5 días para el banco
    const d = new Date(date);
    const minDate = new Date(d.getTime() - (5 * 24 * 60 * 60 * 1000)).toISOString();
    const maxDate = new Date(d.getTime() + (5 * 24 * 60 * 60 * 1000)).toISOString();

    const { data, error } = await supabase
        .from('travel_expenses')
        .select(`
            *,
            travel_trips!inner (id, name, context, status)
        `)
        .eq('amount', absAmount)
        .eq('travel_trips.context', context) // ✨ Solo sugerir gastos del mismo contexto
        .gte('date', minDate)
        .lte('date', maxDate)
        .order('date', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, data };
}

export async function reconcileTravelExpenseAction(
    txId: string, 
    expenseId: string, 
    mode: 'exact' | 'adjust_trip' | 'virtual_adjustment'
) {
    const supabase = await createClient();
    const VIRTUAL_ACCOUNT_ID = 'id-de-tu-cuenta-virtual'; // 🚩 Configurar

    // 1. Obtener datos de ambos lados
    const { data: tx } = await supabase.from('finance_transactions').select('*').eq('id', txId).single();
    const { data: exp } = await supabase.from('travel_expenses').select('*, travel_trips(status, context)').eq('id', expenseId).single();

    if (!tx || !exp) return { success: false, error: "Datos no encontrados" };

    const diff = Math.abs(tx.amount) - exp.amount;

    // ESCENARIO A: Ajustar el gasto del viaje (Solo si está abierto)
    if (mode === 'adjust_trip') {
        if (exp.travel_trips.status === 'closed') return { success: false, error: "No se puede ajustar un viaje cerrado" };
        await supabase.from('travel_expenses').update({ amount: Math.abs(tx.amount) }).eq('id', expenseId);
    }

    // ESCENARIO B: Transacción de ajuste en cuenta virtual
    if (mode === 'virtual_adjustment' && diff !== 0) {
        await supabase.from('finance_transactions').insert({
            account_id: VIRTUAL_ACCOUNT_ID,
            amount: -diff, // El ajuste negativo para cuadrar
            date: tx.date,
            concept: `Ajuste dieta: ${tx.concept}`,
            category_id: tx.category_id, // Mantenemos la categoría (Work/Perso)
            travel_expense_id: expenseId,
            user_id: tx.user_id
        });
    }

    // 2. Vincular finalmente la transacción bancaria original
    return await linkTransactionToExpenseAction(txId, expenseId, exp.trip_id);
}

// 3. Vincular transacción bancaria con un gasto de viaje específico
export async function linkTransactionToExpenseAction(txId: string, expenseId: string, tripId: string) {
    const supabase = await createClient();
    
    const { error } = await supabase
        .from('finance_transactions')
        .update({ 
            travel_expense_id: expenseId,
            trip_id: tripId // 🚀 Guardamos el acceso directo al viaje
        })
        .eq('id', txId);

    if (error) return { success: false, error: error.message };
    return { success: true };
}

// 4. Crear un gasto en el viaje directamente desde el banco (si no existe el ticket)
// app/finance/actions.ts

export async function createExpenseFromBankAction(
    tripId: string, 
    transaction: FinanceTransaction, 
    travelCategoryId: string, 
    context: 'work' | 'personal',
    customConcept: string // ✨ Recibimos el nombre editado por el usuario
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "No autorizado" };

    // 1. Creamos el gasto en la tabla de viajes con el nombre personalizado
    const { data: newExpense, error: expError } = await supabase
        .from('travel_expenses')
        .insert({
            trip_id: tripId,
            user_id: user.id,
            date: transaction.date,
            concept: customConcept, // ✨ El nombre descriptivo va a Viajes
            amount: Math.abs(transaction.amount),
            category_id: travelCategoryId, 
            context: context,
            is_reimbursable: context === 'work',
            personal_accounting_checked: true
        })
        .select().single();

    if (expError || !newExpense) return { success: false, error: "Error al crear gasto" };

    // 2. ACTUALIZAMOS LA TRANSACCIÓN: Vínculo + Notas (Alias)
    const { error: txError } = await supabase
        .from('finance_transactions')
        .update({ 
            travel_expense_id: newExpense.id,
            trip_id: tripId,
            notes: customConcept // ✨ El nombre descriptivo se guarda como NOTA en Finanzas
        })
        .eq('id', transaction.id);

    if (txError) return { success: false, error: "Error al vincular y guardar nota" };

    revalidatePath('/finance');
    return { success: true, data: newExpense };
}

// Vincular la transacción bancaria con el gasto de viaje
export async function linkTxToExpenseAction(txId: string, expenseId: string) {
    const supabase = await createClient();
    
    const { error } = await supabase
        .from('finance_transactions')
        .update({ travel_expense_id: expenseId })
        .eq('id', txId);

    if (error) return { success: false, error: error.message };
    return { success: true };
}

// app/finance/actions.ts

export async function getTravelCategoriesAction(context: 'work' | 'personal') {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('travel_categories')
        .select('*')
        .eq('context', context) 
        .order('name');
        
    if (error) {
        console.error("SQL Error travel_categories:", error);
        return { success: false, error: error.message };
    }
    return { success: true, data };
}

// app/finance/actions.ts

export async function unlinkTransactionFromTravelAction(
    transactionId: string,
    expenseId: string,
    deleteExpense: boolean // true = Opción 3, false = Opción 2
) {
    const supabase = await createClient();

    // 1. Eliminar cualquier movimiento de AJUSTE (Cuenta Virtual) 
    // Estos movimientos se crearon para este gasto específico.
    await supabase
        .from('finance_transactions')
        .delete()
        .eq('travel_expense_id', expenseId)
        .neq('id', transactionId); // NO borramos la transacción real

    // 2. Limpiar el vínculo y la categoría en la transacción principal
    await supabase
        .from('finance_transactions')
        .update({ 
            travel_expense_id: null,
            trip_id: null,
            category_id: null // La dejamos como "pendiente"
        })
        .eq('id', transactionId);

    // 3. Si el usuario eligió borrar también el gasto en la App de Viajes
    if (deleteExpense) {
        await supabase
            .from('travel_expenses')
            .delete()
            .eq('id', expenseId);
    }

    revalidatePath('/finance');
    return { success: true };
}