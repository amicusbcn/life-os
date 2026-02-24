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
        // Aseguramos que existe el group_id antes de seguir
        if (!input.group_id) {
            throw new Error("El group_id es obligatorio para crear una transacción.");
        }

        const isAdmin = await checkGroupAdminPermission(supabase, input.group_id, user.id);
        
        // 2. CONSTRUCCIÓN DEL PAYLOAD (Limpiando valores)
        const payload = {
            group_id: input.group_id,
            // Si viene de formulario manual, forzamos null si es 'group_account' o vacío
            account_id: input.account_id === 'group_account' ? null : (input.account_id || null),
            date: input.date,
            amount: input.amount, 
            description: input.description,
            notes: input.notes || null,
            category_id: input.type === 'transfer' ? null : (input.category_id || null),
            type: input.type || 'expense',
            payment_source: input.payment_source,
            payer_member_id: input.payment_source === 'member' ? input.payer_member_id : null,
            // Ojo: revisa si tu columna es approval_status o status a secas
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

        if (txError) {
            console.error("❌ ERROR EN INSERT:", txError);
            throw new Error(txError.message);
        }

        // Sincronizar repartos
        await syncAllocations(supabase, tx.id, input);

        revalidatePath('/finance-shared');
        return { success: true, data: tx };
    } catch (e: any) {
        console.error("🔴 CRASH EN CREATE:", e.message);
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
        // 1. Buscamos la transacción actual para tener la base
        const { data: oldTx, error: fetchError } = await supabase
            .from('finance_shared_transactions')
            .select('*')
            .eq('id', transactionId)
            .single();

        if (fetchError || !oldTx) {
            throw new Error(`La transacción no existe o no tienes permiso: ${fetchError?.message}`);
        }

        // --- LÓGICA INTELIGENTE DE TIPO (El cerebro de la operación) ---
        let finalType = input.type || oldTx.type;
        const currentAmount = input.amount !== undefined ? parseFloat(input.amount) : oldTx.amount;
        const currentCategoryId = input.category_id !== undefined ? input.category_id : oldTx.category_id;

        // Si hay una categoría, comprobamos si es de tipo préstamo
        if (currentCategoryId && finalType !== 'transfer') {
            const { data: cat } = await supabase
                .from('finance_shared_categories')
                .select('is_loan')
                .eq('id', currentCategoryId)
                .single();

            if (cat?.is_loan) {
                finalType = 'loan';
            } else {
                // Si no es préstamo, volvemos a auto-detectar por signo
                finalType = currentAmount >= 0 ? 'income' : 'expense';
            }
        } else if (finalType !== 'transfer' && finalType !== 'loan') {
            // Fallback por si no hay categoría
            finalType = currentAmount >= 0 ? 'income' : 'expense';
        }

        const isTransfer = finalType === 'transfer';

        // 2. CONSTRUCCIÓN DEL PAYLOAD (Limpiando nulos y tipos)
        const payload: any = {
            date: input.date || oldTx.date,
            description: input.description || oldTx.description,
            notes: input.notes !== undefined ? input.notes : oldTx.notes,
            type: finalType,
            category_id: isTransfer ? null : currentCategoryId,
            payer_member_id: input.payer_member_id || oldTx.payer_member_id,
            account_id: input.account_id || oldTx.account_id,
            payment_source: input.payment_source || oldTx.payment_source,
            approval_status: input.approval_status || oldTx.approval_status || 'approved',
            transfer_account_id: isTransfer ? (input.transfer_account_id || oldTx.transfer_account_id) : null,
            is_provision: input.is_provision !== undefined ? input.is_provision : oldTx.is_provision,
            split_template_id: input.split_template_id !== undefined ? input.split_template_id : oldTx.split_template_id,
            debt_link_id: input.debt_link_id !== undefined ? input.debt_link_id : oldTx.debt_link_id
        };

        // Solo actualizamos amount si no es una importación bloqueada o si viene explícito
        if (input.amount !== undefined) {
            payload.amount = parseFloat(input.amount);
        }

        // 3. EJECUTAR EL UPDATE
        const { error: updateError } = await supabase
            .from('finance_shared_transactions')
            .update(payload)
            .eq('id', transactionId);

        if (updateError) throw new Error(updateError.message);
        
        // 4. LÓGICA DE ESPEJO (TRASPASOS)
        let linkedId = oldTx.linked_transaction_id;
        if (isTransfer && payload.transfer_account_id) {
            const mirrorPayload = {
                group_id: oldTx.group_id,
                account_id: payload.transfer_account_id,
                date: payload.date,
                amount: (payload.amount || oldTx.amount) * -1,
                description: 'Espejo: ' + payload.description,
                type: 'transfer',
                approval_status: 'approved',
                transfer_account_id: payload.account_id,
                linked_transaction_id: transactionId,
                created_by: user.id
            };

            if (linkedId) {
                await supabase.from('finance_shared_transactions').update(mirrorPayload).eq('id', linkedId);
            } else {
                const { data: newMirror } = await supabase
                    .from('finance_shared_transactions')
                    .insert(mirrorPayload)
                    .select().single();
                if (newMirror) {
                    linkedId = newMirror.id;
                    await supabase.from('finance_shared_transactions').update({ linked_transaction_id: linkedId }).eq('id', transactionId);
                }
            }
        }

        // 5. SINCRONIZAR REPARTOS
        // Pasamos el input mezclado con el nuevo tipo para que syncAllocations sepa qué hacer
        await syncAllocations(supabase, transactionId, { ...input, amount: currentAmount, type: finalType });

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

    let finalAllocations = [];
    const amount = parseFloat(input.amount);

    // --- ESCENARIO A: USAR PLANTILLA (Búsqueda en DB) ---
    if (input.split_template_id) {
        
        // 1. Buscamos la plantilla incluyendo sus miembros (JOIN)
        const { data: template, error: tError } = await supabase
            .from('finance_shared_split_templates')
            .select(`
                id,
                name,
                members:finance_shared_split_template_members (
                    member_id,
                    shares
                )
            `)
            .eq('id', input.split_template_id)
            .single();

        if (tError || !template || !template.members) {
            console.error("❌ Error recuperando miembros de la plantilla:", tError);
        } else {
            // 2. Mapeamos los datos para que calculateAllocations los entienda
            const memberIds = template.members.map((m: any) => m.member_id);
            
            // Creamos el objeto de pesos (split_weights) a partir de 'shares'
            const splitWeights: Record<string, number> = {};
            template.members.forEach((m: any) => {
                splitWeights[m.member_id] = parseFloat(m.shares);
            });

            // 3. Calculamos
            finalAllocations = calculateAllocations(
                amount,
                memberIds,
                'weighted', // Usamos weighted porque tienes una columna 'shares'
                splitWeights
            );
        }
    } 
    // --- ESCENARIO B: REPARTO COCINADO (Desde el Formulario manual) ---
    else if (input.allocations && input.allocations.length > 0) {
        finalAllocations = input.allocations.map((a: any) => ({
            member_id: a.member_id,
            amount: a.amount 
        }));
    } 
    // --- ESCENARIO C: FALLBACK AUTOMÁTICO (Igualitario) ---
    else {
        finalAllocations = calculateAllocations(
            amount, 
            input.involved_member_ids || [], 
            input.split_type || 'equal', 
            input.split_weights
        );
    }

    // 3. Insertar
    if (finalAllocations.length > 0) {
        const { error } = await supabase.from('finance_shared_allocations').insert(
            finalAllocations.map((a: any) => ({ ...a, transaction_id: transactionId }))
        );
        if (error) throw new Error("Error sincronizando repartos: " + error.message);
    }
}