// app\finance-shared\actions\actions-templates.ts
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

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
export async function updateTransactionSplitMode(transactionId: string, templateId: string, totalAmount: number) {
    const supabase = await createClient()
    
    // 1. Obtener la plantilla y sus miembros
    const { data: template } = await supabase
        .from('finance_shared_split_templates')
        .select('*, template_members(*)')
        .eq('id', templateId)
        .single()

    if (!template) return { error: 'Plantilla no encontrada' }

    // 2. Calcular el reparto basado en pesos (shares)
    const totalShares = template.template_members.reduce((sum: number, m: any) => sum + m.shares, 0)
    
    if (totalShares === 0) return { error: 'La plantilla no tiene pesos asignados (total shares es 0)' }

    const allocations = template.template_members
        .filter((tm: any) => tm.shares > 0) // Solo creamos repartos para los que participan
        .map((tm: any) => ({
            transaction_id: transactionId,
            member_id: tm.member_id,
            // QUITAMOS EL Math.abs(). Si totalAmount es negativo, amount será negativo.
            amount: (totalAmount * tm.shares) / totalShares 
        }))

    // 3. Limpiar e insertar
    // Usamos una pequeña transacción lógica o simplemente borramos y pegamos
    const { error: delError } = await supabase.from('finance_shared_allocations').delete().eq('transaction_id', transactionId)
    if (delError) return { error: delError.message }

    const { error: insError } = await supabase.from('finance_shared_allocations').insert(allocations)

    if (insError) return { error: insError.message }
    
    revalidatePath('/finance-shared')
    return { success: true }
}