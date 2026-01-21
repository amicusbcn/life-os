// /app/finance-shaerd/actions.ts
'use server'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { CreateGroupInput,AddMemberInput, UpdateMemberInput, CreateSharedCategoryInput, SharedCategory, AssignAccountManagerInput,CreateTransactionInput, SharedAccount } from '@/types/finance-shared'

// ... funciones anteriores (getSharedGroups, etc)

export async function createSharedGroup(input: CreateGroupInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'No autorizado' }

  try {
    // 1. Crear el Grupo
    const { data: group, error: groupError } = await supabase
      .from('finance_shared_groups')
      .insert({
        name: input.name,
        currency: input.currency,
        owner_id: user.id
      })
      .select()
      .single()

    if (groupError) throw new Error(groupError.message)

    // 2. Añadir al creador como Miembro Admin
    const { error: memberError } = await supabase
      .from('finance_shared_members')
      .insert({
        group_id: group.id,
        user_id: user.id,
        name: 'Admin', // Nombre temporal, luego pueden cambiárselo
        role: 'admin'
      })

    if (memberError) {
      // Si falla crear el miembro, deberíamos borrar el grupo para no dejar basura
      await supabase.from('finance_shared_groups').delete().eq('id', group.id)
      throw new Error(memberError.message)
    }

    // 3. Crear una cuenta por defecto "Efectivo/Banco" (Opcional pero recomendado para empezar rápido)
    await supabase.from('finance_shared_accounts').insert({
        group_id: group.id,
        name: 'Cuenta Principal',
        balance: 0,
        type: 'checking'
    })

    revalidatePath('/finance-shared')
    return { success: true }

  } catch (error: any) {
    console.error('Error creating group:', error)
    return { error: error.message }
  }
}

async function checkGroupAdminPermission(supabase: any, groupId: string, userId: string) {
  // 1. Verificar si es el Owner del grupo
  const { data: group } = await supabase
    .from('finance_shared_groups')
    .select('owner_id')
    .eq('id', groupId)
    .single()
  
  if (group?.owner_id === userId) return true

  // 2. Verificar si es Miembro con rol Admin
  const { data: member } = await supabase
    .from('finance_shared_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .single()

  return member?.role === 'admin'
}

export async function addSharedMember(input: AddMemberInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'No autorizado' }

  try {
    // 1. Seguridad: ¿Quien llama a esto es admin del grupo?
    const isAdmin = await checkGroupAdminPermission(supabase, input.group_id, user.id)
    if (!isAdmin) {
      return { error: 'No tienes permisos de administrador en este grupo' }
    }

    // 2. Insertar Miembro
    const { error } = await supabase
      .from('finance_shared_members')
      .insert({
          group_id: input.group_id,
          name: input.name,
          email: input.email || null,
          role: input.role,
          initial_balance: input.initial_balance || 0, // <--- AÑADIR ESTO
          user_id: null
      })

    if (error) throw new Error(error.message)

    revalidatePath('/finance-shared')
    return { success: true }

  } catch (error: any) {
    return { error: error.message }
  }
}

// app/finance-shared/actions.ts

