// app/finance-shared/public-actions.ts
'use server'

import { createClient } from '@supabase/supabase-js'

// --- HELPER: CLIENTE ADMIN (BYPASS DE SEGURIDAD) ---
function createAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!, 
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )
}

// 1. OBTENER DATOS DEL GRUPO (PÚBLICO)
export async function getPublicGroupData(groupId: string) {
    // Usamos el cliente ADMIN para asegurar que leemos los datos sí o sí
    const supabase = createAdminClient()

    // Verificamos que el grupo existe
    const { data: group } = await supabase
        .from('finance_shared_groups')
        .select('id')
        .eq('id', groupId)
        .single()
    
    if (!group) return { error: 'Grupo no encontrado' }

    // Obtenemos miembros
    const { data: members } = await supabase
        .from('finance_shared_members')
        .select('*')
        .eq('group_id', groupId)
        .order('name')

    // Obtenemos categorías
    const { data: categories } = await supabase
        .from('finance_shared_categories')
        .select('*')
        .eq('group_id', groupId)
        .order('name')

    // Obtenemos cuentas
    const { data: accounts } = await supabase
        .from('finance_shared_accounts')
        .select('*')
        .eq('group_id', groupId)

    return { 
        members: members || [], 
        categories: categories || [], 
        accounts: accounts || [] 
    }
}

// 2. CREAR GASTO RÁPIDO (PÚBLICO)
export async function createPublicTransaction(payload: any) {
    const supabase = createAdminClient()

    // PASO 1: Buscar al dueño del grupo para usar su ID como "creador"
    // (Necesitamos un UUID válido para cumplir con la restricción de la BBDD)
    const { data: group } = await supabase
        .from('finance_shared_groups')
        .select('owner_id')
        .eq('id', payload.group_id)
        .single()

    if (!group) return { error: 'Grupo no encontrado al intentar guardar' }

    // PASO 2: Insertar usando el ID del dueño
    const { error } = await supabase
        .from('finance_shared_transactions')
        .insert({
            ...payload,
            status: 'pending', 
            created_by: group.owner_id // <--- AHORA SÍ ES UN UUID VÁLIDO
        })

    if (error) return { error: error.message }
    return { success: true }
}