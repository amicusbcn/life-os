// app/settings/modules/actions.ts
'use server'

import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';
import { ActionResponse } from '@/types/common';

/**
 * Actualiza el estado de activación de un módulo específico
 */
export async function toggleModuleStatus(moduleId: string, isActive: boolean): Promise<ActionResponse> {
    const supabaseAdmin = await createAdminClient();

    const { error } = await supabaseAdmin
        .from('app_modules')
        .update({ is_active: isActive })
        .eq('id', moduleId);

    if (error) {
        console.error('Error actualizando módulo:', error);
        return { success: false, error: 'No se pudo actualizar el estado del módulo.' };
    }

    // Revalidamos la ruta para que los cambios se reflejen en toda la app y el Sidebar
    revalidatePath('/settings/modules');
    revalidatePath('/', 'layout'); // Importante para actualizar el Sidebar global
    
    return { 
        success: true, 
        message: `Módulo ${isActive ? 'activado' : 'desactivado'} correctamente.` 
    };
}

export async function updateModule(moduleId: string, data: {
  name: string;
  description: string;
  icon: string;
  key: string;
}) {
  const supabaseAdmin = await createAdminClient();

  const { error } = await supabaseAdmin
    .from('app_modules')
    .update(data)
    .eq('id', moduleId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/settings/modules');
  revalidatePath('/', 'layout');
  return { success: true, message: 'Módulo actualizado correctamente' };
}

export async function createModule(data: {
  name: string;
  key: string;
  description: string;
  category: string;
  icon: string;
  route: string;
}) {
  const supabaseAdmin = await createAdminClient();

  // Insertamos el nuevo módulo con is_active por defecto en false
  const { error } = await supabaseAdmin
    .from('app_modules')
    .insert([{ ...data, is_active: false, sort_order: 99 }]);

  if (error) return { success: false, error: error.message };

  revalidatePath('/settings/modules');
  return { success: true, message: 'Nuevo módulo registrado en el núcleo.' };
}