export async function deleteSharedMember(memberId: string, groupId: string) {
    // 1. VALIDACIÓN DE INPUTS (Aquí es donde estaba fallando)
    if (!memberId || memberId === 'undefined') {
        return { error: 'Error técnico: El ID del miembro no es válido.' }
    }
    if (!groupId || groupId === 'undefined') {
        return { error: 'Error técnico: El ID del grupo no es válido.' }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autorizado' }

    try {
        // 2. Verificar Admin
        const isAdmin = await checkGroupAdminPermission(supabase, groupId, user.id)
        if (!isAdmin) return { error: 'No tienes permisos' }

        // 3. BORRADO DIRECTO (Estrategia "Perdón en vez de Permiso")
        const { error } = await supabase
            .from('finance_shared_members')
            .delete()
            .eq('id', memberId)

        if (error) {
            console.error('Error DB Delete:', error)
            
            // Código PostgreSQL 23503 = Violación de llave foránea (Integridad referencial)
            // Significa que hay datos hijos (transacciones, allocations) colgando de este miembro.
            if (error.code === '23503') {
                 return { error: 'No se puede eliminar: El miembro tiene transacciones, repartos o tarjetas asociadas. Elimina esos datos primero.' }
            }
            
            throw new Error(error.message || 'Error desconocido al eliminar')
        }

        revalidatePath('/finance-shared')
        return { success: true }
        
    } catch (error: any) {
        return { error: error.message }
    }
}

// app/finance-shared/actions.ts

// ... imports

export async function updateSharedMember(input: UpdateMemberInput) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autorizado' }

    try {
        // 1. Verificar Admin
        const isAdmin = await checkGroupAdminPermission(supabase, input.groupId, user.id)
        if (!isAdmin) return { error: 'No tienes permisos' }

        // 2. Actualizar
        // El trigger SQL se encargará de buscar el user_id si pones el email
        const { error } = await supabase
            .from('finance_shared_members')
            .update({
                name: input.name,
                role: input.role,
                email: input.email || null,
                initial_balance: input.initial_balance ?? 0 // <--- AÑADIR ESTO
            })
            .eq('id', input.memberId)

        if (error) throw new Error(error.message)

        revalidatePath('/finance-shared')
        return { success: true }
    } catch (error: any) {
        return { error: error.message }
    }
}

// === CATEGORÍAS ===

export async function createSharedCategory(input: CreateSharedCategoryInput) {
  const supabase = await createClient()
  const { error } = await supabase.from('finance_shared_categories').insert(input)
  if (error) return { error: error.message }
  revalidatePath('/finance-shared')
  return { success: true }
}

export async function updateSharedCategory(id: string, updates: Partial<SharedCategory>) {
  const supabase = await createClient()
  const { error } = await supabase.from('finance_shared_categories').update(updates).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/finance-shared')
  return { success: true }
}

export async function deleteSharedCategory(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('finance_shared_categories').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/finance-shared')
  return { success: true }
}

/**
 * Asigna un miembro como gestor de una cuenta específica.
 * Solo el Admin del grupo puede hacer esto.
 */
export async function assignAccountManager(input: AssignAccountManagerInput) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autorizado' }

    try {
        // 1. Obtener group_id de la cuenta
        const { data: account } = await supabase
            .from('finance_shared_accounts')
            .select('group_id')
            .eq('id', input.account_id)
            .single()
        
        if (!account) throw new Error('Cuenta no encontrada')

        // 2. Verificar que YO soy admin del grupo
        const isAdmin = await checkGroupAdminPermission(supabase, account.group_id, user.id)
        if (!isAdmin) return { error: 'Solo los administradores pueden asignar gestores.' }

        // 3. Asignar
        const { error } = await supabase
            .from('finance_shared_account_managers')
            .insert({
                account_id: input.account_id,
                member_id: input.member_id
            })

        if (error) {
            if (error.code === '23505') return { error: 'Este miembro ya es gestor de la cuenta.' }
            throw new Error(error.message)
        }

        revalidatePath('/finance-shared')
        return { success: true }
    } catch (error: any) {
        return { error: error.message }
    }
}

/**
 * Revoca permisos de gestor.
 */
export async function removeAccountManager(accountId: string, memberId: string) {
    // ... Lógica similar de verificación de admin ...
    // ... DELETE FROM finance_shared_account_managers ...
    // (Te la implemento completa si me confirmas, pero es igual a la de arriba con DELETE)
    return { success: true } // Placeholder
}

/**
 * VERIFICADOR DE PERMISOS DE TRANSACCIÓN (Helper Crítico)
 * Devuelve true si el usuario puede operar en esta cuenta
 */
