// app\finance-shared\actions\categorization-actions.ts
'use server'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { upsertSharedTransaction } from './transaction-actions'


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