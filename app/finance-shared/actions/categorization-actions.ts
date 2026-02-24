// app\finance-shared\actions\categorization-actions.ts
'use server'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { upsertSharedTransaction } from './transaction-actions'


export async function updateTransactionCategory(transactionId: string, categoryId: string) {
    const supabase = await createClient()
    console.log(`   🏷️  Updating transaction ${transactionId} to category ${categoryId}`)
    // 1. Obtenemos la info de la NUEVA categoría (para ver si is_loan es true)
    const { data: category, error: catError } = await supabase
        .from('finance_shared_categories')
        .select('is_loan')
        .eq('id', categoryId)
        .single()

    if (catError || !category) return { error: 'Categoría no encontrada' }

    // 2. Obtenemos el importe del movimiento actual (para recalcular income/expense si deja de ser préstamo)
    const { data: transaction, error: txError } = await supabase
        .from('finance_shared_transactions')
        .select('amount,type')
        .eq('id', transactionId)
        .single()

    if (txError || !transaction) return { error: 'Transacción no encontrada' }

    // 3. LÓGICA DE TIPO (Igual que en el formulario)
    let newType = transaction.type
    if (category.is_loan) {
        newType = 'loan' // Si la categoría es préstamo, forzamos tipo préstamo
    }

    // 4. Actualizamos Categoría Y Tipo
    const { error } = await supabase
        .from('finance_shared_transactions')
        .update({ 
            category_id: categoryId,
            type: newType 
        })
        .eq('id', transactionId)

    if (error) return { error: error.message }
    
    revalidatePath('/finance-shared')
    return { success: true }
}

// Acción para buscar gastos huérfanos (Bottom-Up)
export async function getOrphanExpenses(groupId: string, accountId: string, maxDate: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('finance_shared_transactions')
        .select('id, description, amount, date, account_id, type, parent_transaction_id') // Pedimos campos clave para verlos en el log
        .eq('group_id', groupId)
        .eq('type', 'expense')
        .is('parent_transaction_id', null)
        .eq('account_id', accountId)
        .lte('date', maxDate)
        .order('date', { ascending: false })
        .limit(50)

    if (error) {
        console.error("   🔥 ERROR SUPABASE:", error.message)
        return []
    }
    return data || []
}
// Acción para crear un hijo directamente vinculado
export async function createChildTransaction(groupId: string, payload: any) {
    return await upsertSharedTransaction(groupId, payload)
}

// Acción para vincular
export async function linkOrphansToParent(orphanIds: string[], parentTxId: string) {
    const supabase = await createClient()
    
    const { error } = await supabase
        .from('finance_shared_transactions')
        .update({ parent_transaction_id: parentTxId })
        .in('id', orphanIds)
        
    if (error) console.error('Error linking orphans:', error)
    return { error: error?.message }
}