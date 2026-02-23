// app\finance-shared\actions\accounts-actions.ts

'use server'
import { AddMemberInput, AssignAccountManagerInput, CreateGroupInput, SharedAccount, UpdateMemberInput } from '@/types/finance-shared'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { checkGroupAdminPermission } from './group-actions'

export async function upsertAccount(groupId: string, account: Partial<SharedAccount>) {
    const supabase = await createClient()
    if (!account.name) return { error: 'El nombre es obligatorio' }

    const payload: any = {
        group_id: groupId,
        name: account.name,
        type: account.type || 'bank',
        responsible_member_id: account.responsible_member_id || null,
        color: account.color || '#64748b',
        icon_name: account.icon_name || 'Landmark'
    }

    // Solo incluimos el ID si existe (para el update)
    if (account.id) payload.id = account.id
    
    // IMPORTANTE: Solo seteamos el balance si es una cuenta NUEVA
    // Si es update, dejamos que las transacciones manden
    if (!account.id) {
        payload.balance = account.balance || 0
    }

    const { error } = await supabase.from('finance_shared_accounts').upsert(payload)

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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autorizado' }

    try {
        const { data: account } = await supabase
            .from('finance_shared_accounts')
            .select('group_id')
            .eq('id', accountId)
            .single()

        if (!account) throw new Error('Cuenta no encontrada')

        const isAdmin = await checkGroupAdminPermission(supabase, account.group_id, user.id)
        if (!isAdmin) return { error: 'Permiso denegado' }

        const { error } = await supabase
            .from('finance_shared_account_managers')
            .delete()
            .eq('account_id', accountId)
            .eq('member_id', memberId)

        if (error) throw error

        revalidatePath('/finance-shared')
        return { success: true }
    } catch (error: any) {
        return { error: error.message }
    }
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
