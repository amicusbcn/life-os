// app\finance-shared\actions\transaction-actions.ts
'use server'
import { CreateTransactionInput } from '@/types/finance-shared'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { checkGroupAdminPermission } from './group-actions'
import { sendNotification } from '@/utils/notification-helper'



/**
 * ACCIÓN: CREAR TRANSACCIÓN
 */

export async function createSharedTransaction(input: CreateTransactionInput) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autorizado' };

    try {
        const isAdmin = await checkGroupAdminPermission(supabase, input.group_id, user.id);
        
        const payload = {
            group_id: input.group_id,
            account_id: input.account_id,
            date: input.date,
            amount: input.amount, 
            description: input.description,
            notes: input.notes || null,
            category_id: input.type === 'transfer' ? null : input.category_id,
            type: input.type || 'expense',
            payment_source: input.payment_source,
            payer_member_id: input.payment_source === 'member' ? input.payer_member_id : null,
            approval_status: isAdmin ? 'approved' : 'pending', 
            reimbursement_status: input.request_reimbursement ? 'pending' : 'none',
            created_by: user.id,
            is_provision: input.is_provision || false,
            transfer_account_id: input.type === 'transfer' ? input.transfer_account_id : null,
        };

        const { data: tx, error: txError } = await supabase
            .from('finance_shared_transactions')
            .insert(payload)
            .select().single();

        if (txError) throw new Error(txError.message);

        // Sincronizar repartos con el signo original
        await syncAllocations(supabase, tx.id, input);

        revalidatePath('/finance-shared');
        return { success: true, data: tx };
    } catch (e: any) {
        return { error: e.message };
    }
}

/**
 * ACCIÓN: ACTUALIZAR TRANSACCIÓN
 */
export async function updateSharedTransaction(transactionId: string, input: any) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autorizado' };

    try {
        // 1. Buscamos la transacción actual para comparar
        const { data: fetchOld, error: fetchError } = await supabase
            .from('finance_shared_transactions')
            .select('*')
            .eq('id', transactionId);

        if (fetchError) {
            console.error("❌ Error de lectura Supabase:", fetchError.message);
            throw new Error(fetchError.message);
        }

        const oldTx = fetchOld?.[0];
        
        if (!oldTx) {
            console.error("❌ NO EXISTE EN DB. ID buscado:", transactionId);
            // Vamos a ver si existen otras transacciones para descartar RLS total
            const { count } = await supabase.from('finance_shared_transactions').select('*', { count: 'exact', head: true });
            throw new Error(`La transacción ${transactionId} no existe o no tienes permiso para verla`);
        }


        const isTransfer = input.type === 'transfer';
        const newAmount = parseFloat(input.amount);

        // 2. PAYLOAD
        const payload: any = {
            date: input.date,
            amount: newAmount,
            description: input.description,
            notes: input.notes,
            type: input.type,
            category_id: isTransfer ? null : input.category_id,
            payer_member_id: input.payer_member_id,
            account_id: input.account_id,
            payment_source: input.payment_source,
            approval_status: input.approval_status || 'approved',
            transfer_account_id: isTransfer ? input.transfer_account_id : null,
            is_provision: input.is_provision || false
        };

        // 3. UPDATE
        const { error: updateError } = await supabase
            .from('finance_shared_transactions')
            .update(payload)
            .eq('id', transactionId);

        if (updateError) {
            console.error("❌ Error en el UPDATE:", updateError.message);
            throw new Error(updateError.message);
        }
        
        // 4. LÓGICA DE ESPEJO
        let linkedId = oldTx.linked_transaction_id;
        
        if (isTransfer && input.transfer_account_id) {
            const mirrorPayload = {
                group_id: oldTx.group_id,
                account_id: input.transfer_account_id,
                date: input.date,
                amount: newAmount * -1,
                description: 'Espejo: ' + input.description,
                type: 'transfer',
                approval_status: 'approved',
                transfer_account_id: input.account_id,
                linked_transaction_id: transactionId,
                created_by: user.id
            };

            if (linkedId) {
                await supabase.from('finance_shared_transactions').update(mirrorPayload).eq('id', linkedId);
            } else {
                const { data: newMirror, error: mirrorErr } = await supabase
                    .from('finance_shared_transactions')
                    .insert(mirrorPayload)
                    .select()
                    .single();
                
                if (mirrorErr) console.error("❌ Error creando espejo:", mirrorErr.message);
                if (newMirror) {
                    linkedId = newMirror.id;
                    await supabase.from('finance_shared_transactions').update({ linked_transaction_id: linkedId }).eq('id', transactionId);
                }
            }
        }

        await syncAllocations(supabase, transactionId, input);

        revalidatePath('/finance-shared');
        return { success: true, data: { ...oldTx, ...payload, linked_transaction_id: linkedId } };

    } catch (e: any) {
        console.error("🔴 CRASH EN ACCIÓN:", e.message);
        return { error: e.message };
    }
}

/**
 * ACCIÓN: UPSERT (Solo para casos especiales como transferencias espejo o importaciones manuales)
 */
