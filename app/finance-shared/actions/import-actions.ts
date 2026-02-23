import { createClient } from "@/utils/supabase/server"
import { checkGroupAdminPermission } from "./group-actions"
import { revalidatePath } from "next/cache"


export async function importBankTransactions(
    groupId: string, 
    transactions: { 
        date: string, 
        amount: number, 
        description: string, 
        notes?: string, 
        bank_balance?: number 
    }[]
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autorizado' }

    if (!transactions || transactions.length === 0) {
        return { error: 'No se han recibido datos para importar.' }
    }

    try {
        const isAdmin = await checkGroupAdminPermission(supabase, groupId, user.id)
        if (!isAdmin) return { error: 'Permiso denegado' }

        // --- PASO 1: DETECTAR CUENTA DESTINO ---
        const { data: group } = await supabase
            .from('finance_shared_groups')
            .select('default_account_id')
            .eq('id', groupId)
            .single()

        let targetAccountId = group?.default_account_id

        if (!targetAccountId) {
            const { data: firstAccount } = await supabase
                .from('finance_shared_accounts')
                .select('id')
                .eq('group_id', groupId)
                .limit(1)
                .single()
            targetAccountId = firstAccount?.id
        }

        if (!targetAccountId) return { error: 'No existe cuenta bancaria destino.' }

        // --- PASO 2: CREAR EL REGISTRO DE IMPORTACIÓN (EL LOTE) ---
        // Esto es lo que permite el "Deshacer" y activa el Trigger de protección
        const { data: importRecord, error: importError } = await supabase
            .from('finance_shared_imports')
            .insert({
                file_name: `Importación ${new Date().toLocaleDateString()}`,
                row_count: transactions.length,
                created_by: user.id
            })
            .select()
            .single()

        if (importError) throw new Error(`Error al crear lote de importación: ${importError.message}`)

        // --- PASO 3: INSERTAR FILAS CON SIGNOS REALES ---
        const rowsToInsert = transactions.map(tx => ({
            group_id: groupId,
            account_id: targetAccountId,
            import_id: importRecord.id,
            date: tx.date,
            amount: tx.amount, 
            description: tx.description,
            notes: tx.notes || null,
            bank_balance: tx.bank_balance ?? null,
            type: tx.amount < 0 ? 'expense' : 'income', 
            payment_source: 'account',
            status: 'approved',
            created_by: user.id
        }))

        const { error: insertError } = await supabase
            .from('finance_shared_transactions')
            .insert(rowsToInsert)

        if (insertError) {
            // Si falla la inserción, borramos el lote de importación para no dejar basura
            await supabase.from('finance_shared_imports').delete().eq('id', importRecord.id)
            throw new Error(`Error insertando transacciones: ${insertError.message}`)
        }

        revalidatePath('/finance-shared')
        return { success: true, count: transactions.length }

    } catch (error: any) {
        console.error("Error crítico import:", error)
        return { error: error.message }
    }
}