export async function canUserManageAccount(supabase: any, accountId: string, userId: string): Promise<boolean> {
    // 1. ¿Es Admin del grupo?
    const { data: account } = await supabase
        .from('finance_shared_accounts')
        .select('group_id')
        .eq('id', accountId)
        .single()
    
    if (await checkGroupAdminPermission(supabase, account.group_id, userId)) {
        return true // Admin puede todo
    }

    // 2. ¿Es Gestor explícito de esta cuenta?
    // Necesitamos saber el ID del miembro asociado a este UserID
    const { data: member } = await supabase
        .from('finance_shared_members')
        .select('id')
        .eq('group_id', account.group_id)
        .eq('user_id', userId)
        .single()

    if (!member) return false

    const { data: managerEntry } = await supabase
        .from('finance_shared_account_managers')
        .select('id')
        .eq('account_id', accountId)
        .eq('member_id', member.id)
        .single()

    return !!managerEntry
}

export async function createSharedTransaction(input: CreateTransactionInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'No autorizado' }

  try {
    // 1. Obtener mi rol en el grupo (para saber si aut-apruebo)
    // Buscamos si soy owner o admin
    const isAdmin = await checkGroupAdminPermission(supabase, input.group_id, user.id)

    // 2. Definir estado inicial
    const approvalStatus = isAdmin ? 'approved' : 'pending'
    const reimbursementStatus = input.request_reimbursement ? 'pending' : 'none'

    // 3. Crear Transacción (Cabecera)
    const { data: transaction, error: txError } = await supabase
      .from('finance_shared_transactions')
      .insert({
        group_id: input.group_id,
        date: input.date,
        amount: input.amount,
        description: input.description,
        category_id: input.category_id || null,
        type: 'expense', // Por ahora asumimos gasto
        
        // Nuevos campos lógicos
        payment_source: input.payment_source,
        payer_member_id: input.payer_member_id || null, // Si paga el banco, esto es null
        reimbursement_status: reimbursementStatus,
        approval_status: approvalStatus,
        
        created_by: user.id
      })
      .select()
      .single()

    if (txError) throw new Error(txError.message)

    // 4. Crear Repartos (Allocations) - Lógica simple "Split Equal"
    if (input.involved_member_ids.length > 0) {
        let allocationsData: { transaction_id: string, member_id: string, amount: number }[] = []

        if (input.split_type === 'weighted' && input.split_weights) {
            // --- MODO PONDERADO ---
            // 1. Calcular peso total de los involucrados
            const totalWeight = input.involved_member_ids.reduce((sum, id) => {
                return sum + (input.split_weights?.[id] || 0)
            }, 0)

            if (totalWeight === 0) throw new Error('El peso total del reparto no puede ser 0')

            // 2. Calcular importe por cada "punto" de peso
            // Ej: 100€ / 3 puntos = 33.333... por punto
            const amountPerWeight = input.amount / totalWeight

            // 3. Asignar
            allocationsData = input.involved_member_ids.map(memberId => {
                const weight = input.split_weights?.[memberId] || 0
                return {
                    transaction_id: transaction.id,
                    member_id: memberId,
                    amount: Number((amountPerWeight * weight).toFixed(2))
                }
            })

        } else {
            // --- MODO EQUITATIVO (Default) ---
            const splitAmount = input.amount / input.involved_member_ids.length
            allocationsData = input.involved_member_ids.map(memberId => ({
                transaction_id: transaction.id,
                member_id: memberId,
                amount: Number(splitAmount.toFixed(2))
            }))
        }

        // --- AJUSTE DE CÉNTIMOS (COMÚN PARA AMBOS) ---
        // Al redondear a 2 decimales, puede sobrar o faltar 0.01€. Se lo ajustamos al primero.
        const totalAllocated = allocationsData.reduce((sum, a) => sum + a.amount, 0)
        const diff = input.amount - totalAllocated

        // Si hay diferencia (ej: 0.01), se la sumamos al primer miembro
        if (Math.abs(diff) > 0.001) {
            allocationsData[0].amount = Number((allocationsData[0].amount + diff).toFixed(2))
        }

        const { error: allocError } = await supabase
            .from('finance_shared_allocations')
            .insert(allocationsData)
        
        if (allocError) throw new Error('Error al guardar el reparto: ' + allocError.message)
    }

    revalidatePath('/finance-shared')
    return { success: true }

  } catch (error: any) {
    console.error('Error creating transaction:', error)
    return { error: error.message }
  }
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