export async function upsertSharedTransaction(groupId: string, transaction: any) {
    // Si tiene ID, llama a update. Si no, a create.
    if (transaction.id) {
        return await updateSharedTransaction(transaction.id, transaction);
    } else {
        return await createSharedTransaction(transaction);
    }
}
// BORRAR TRANSACCIÓN (Admin o el Creador si está pendiente)
export async function deleteTransaction(transactionId: string, groupId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autorizado' }

    // Aquí podríamos refinar permisos, por ahora solo Admin borra para simplificar
    const isAdmin = await checkGroupAdminPermission(supabase, groupId, user.id)
    if (!isAdmin) return { error: 'Solo los administradores pueden borrar movimientos ya registrados.' }

    // Al borrar la transacción, los allocations se borran solos por "Cascade Delete" de SQL
    const { error } = await supabase
        .from('finance_shared_transactions')
        .delete()
        .eq('id', transactionId)

    if (error) return { error: error.message }
    revalidatePath('/finance-shared')
    return { success: true }
}
// APROBAR GASTO (Solo Admin)
export async function approveTransaction(transactionId: string, groupId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autorizado' }

    const isAdmin = await checkGroupAdminPermission(supabase, groupId, user.id)
    if (!isAdmin) return { error: 'Permiso denegado' }

    const { error } = await supabase
        .from('finance_shared_transactions')
        .update({ approval_status: 'approved' })
        .eq('id', transactionId)

    if (error) return { error: error.message }
    revalidatePath('/finance-shared')
    return { success: true }
}

// MARCAR REEMBOLSO COMO PAGADO (Solo Admin)
export async function markReimbursementPaid(transactionId: string, groupId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autorizado' }

    const isAdmin = await checkGroupAdminPermission(supabase, groupId, user.id)
    if (!isAdmin) return { error: 'Permiso denegado' }

    const { error } = await supabase
        .from('finance_shared_transactions')
        .update({ reimbursement_status: 'paid' })
        .eq('id', transactionId)

    if (error) return { error: error.message }
    revalidatePath('/finance-shared')
    return { success: true }
}

/*********HELPERS*********/

/**
 * LÓGICA DE REPARTO UNIFICADA
 * Calcula importes, pesos y ajuste de céntimos.
 */
function calculateAllocations(totalAmount: number, involvedIds: string[], splitType: string, weights?: Record<string, number>) {
    // ELIMINAMOS Math.abs. Trabajamos con el número real (positivo o negativo)
    if (involvedIds.length === 0) return [];

    let allocations: { member_id: string, amount: number }[] = [];

    if (splitType === 'weighted' && weights) {
        const totalWeight = involvedIds.reduce((sum, id) => sum + (weights[id] || 0), 0);
        if (totalWeight === 0) return [];
        const amountPerWeight = totalAmount / totalWeight; // Mantiene el signo
        allocations = involvedIds.map(id => ({
            member_id: id,
            amount: Number((amountPerWeight * (weights[id] || 0)).toFixed(2))
        }));
    } else {
        const splitAmount = totalAmount / involvedIds.length; // Mantiene el signo
        allocations = involvedIds.map(id => ({
            member_id: id,
            amount: Number(splitAmount.toFixed(2))
        }));
    }

    // AJUSTE DE CÉNTIMOS (Ahora funciona con negativos perfectamente)
    const currentSum = allocations.reduce((sum, a) => sum + a.amount, 0);
    const diff = Number((totalAmount - currentSum).toFixed(2));
    
    if (Math.abs(diff) > 0 && allocations.length > 0) {
        allocations[0].amount = Number((allocations[0].amount + diff).toFixed(2));
    }

    return allocations;
}

/**
 * SINCRONIZADOR DE REPARTOS EN DB
 * Borra y recrea los registros de la tabla finance_shared_allocations
 */
async function syncAllocations(supabase: any, transactionId: string, input: any) {
    if (input.type === 'transfer') return;
    
    // 1. Limpiar anteriores
    await supabase.from('finance_shared_allocations').delete().eq('transaction_id', transactionId);

    let allocations = [];

    // --- LA MEJORA ---
    // Si el input ya trae el reparto "cocinado" (como haces en el Dialog), lo usamos directamente
    if (input.allocations && input.allocations.length > 0) {
        allocations = input.allocations.map((a: any) => ({
            member_id: a.member_id,
            amount: a.amount // Aquí ya viene con el signo correcto desde el Dialog
        }));
    } else {
        // Si no trae nada manual, calculamos el automático como antes
        allocations = calculateAllocations(
            input.amount, 
            input.involved_member_ids || [], 
            input.split_type, 
            input.split_weights
        );
    }

    // 3. Insertar
    if (allocations.length > 0) {
        const { error } = await supabase.from('finance_shared_allocations').insert(
            allocations.map((a: any) => ({ ...a, transaction_id: transactionId }))
        );
        if (error) throw new Error("Error sincronizando repartos: " + error.message);
    }
}