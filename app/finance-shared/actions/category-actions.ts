// app\finance-shared\actions\category-actions.ts
'use server'
import { CreateSharedCategoryInput, SharedCategory } from '@/types/finance-shared'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createSharedCategory(input: CreateSharedCategoryInput) {
  const supabase = await createClient()
  const { error } = await supabase.from('finance_shared_categories').insert(input)
  
  if (error) {
    if (error.code === '23505') return { error: 'Ya existe una categoría con este nombre en el grupo.' }
    return { error: error.message }
  }
  
  revalidatePath('/finance-shared')
  return { success: true }
}

export async function updateSharedCategory(id: string, updates: Partial<SharedCategory>) {
  const supabase = await createClient()
  
  // Extraemos solo lo editable para evitar tocar IDs o GroupIDs por accidente
  const { name, icon_name, color, is_loan } = updates
  const cleanUpdates = { name, icon_name, color, is_loan }

  const { error } = await supabase
    .from('finance_shared_categories')
    .update(cleanUpdates)
    .eq('id', id)

  if (error) return { error: error.message }
  
  revalidatePath('/finance-shared')
  return { success: true }
}

export async function deleteSharedCategory(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('finance_shared_categories').delete().eq('id', id)
  
  if (error) {
    // Si la categoría está siendo usada y no tienes "SET NULL", saltará error de foreign key
    return { error: 'No se pudo eliminar la categoría. Comprueba si está en uso.' }
  }
  
  revalidatePath('/finance-shared')
  return { success: true }
}