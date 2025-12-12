// app/users/actions.ts
'use server'

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin'; 
import { revalidatePath } from 'next/cache';
import { ActionResponse } from '@/types/common'; // De nuevo a ActionResponse { success: boolean, ... }

const supabaseAdmin = await createAdminClient(); // <-- Esto solo funciona si está en un scope asíncrono
const ADMIN_ROLE = 'admin';
const USER_ROLE = 'user';

/**
 * 1. Cambia el rol de administrador de un usuario (admin <-> user).
 */
export async function toggleAdminRole(userId: string): Promise<ActionResponse> {
    const supabaseAdmin = await createAdminClient();
    
    // 1. Obtener el rol actual
    const { data: profile, error: fetchError } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

    if (fetchError || !profile) {
        return { success: false, error: "Usuario o perfil no encontrado." };
    }

    // 2. Determinar el nuevo rol
    const newRole = profile.role === ADMIN_ROLE ? USER_ROLE : ADMIN_ROLE;

    // 3. Actualizar el rol
    const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

    if (updateError) {
        console.error("Error al cambiar rol:", updateError);
        return { success: false, error: "Fallo al actualizar el rol en la base de datos." };
    }

    revalidatePath('/users');
    return { success: true, message: `Rol cambiado a '${newRole}'.` };
}


/**
 * 2. Añade un grupo a un usuario.
 */
export async function updateUserGroups(userId: string, groupId: number): Promise<ActionResponse> {
    const supabaseAdmin = await createAdminClient(); 

    // Aquí insertamos la relación de grupo
    const { error } = await supabaseAdmin
        .from('profiles_groups')
        .insert({
            id_user: userId,
            id_group: groupId,
        })
        .select();

    if (error) {
        // Ignoramos el error de duplicado (23505)
        if (error.code === '23505') { 
            return { success: true, message: "El grupo ya estaba asignado." }; 
        }
        console.error("Error al añadir grupo:", error);
        return { success: false, error: "Fallo al añadir el grupo al usuario." };
    }

    revalidatePath('/users');
    return { success: true, message: "Grupo añadido con éxito." };
}

/**
 * 3. Envía un email de reseteo de contraseña a un usuario.
 */
export async function resetUserPassword(userId: string): Promise<ActionResponse> {
    const supabaseAdmin = await createAdminClient();

// app/users/actions.ts (dentro de resetUserPassword)

// 1. Obtener el email del usuario primero (porque la API de Auth lo requiere)
const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);

if (userError || !userData?.user?.email) {
    console.error("Error al obtener email del usuario:", userError);
    return { success: false, error: "No se pudo encontrar el correo del usuario." };
}

// 2. Usar la función de la API normal (Client) para enviar el enlace al email
// Las funciones de envío de correo se encuentran en el cliente de usuario normal, no en el admin,
// salvo que se configure explícitamente.
const { error } = await supabaseAdmin.auth.resetPasswordForEmail(userData.user.email); 

if (error) {
    console.error("Error al enviar correo de reseteo:", error);
    return { success: false, error: "Fallo al enviar el correo de reseteo." };
}

    if (error) {
        console.error("Error al resetear contraseña:", error);
        return { success: false, error: "Fallo al enviar el correo de reseteo." };
    }

    return { success: true, message: "Correo de reseteo de contraseña enviado." };
}

/**
 * 4. Elimina un usuario de un grupo específico.
 */
export async function removeUserFromGroup(userId: string, groupId: number): Promise<ActionResponse> {
    const supabaseAdmin = await createAdminClient();

    const { error } = await supabaseAdmin
        .from('profiles_groups')
        .delete()
        .eq('id_user', userId)
        .eq('id_group', groupId);

    if (error) {
        console.error("Error al eliminar grupo:", error);
        return { success: false, error: "Fallo al eliminar el grupo del usuario." };
    }

    revalidatePath('/users');
    return { success: true, message: "Grupo eliminado con éxito." };
}