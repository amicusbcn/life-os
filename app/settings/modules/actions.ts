// app/settings/modules/actions.ts
'use server'

import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';
import { ActionResponse } from '@/types/common';
import { ChangeType, ModuleStatus } from '@/types/common';
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

export async function updateModuleRelease(
  moduleId: string, 
  data: {
    version: string;
    status: string;
    title: string;
    type: string;
    is_breaking: boolean;
  }
) {
  const supabaseAdmin = await createAdminClient();

  // 1. Actualizamos el estado y versión en el módulo
  const { error: modError } = await supabaseAdmin
    .from('app_modules')
    .update({
      current_version: data.version,
      status: data.status,
      updated_at: new Date().toISOString()
    })
    .eq('id', moduleId);

  if (modError) return { success: false, error: modError.message };

  // 2. Insertamos el log
  const { error: logError } = await supabaseAdmin
    .from('app_module_changelog')
    .insert([{
      module_id: moduleId,
      version: data.version,
      title: data.title,
      change_type: data.type,
      is_breaking_change: data.is_breaking,
    }]);

  if (logError) return { success: false, error: logError.message };

  revalidatePath('/settings/modules');
  return { success: true };
}

export async function getModuleChangelog(moduleId: string) {
  const supabaseAdmin = await createAdminClient();
  
  const { data, error } = await supabaseAdmin
    .from('app_module_changelog')
    .select('*')
    .eq('module_id', moduleId)
    .order('created_at', { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function updateModule(
  moduleId: string, 
  data: {
    name: string;
    description: string;
    icon: string;
    key: string;
    status?: ModuleStatus;
    current_version?: string;
    // Datos opcionales para el changelog
    changelog?: {
      title: string;
      type: ChangeType;
      is_breaking: boolean;
    }
  }
) {
  const supabaseAdmin = await createAdminClient();

  try {
    // 1. Separamos los datos del módulo de los del changelog
    const { changelog, ...moduleUpdateData } = data;

    // 2. Actualizamos la tabla principal del módulo
    const { error: modError } = await supabaseAdmin
      .from('app_modules')
      .update({
        ...moduleUpdateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', moduleId);

    if (modError) throw modError;

    // 3. Si hay datos de changelog y tiene un título, insertamos la mejora
    if (changelog && changelog.title.trim()) {
      const { error: logError } = await supabaseAdmin
        .from('app_module_changelog')
        .insert([{
          module_id: moduleId,
          version: data.current_version || 'v.unknown',
          title: changelog.title,
          change_type: changelog.type,
          is_breaking_change: changelog.is_breaking,
        }]);

      if (logError) {
        console.error("Error al registrar changelog:", logError);
        // No lanzamos error para no romper la actualización del módulo, 
        // pero podrías manejarlo según prefieras.
      }
    }

    revalidatePath('/settings/modules');
    revalidatePath('/', 'layout');
    
    return { success: true, message: 'Arquitectura y cambios sincronizados' };

  } catch (error: any) {
    console.error('Error en updateModule:', error);
    return { success: false, error: error.message };
  }
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