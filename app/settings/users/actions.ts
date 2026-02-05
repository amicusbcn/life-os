// /app/settings/users/actions.ts
'use server'

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin'; // Usamos tu cliente admin
import { revalidatePath } from 'next/cache';
import { ActionResponse } from '@/types/common'; // O types/user si moviste ActionResponse ahí
import { AppRole, UserRole,AppModule, AdminUserRow, UserProfile } from '@/types/users'; // Asegúrate de tener estos tipos definidos
import { sendNotification } from '@/utils/notification-helper';
import { Resend } from 'resend';
import { sendEmail } from '@/utils/mail';
import { ResetPasswordEmail } from '@/components/emails/ResetPassword';
import { InvitationEmail } from '@/components/emails/UserInvitation';

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
        .order('status', { ascending: true }) 
        .order('created_at', { ascending: false });

    if (profilesError) throw new Error(profilesError.message);

    // 2. Obtener Permisos Modulares
    const { data: permissions, error: permsError } = await supabaseAdmin
        .from('app_permissions')
        .select('user_id, module_key, role');

    if (permsError) throw new Error(permsError.message);

    // 3. Mapear con tipado estricto
    const usersWithPerms: AdminUserRow[] = (profiles as UserProfile[]).map(user => {
        const userPerms = permissions.filter(p => p.user_id === user.id);
        
        const permMap: Record<string, AppRole> = {};
        userPerms.forEach(p => { 
            permMap[p.module_key] = p.role as AppRole 
        });

        return {
            ...user,
            permissions: permMap
        };
    });

    return usersWithPerms;
}

/**
 * 2a. FUNCION AUXILIAR PARA GENERAR UN LINK DE INVITACIÓN
 */
type EmailTemplateGenerator = (url: string) => string;

// ==========================================
// 🔧 HELPER PRIVADO GENÉRICO (El motor único)
// ==========================================
async function generateAndSendLink(
    email: string, 
    supabaseAdmin: any, 
    subject: string, 
    templateRenderer: EmailTemplateGenerator
) {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    console.log(`🔄 Generando link para: ${email} | Asunto: ${subject}`);

    // Usamos 'recovery' para todo (es el más robusto para setear passwords)
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery', 
        email: email,
        options: {
            redirectTo: `${baseUrl}/update-password`// /auth/callback?next=/update-password`
        }
    })

    if (linkError || !linkData.properties?.action_link) {
        throw new Error('Error generando el link: ' + (linkError?.message || 'Unknown'));
    }

    const actionLink = linkData.properties.action_link;

    // Enviamos el email usando el template y asunto pasados por parámetro
    const emailResult = await sendEmail({
        to: email,
        subject: subject,
        html: templateRenderer(actionLink) // <--- Aquí renderizamos el HTML específico
    });

    if (!emailResult.success) {
        throw new Error("Fallo al enviar el email: " + JSON.stringify(emailResult.error));
    }

    console.log("📧 Email enviado correctamente.");
    return true;
}