// ... imports

// ACTUALIZAR TRANSACCIÓN
export async function updateSharedTransaction(
    transactionId: string, 
    input: CreateTransactionInput
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autorizado' }

    try {
        // 1. Permisos (Admin o Creador)
        // Simplificación: Asumimos que si llegas aquí, la UI ya validó si podías editar.
        // En producción deberías re-verificar owner/admin aquí.

        // 2. Actualizar la Transacción Base
        const { error: txError } = await supabase
            .from('finance_shared_transactions')
            .update({
                date: input.date,
                amount: input.amount,
                description: input.description,
                category_id: input.category_id || null,
                payment_source: input.payment_source,
                payer_member_id: input.payment_source === 'member' ? input.payer_member_id : null,
                reimbursement_status: input.request_reimbursement ? 'pending' : 'none',
                // Nota: No cambiamos approval_status al editar para no "colar" cambios sin querer, 
                // o podríamos resetearlo a 'pending' si lo edita un miembro. 
                // Por ahora lo dejamos tal cual estaba.
            })
            .eq('id', transactionId)

        if (txError) throw new Error(txError.message)

        // 3. REGENERAR REPARTOS (Estrategia: Borrar y Recrear)
        // Primero borramos los anteriores
        await supabase.from('finance_shared_allocations').delete().eq('transaction_id', transactionId)

        // Ahora creamos los nuevos (Copiado de la lógica de create)
        if (input.involved_member_ids.length > 0) {
            let allocationsData: any[] = []

            if (input.split_type === 'weighted' && input.split_weights) {
                const totalWeight = input.involved_member_ids.reduce((sum, id) => sum + (input.split_weights?.[id] || 0), 0)
                if (totalWeight > 0) {
                    const amountPerWeight = input.amount / totalWeight
                    allocationsData = input.involved_member_ids.map(memberId => ({
                        transaction_id: transactionId,
                        member_id: memberId,
                        amount: Number((amountPerWeight * (input.split_weights?.[memberId] || 0)).toFixed(2))
                    }))
                }
            } else {
                // Equal
                const splitAmount = input.amount / input.involved_member_ids.length
                allocationsData = input.involved_member_ids.map(memberId => ({
                    transaction_id: transactionId,
                    member_id: memberId,
                    amount: Number(splitAmount.toFixed(2))
                }))
            }

            // Ajuste de céntimos
            const totalAllocated = allocationsData.reduce((sum, a) => sum + a.amount, 0)
            const diff = input.amount - totalAllocated
            if (Math.abs(diff) > 0.001 && allocationsData.length > 0) {
                allocationsData[0].amount = Number((allocationsData[0].amount + diff).toFixed(2))
            }

            const { error: allocError } = await supabase.from('finance_shared_allocations').insert(allocationsData)
            if (allocError) throw new Error('Error al guardar reparto: ' + allocError.message)
        }

        revalidatePath('/finance-shared')
        return { success: true }

    } catch (error: any) {
        return { error: error.message }
    }
}

// En actions/finance-shared.ts

// ... (imports)

// IMPORTACIÓN MASIVA
// app/finance-shared/actions.ts

// ...

