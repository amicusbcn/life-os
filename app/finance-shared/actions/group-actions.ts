// app\finance-shared\actions\group-actions.ts
'use server'
import { AddMemberInput, CreateGroupInput, UpdateMemberInput } from '@/types/finance-shared'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

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
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Admin', // <--- Mejor que solo 'Admin'
        role: 'admin',
        initial_balance: 0
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

export async function checkGroupAdminPermission(supabase: any, groupId: string, userId: string) {
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
