// /app/settings/users/actions.ts
'use server'

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin'; // Usamos tu cliente admin
import { revalidatePath } from 'next/cache';
import { ActionResponse } from '@/types/common'; // O types/user si moviste ActionResponse ahí
import { AppRole, UserRole,AppModule } from '@/types/users'; // Asegúrate de tener estos tipos definidos
import { sendNotification } from '@/utils/notification-helper';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
/**
 * 1. LISTADO DE USUARIOS (Para la tabla de administración)
 * Devuelve usuarios enriquecidos con sus permisos modulares.
 */

export async function getAdminUsersList() {
    // Usamos adminClient para ver TODOS los perfiles sin pelear con RLS
    const supabaseAdmin = await createAdminClient();

    // 1. Obtener Perfiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

    if (profilesError) throw new Error(profilesError.message);

    // 2. Obtener Permisos Modulares
    const { data: permissions, error: permsError } = await supabaseAdmin
        .from('app_permissions')
        .select('user_id, module_key, role');

    if (permsError) throw new Error(permsError.message);

    // 3. Mapear (Usuario + Permisos)
    const usersWithPerms = profiles.map(user => {
        const userPerms = permissions.filter(p => p.user_id === user.id);
        
        // Convertimos array a objeto: { 'travel': 'admin', 'inventory': 'viewer' }
        const permMap: Record<string, AppRole> = {};
        userPerms.forEach(p => { permMap[p.module_key] = p.role as AppRole });

        return {
            ...user,
            permissions: permMap
        };
    });

    return usersWithPerms;
}

/**
 * 2. INVITAR USUARIO (Nueva lógica de Lista Blanca)
 */
export async function inviteUser(email: string): Promise<ActionResponse> {
    const supabaseAdmin = await createAdminClient();
    
    // 1. Verificar si ya existe en perfiles (ya registrado)
    const { data: existingUser } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();
    
    if (existingUser) {
        return { success: false, error: 'El usuario ya está registrado en el sistema.' };
    }

    // 2. Insertar en invitaciones (Lista Blanca - Mantenemos tu lógica)
    const { error } = await supabaseAdmin
        .from('app_invitations')
        .insert({ email });

    if (error && error.code !== '23505') { 
         return { success: false, error: error.message };
    }

    // 3. GENERAR EL LINK MÁGICO DE SUPABASE (¡ESTO ES LO NUEVO!) 🪄
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://jact.es'
    
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'invite',
        email: email,
        options: {
            // Cuando hagan clic, irán al callback y luego a poner su contraseña
            redirectTo: `${siteUrl}/auth/callback?next=/update-password`
        }
    })

    if (linkError) {
        return { success: false, error: 'Error generando el link de acceso: ' + linkError.message }
    }

    const inviteLink = linkData.properties.action_link // <--- AQUÍ ESTÁ LA MAGIA

    // 4. ENVIAR CORREO CON RESEND
    try {
        const { error: emailError } = await resend.emails.send({
            from: 'App Familiar <admin@app.jact.es>', // Cambia esto cuando tengas dominio
            to: email,
            subject: 'Has sido invitado a la App Familiar',
            html: `
                <div style="font-family: sans-serif; padding: 20px; text-align: center;">
                    <h1>¡Bienvenido a la Familia! 🏠</h1>
                    <p>El administrador te ha dado acceso a la <strong>App Familiar</strong>.</p>
                    <p>Haz clic en el botón para aceptar la invitación y crear tu contraseña:</p>
                    <br>
                    <a href="${inviteLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                        Aceptar Invitación
                    </a>
                    <br><br>
                    <p style="font-size: 12px; color: #666;">Si el botón no funciona, copia este enlace: ${inviteLink}</p>
                </div>
            `
        });

        if (emailError) {
            console.error("Resend Error:", emailError);
            return { success: false, error: "Invitación creada pero falló el envío del email." };
        }

    } catch (e) {
        console.error("Error enviando email:", e);
        return { success: false, error: "Error de conexión con el servicio de email." };
    }

    revalidatePath('/settings/users');
    return { success: true, message: 'Usuario invitado correctamente.' };
}

/**
 * 3. GESTIÓN DE ROL GLOBAL (Super Admin vs User estándar)
 * Mantenemos tu lógica de toggle, pero tipada
 */
export async function toggleGlobalAdmin(userId: string): Promise<ActionResponse> {
    const supabaseAdmin = await createAdminClient();
    
    // Obtener rol actual
    const { data: profile, error: fetchError } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

    if (fetchError || !profile) return { success: false, error: "Perfil no encontrado." };

    // Toggle
    const newRole: UserRole = profile.role === 'admin' ? 'user' : 'admin';

    // Actualizar
    const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

    if (updateError) return { success: false, error: "Error al actualizar rol global." };

    revalidatePath('/settings/users');
    return { success: true, message: `Rol global cambiado a '${newRole}'.` };
}

/**
 * 4. GESTIÓN DE PERMISOS MODULARES (La joya de la corona)
 * Sustituye a updateUserGroups
 */
export async function setModulePermission(userId: string, moduleKey: string, role: AppRole): Promise<ActionResponse> {
    const supabaseAdmin = await createAdminClient();

    console.log('Intentando guardar permiso:', { userId, moduleKey, role });

    const { data, error } = await supabaseAdmin
        .from('app_permissions')
        .upsert({ 
            user_id: userId, 
            module_key: moduleKey, 
            role: role 
        }, { 
            onConflict: 'user_id, module_key' 
        })
        .select(); // Agregamos select para confirmar la respuesta

    if (error) {
        console.error('ERROR EN BBDD:', error); // Esto te dirá si es un tema de RLS o Foreign Key
        return { success: false, error: error.message };
    }

    console.log('Guardado con éxito:', data);
    revalidatePath('/settings/users'); 
    return { success: true, message: `Permiso para ${moduleKey} actualizado.` };
}

export async function removeModulePermission(userId: string, moduleKey: string): Promise<ActionResponse> {
    const supabaseAdmin = await createAdminClient();

    const { error } = await supabaseAdmin
        .from('app_permissions')
        .delete()
        .match({ user_id: userId, module_key: moduleKey });

    if (error) return { success: false, error: error.message };

    revalidatePath('/settings/users');
    return { success: true, message: 'Acceso al módulo revocado.' };
}

/**
 * 5. RESET PASSWORD (Mantenido de tu código original)
 */
export async function resetUserPassword(userId: string): Promise<ActionResponse> {
    const supabaseAdmin = await createAdminClient();

    // 1. Obtener email
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (userError || !userData?.user?.email) {
        return { success: false, error: "No se pudo encontrar el correo del usuario." };
    }

    // 2. Enviar correo (La función de Admin sí permite esto)
    // Nota: A veces se llama sendPasswordResetEmail o generateLink dependiendo de la versión
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(userData.user.email);

    if (error) {
        console.error("Error envío reset:", error);
        return { success: false, error: "Fallo al enviar el correo de reseteo." };
    }

    return { success: true, message: "Correo de reseteo enviado." };
}

/**
 * 6. OBTENER MÓDULOS ACTIVOS (Para el selector dinámico)
 */
export async function getActiveModules() {
    const supabaseAdmin = await createAdminClient();
    
    const { data, error } = await supabaseAdmin
        .from('app_modules')
        .select('*')
        .eq('is_active', true)
        .order('name');

    if (error) {
        console.error("Error fetching modules:", error);
        return [];
    }

    return data as AppModule[];
}