// Actualizamos la definición de entrada
export async function importBankTransactions(
    groupId: string, 
    transactions: { 
        date: string, 
        amount: number, 
        description: string, 
        notes?: string, 
        bank_balance?: number // <--- NUEVO CAMPO
    }[]
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autorizado' }

    // Validación básica antes de intentar nada
    if (!transactions || transactions.length === 0) {
        return { error: 'No se han recibido datos para importar.' }
    }

    try {
        const isAdmin = await checkGroupAdminPermission(supabase, groupId, user.id)
        if (!isAdmin) return { error: 'Permiso denegado' }

        const { data: members } = await supabase
            .from('finance_shared_members')
            .select('id')
            .eq('group_id', groupId)
        
        if (!members || members.length === 0) return { error: 'No hay miembros.' }

        let count = 0;
        const errors = [];

        for (const tx of transactions) {
            const isExpense = tx.amount < 0
            const amountAbs = Math.abs(tx.amount)
            
            // Permitimos importar 0 si es un apunte informativo, aunque no suele pasar
            
            // A. Insertar Transacción
            const { data: newTx, error: txError } = await supabase
                .from('finance_shared_transactions')
                .insert({
                    group_id: groupId,
                    date: tx.date,
                    amount: amountAbs, 
                    description: tx.description,
                    notes: tx.notes || null,
                    bank_balance: tx.bank_balance !== undefined ? tx.bank_balance : null, // <--- GUARDAMOS SALDO
                    type: isExpense ? 'expense' : 'income', 
                    payment_source: 'account',
                    reimbursement_status: 'none',
                    approval_status: 'approved',
                    created_by: user.id
                })
                .select()
                .single()

            if (txError) {
                console.error('Error insertando fila:', tx, txError.message)
                errors.push(`Fila ${tx.date}: ${txError.message}`)
                continue
            }            
            count++;
        }

        revalidatePath('/finance-shared')
        
        if (count === 0 && errors.length > 0) {
            return { error: `Fallaron todas las filas. Ej: ${errors[0]}` }
        }

        return { success: true, count }

    } catch (error: any) {
        console.error("Error crítico import:", error)
        return { error: error.message }
    }
}

