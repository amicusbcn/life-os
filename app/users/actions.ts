// app/users/actions.ts
'use server'

import { createClient } from '@/utils/supabase/server';
// Importamos ActionResponse desde el módulo travel que hemos estado utilizando
import { ActionResponse, Profile } from '@/types/common';

const supabase = createClient();

/**
 * [STUB] Cambia el rol de administrador de un usuario.
 */
export async function toggleAdminRole(userId: string): Promise<ActionResponse> {
    console.log(`[USER_ACTION] Solicitud: toggleAdminRole para ${userId}`);
    // *** IMPLEMENTACIÓN PENDIENTE ***
    
    // Ejemplo de lógica (requiere permisos de Admin):
    /*
    const { data, error } = await supabase
        .from('profiles')
        .update({ role: 'admin' }) // O 'user'
        .eq('id', userId);

    if (error) {
        return { success: false, error: "Error al cambiar el rol." };
    }
    */
    
    return { success: "false", error: "Función de cambio de rol no implementada." };
}

/**
 * [STUB] Actualiza los grupos de un usuario.
 */
export async function updateUserGroups(userId: string, groupIds: string[]): Promise<ActionResponse> {
    console.log(`[USER_ACTION] Solicitud: updateUserGroups para ${userId} con grupos: ${groupIds.join(', ')}`);
    // *** IMPLEMENTACIÓN PENDIENTE ***
    
    /*
    // 1. Eliminar entradas antiguas en profiles_groups
    // 2. Insertar nuevas entradas en profiles_groups
    */
    
    return { success: "false", error: "Función de actualización de grupos no implementada." };
}

/**
 * [STUB] Envía un email de reseteo de contraseña a un usuario (solo disponible para administradores).
 */
export async function resetUserPassword(userId: string): Promise<ActionResponse> {
    console.log(`[USER_ACTION] Solicitud: resetUserPassword para ${userId}`);
    // *** IMPLEMENTACIÓN PENDIENTE ***
    
    // Si usas el admin client de Supabase, puedes generar un enlace de reseteo
    /*
    const { data, error } = await supabase.auth.admin.generatePasswordResetLink(userId);
    */
    
    return { success: "false", error: "Función de reseteo de contraseña no implementada." };
}

/**
 * [STUB] Elimina un usuario de un grupo específico.
 */
export async function removeUserFromGroup(userId: string, groupId: string): Promise<ActionResponse> {
    console.log(`[USER_ACTION] Solicitud: removeUserFromGroup para usuario ${userId} del grupo ${groupId}`);
    // *** IMPLEMENTACIÓN PENDIENTE ***
    
    /*
    const { error } = await supabase
        .from('profiles_groups')
        .delete()
        .eq('id_user', userId)
        .eq('id_group', groupId);
    */
    
    return { success: "false", error: "Función de eliminación de grupo no implementada." };
}