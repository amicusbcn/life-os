'use server'

import { createClient } from "@/utils/supabase/server"
// Necesitamos la clave de servicio para crear usuarios desde el backend
import { createClient as createAdminClient } from '@supabase/supabase-js' 

// Asegúrate de que esta URL y Key están en tus variables de entorno (.env)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY! 

// Función para crear el cliente con permisos de administrador
function getAdminClient() {
    // Usar la clave de service_role para permisos elevados
    return createAdminClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        }
    })
}


export async function inviteUser(formData: FormData) {
    const adminSupabase = getAdminClient()
    
    const email = formData.get('email') as string

    if (!email) {
        return { success: false, error: 'El email es obligatorio.' }
    }

    try {
        // Opción 1: Crear un usuario y enviarle un correo de confirmación de invitación
        // El usuario recibirá un enlace para establecer su contraseña.
        const { data, error } = await adminSupabase.auth.admin.inviteUserByEmail(email)

        if (error) {
            console.error("Error invitando usuario:", error.message)
            return { success: false, error: error.message }
        }

        return { success: true, message: `Invitación enviada a ${email}.` }

    } catch (e) {
        console.error("Error de servidor:", e)
        return { success: false, error: 'Error interno del servidor.' }
    }
}