// ==========================================
// 🚀 ACCIÓN 1: INVITAR NUEVO USUARIO
// ==========================================
export async function inviteUser(email: string): Promise<ActionResponse> {
    const supabaseAdmin = await createAdminClient();
    
    try {
        // 1. Validaciones
        const { data: existingProfile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('email', email)
            .single();
        
        if (existingProfile) {
            return { success: false, error: 'El usuario ya tiene un perfil registrado.' };
        }

        // 2. Asegurar Auth (Create User)
        const { error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            email_confirm: true,
            user_metadata: { invited_by_admin: true }
        });

        if (createError && !createError.message.includes('already has been registered')) {
             return { success: false, error: "Error Auth: " + createError.message };
        }

        // 3. Insertar Invitación
        const { error: dbError } = await supabaseAdmin.from('app_invitations').insert({ email });
        if (dbError && dbError.code !== '23505') return { success: false, error: dbError.message };

        // 4. USAR EL MOTOR (Modo: Invitación)
        await generateAndSendLink(
            email, 
            supabaseAdmin, 
            'Invitación a Life-OS', // Asunto
            InvitationEmail         // Template
        );

        revalidatePath('/settings/users');
        return { success: true, message: 'Invitación enviada correctamente.' };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}


// ==========================================
// 🔄 ACCIÓN 2: REENVIAR INVITACIÓN
// ==========================================
export async function resendInvitation(email: string, userId: string): Promise<ActionResponse> {
    const supabaseAdmin = await createAdminClient();

    try {
        if (!email) return { success: false, error: "Email no proporcionado." };

        // USAR EL MOTOR (Modo: Invitación)
        await generateAndSendLink(
            email, 
            supabaseAdmin, 
            'Recordatorio: Invitación a Life-OS', 
            InvitationEmail
        );

        // Actualizar auditoría
        await supabaseAdmin.from('profiles').update({ invitation_sent_at: new Date().toISOString() }).eq('id', userId);

        revalidatePath('/settings/users');
        return { success: true, message: 'Invitación reenviada correctamente.' };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}


// ==========================================
// 🔐 ACCIÓN 3: RESETEAR PASSWORD (MANUAL)
// ==========================================
export async function resetUserPassword(userId: string): Promise<ActionResponse> {
    const supabaseAdmin = await createAdminClient();

    try {
        // 1. Obtener email del usuario
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);

        if (userError || !userData?.user?.email) {
            return { success: false, error: "Usuario no encontrado o sin email." };
        }

        // 2. USAR EL MOTOR (Modo: Recuperación)
        await generateAndSendLink(
            userData.user.email,
            supabaseAdmin,
            'Recuperación de Contraseña - Life-OS', // Asunto diferente
            ResetPasswordEmail                      // Template diferente
        );

        return { success: true, message: 'Correo de recuperación enviado.' };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
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

export async function impersonateUser(userId: string) {
    const supabaseAdmin = await createAdminClient();

    // 1. Obtenemos el email del usuario usando su ID
    const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (userError || !user?.email) {
        return { success: false, error: "Usuario no encontrado" };
    }
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    // 2. Generamos un Magic Link
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: user.email,
        options: {
            redirectTo: `${baseUrl}/admin-console/users/impersonate`
        }
    });

    if (error) {
        return { success: false, error: error.message };
    }

    // 3. Devolvemos la URL (NO la navegamos aquí, se la damos al admin)
    return { success: true, url: data.properties?.action_link };
}



// DESHABILITAR / ACTIVAR USUARIO
export async function toggleUserStatus(userId: string, active: boolean) {
  const supabaseAdmin = await createAdminClient();
  
  try {
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ is_active: active, status: active ? 'active' : 'inactive' })
      .eq('id', userId);

    if (error) throw error;

    revalidatePath('/admin/users');
    return { success: true, message: `Usuario ${active ? 'activado' : 'deshabilitado'}` };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function cancelInvitation(userId: string) {
  const supabaseAdmin = await createAdminClient(); // Service Role requerido
  
  try {
    // 1. Borramos de auth.users (esto debería borrar el profile por cascada si tienes FK seteadas)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (error) throw error;

    // 2. Por seguridad, forzamos borrado en profiles si no hay cascada
    const supabase = await createClient();
    await supabase.from('profiles').delete().eq('id', userId);

    revalidatePath('/settings/users');
    return { success: true, message: 'Invitación cancelada y usuario eliminado' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

import { z } from 'zod'

const passwordSchema = z.object({
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
})

export async function updateInitialPassword(formData: FormData) {
  const supabase = await createClient()

  // 1. Validar inputs
  const rawData = {
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword')
  }

  const validation = passwordSchema.safeParse(rawData)
  if (!validation.success) {
    return { success: false, message: validation.error.issues[0].message }
  }

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("No autenticado")

    // 2. Actualizar contraseña en Supabase Auth
    const { error: authError } = await supabase.auth.updateUser({
      password: validation.data.password
    })

    if (authError) throw authError

    // 3. Actualizar estado en tabla profiles a 'active'
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ status: 'active' })
      .eq('id', user.id)

    if (profileError) throw profileError

    // 4. Revalidar para que el Layout se entere del cambio
    revalidatePath('/', 'layout')

    return { success: true, message: 'Contraseña actualizada correctamente' }

  } catch (error: any) {
    return { success: false, message: error.message || 'Error al actualizar' }
  }
}