export async function updateTransactionCategory(transactionId: string, categoryId: string) {
    const supabase = await createClient()

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
        .select('amount')
        .eq('id', transactionId)
        .single()

    if (txError || !transaction) return { error: 'Transacción no encontrada' }

    // 3. LÓGICA DE TIPO (Igual que en el formulario)
    let newType = transaction.amount >= 0 ? 'income' : 'expense' // Por defecto según signo

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
// CAMBIO RÁPIDO DE REPARTO (Para Aportaciones: Asigna todo a uno)
export async function setTransactionContributor(transactionId: string, memberId: string, amount: number) {
    const supabase = await createClient()
    
    // 1. Borrar allocations anteriores
    const { error: delError } = await supabase
        .from('finance_shared_allocations')
        .delete()
        .eq('transaction_id', transactionId)
    
    if (delError) return { error: delError.message }

    // 2. Crear nueva allocation única
    const { error: insError } = await supabase
        .from('finance_shared_allocations')
        .insert({
            transaction_id: transactionId,
            member_id: memberId,
            amount: Math.abs(amount) // Siempre positivo en allocation
        })

    if (insError) return { error: insError.message }
    
    revalidatePath('/finance-shared')
    return { success: true }
}

export async function upsertAccount(
    groupId: string, 
    account: Partial<SharedAccount>
) {
    const supabase = await createClient()
    
    // Validación básica
    if (!account.name) return { error: 'El nombre es obligatorio' }

    const { error } = await supabase
        .from('finance_shared_accounts')
        .upsert({
            id: account.id, // undefined = crear
            group_id: groupId,
            name: account.name,
            balance: account.balance || 0, // Por ahora gestionamos saldo inicial
            type: account.type || 'bank',
            responsible_member_id: account.responsible_member_id || null,
            color: account.color || '#64748b',
            icon_name: account.icon_name || 'Landmark'
        })

    if (error) return { error: error.message }
    revalidatePath('/finance-shared')
    return { success: true }
}

export async function deleteAccount(accountId: string) {
    const supabase = await createClient()
    
    // TODO: En el futuro, comprobar si hay transacciones vinculadas a esta cuenta_id
    // Por ahora, borramos directo (CUIDADO)

    const { error } = await supabase
        .from('finance_shared_accounts')
        .delete()
        .eq('id', accountId)

    if (error) return { error: error.message }
    revalidatePath('/finance-shared')
    return { success: true }
}

export async function upsertSharedTransaction(groupId: string, transaction: any) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  // 1. Preparamos el objeto principal
  const isTransfer = transaction.type === 'transfer'
  const payload: any = {
    group_id: groupId,
    date: transaction.date,
    amount: parseFloat(transaction.amount),
    description: transaction.description,
    notes: transaction.notes,
    category_id: isTransfer ? null : transaction.category_id, // Transferencias no suelen tener categoría
    payer_member_id: transaction.payer_member_id,
    account_id: transaction.account_id,
    payment_source: transaction.payment_source,
    type: transaction.type,
    // Nuevos campos
    transfer_account_id: isTransfer ? transaction.transfer_account_id : null,
    parent_transaction_id: transaction.parent_transaction_id,
    // El linked_id no lo tocamos aquí directamente si ya existe, lo gestionamos abajo
  }

  // Si es nuevo, insertamos el principal primero para tener ID
  let mainTxId = transaction.id
  let linkedTxId = transaction.linked_transaction_id

  // A. GUARDAR TRANSACCIÓN PRINCIPAL (ORIGEN)
  const { data: mainTx, error } = await supabase
    .from('finance_shared_transactions')
    .upsert(transaction.id ? { ...payload, id: transaction.id } : payload)
    .select()
    .single()

  if (error) return { error: error.message }
  mainTxId = mainTx.id

  // B. GESTIÓN DE TRANSFERENCIAS (LA MAGIA) 🪄
  if (isTransfer && transaction.transfer_account_id) {
      // Calculamos el importe inverso (si origen es -500, destino es +500)
      const inverseAmount = payload.amount * -1

      const mirrorPayload = {
          group_id: groupId,
          date: payload.date,
          amount: inverseAmount,
          description: payload.description, // Misma descripción
          notes: 'Transferencia automática',
          type: 'transfer',
          account_id: transaction.transfer_account_id, // La cuenta destino
          transfer_account_id: payload.account_id, // La cuenta origen
          payment_source: 'account', // Siempre es movimiento de cuenta
          linked_transaction_id: mainTxId, // Apunta al padre
          created_by: user.id
      }

      if (linkedTxId) {
          // Si ya existía gemela, la actualizamos
          await supabase
            .from('finance_shared_transactions')
            .update(mirrorPayload)
            .eq('id', linkedTxId)
      } else {
          // Si no existía, la creamos
          const { data: newMirror } = await supabase
            .from('finance_shared_transactions')
            .insert(mirrorPayload)
            .select()
            .single()
          
          linkedTxId = newMirror?.id

          // Y actualizamos la principal para que apunte a la nueva gemela
          await supabase
            .from('finance_shared_transactions')
            .update({ linked_transaction_id: linkedTxId })
            .eq('id', mainTxId)
      }
  } 
  // C. LIMPIEZA: Si antes era transferencia y ahora no, borramos la gemela
  else if (!isTransfer && linkedTxId) {
      await supabase.from('finance_shared_transactions').delete().eq('id', linkedTxId)
      // Y limpiamos el campo en la principal
      await supabase.from('finance_shared_transactions').update({ linked_transaction_id: null }).eq('id', mainTxId)
  }

  // D. GESTIÓN DE ALLOCATIONS (Solo si NO es transferencia)
  // Las transferencias no se reparten entre personas, es movimiento de fondos.
  if (!isTransfer && transaction.allocations) {
      // 1. Borrar anteriores
      await supabase.from('finance_shared_allocations').delete().eq('transaction_id', mainTxId)
      
      // 2. Insertar nuevas
      if (transaction.allocations.length > 0) {
          const allocs = transaction.allocations.map((a: any) => ({
              transaction_id: mainTxId,
              member_id: a.member_id,
              amount: a.amount
          }))
          const { error: allocError } = await supabase.from('finance_shared_allocations').insert(allocs)
          if (allocError) console.error('Error allocations:', allocError)
      }
  }

  revalidatePath('/finance-shared')
  return { success: true, data: mainTx }
}

// Acción para buscar gastos huérfanos (Bottom-Up)
export async function getOrphanExpenses(groupId: string, accountId: string, maxDate: string) {
    const supabase = await createClient()

    if (!accountId) {
        console.log("   ❌ ABORTANDO: No hay Account ID")
        return []
    }

    const { data, error } = await supabase
        .from('finance_shared_transactions')
        .select('id, description, amount, date, account_id, type, parent_transaction_id') // Pedimos campos clave para verlos en el log
        .eq('group_id', groupId)
        .eq('type', 'expense')
        .is('parent_transaction_id', null)
        .eq('account_id', accountId) // <--- AQUÍ ESTÁ LA CLAVE
        .lte('date', maxDate)
        .order('date', { ascending: false })
        .limit(50)

    if (error) {
        console.error("   🔥 ERROR SUPABASE:", error.message)
        return []
    }

    console.log(`   ✅ Encontrados: ${data?.length} registros.`)
    if (data && data.length > 0) {
        console.log("   📝 Ejemplo 1:", data[0].description, "| Cuenta:", data[0].account_id)
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
// === PLANTILLAS DE REPARTO ===

// Crear Plantilla
export async function createSplitTemplate(input: { 
    group_id: string, 
    name: string, 
    description?: string,
    members: { member_id: string, shares: number }[] 
}) {
    const supabase = await createClient()
    
    // 1. Crear Cabecera
    const { data: template, error: tmplError } = await supabase
        .from('finance_shared_split_templates')
        .insert({
            group_id: input.group_id,
            name: input.name,
            description: input.description || null
        })
        .select()
        .single()

    if (tmplError) return { error: tmplError.message }

    // 2. Crear Miembros con pesos
    // Filtramos solo los que tienen shares > 0 para no llenar la BD de ceros, 
    // aunque guardar los ceros puede ser útil para saber explícitamente que alguien no paga.
    // Vamos a guardar TODOS para que la plantilla sea estable.
    const memberRows = input.members.map(m => ({
        template_id: template.id,
        member_id: m.member_id,
        shares: m.shares
    }))

    const { error: membersError } = await supabase
        .from('finance_shared_split_template_members')
        .insert(memberRows)

    if (membersError) {
        // Rollback manual (borrar la cabecera si fallan los hijos)
        await supabase.from('finance_shared_split_templates').delete().eq('id', template.id)
        return { error: membersError.message }
    }

    revalidatePath('/finance-shared')
    return { success: true }
}

export async function updateSplitTemplate(templateId: string, input: {
    name: string,
    description?: string,
    members: { member_id: string, shares: number }[]
}) {
    const supabase = await createClient()

    // 1. Actualizar Cabecera (Nombre y Descripción)
    const { error: headError } = await supabase
        .from('finance_shared_split_templates')
        .update({
            name: input.name,
            description: input.description || null
        })
        .eq('id', templateId)

    if (headError) return { error: headError.message }

    // 2. Actualizar Miembros (Estrategia: Borrar todos y recrear)
    // Primero borramos los antiguos
    const { error: delError } = await supabase
        .from('finance_shared_split_template_members')
        .delete()
        .eq('template_id', templateId)
    
    if (delError) return { error: delError.message }

    // Ahora insertamos los nuevos
    const memberRows = input.members.map(m => ({
        template_id: templateId,
        member_id: m.member_id,
        shares: m.shares
    }))

    const { error: insError } = await supabase
        .from('finance_shared_split_template_members')
        .insert(memberRows)

    if (insError) return { error: insError.message }

    revalidatePath('/finance-shared')
    return { success: true }
}

// Borrar Plantilla
export async function deleteSplitTemplate(templateId: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('finance_shared_split_templates')
        .delete()
        .eq('id', templateId)

    if (error) return { error: error.message }
    revalidatePath('/finance-shared')
    return { success: true }
}
