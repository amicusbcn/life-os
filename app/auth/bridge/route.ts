// app/api/auth/bridge/route.ts
import { createClient } from '@/utils/supabase/server';
import { jwtVerify } from 'jose';
import { redirect } from 'next/navigation';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) redirect('/login?error=no_token');

  try {
    const secret = new TextEncoder().encode(process.env.EXTERNAL_APP_SECRET);
    
    // 1. Validar el JWT de Lovable
    const { payload } = await jwtVerify(token, secret);
    const email = payload.email as string;
    const targetModule = (payload.module as string) || '';

    const supabase = await createClient();

    // 2. Generar el enlace de acceso (Magic Link)
    // Supabase admin buscará al usuario por email automáticamente.
    // Si no existe, este método devolverá un error, lo cual es correcto 
    // a menos que quieras auto-registrarlos (ver nota abajo).
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        // Redirigimos a la página de destino dentro de Life-OS tras el login
        redirectTo: `${new URL(request.url).origin}/${targetModule}`,
      }
    });

    if (error) {
      console.error("Error generando link de acceso:", error.message);
      return redirect('/login?error=user_not_found');
    }

    // 3. Redirigir al "action_link" que loguea al usuario automáticamente
    return redirect(data.properties.action_link);

  } catch (e) {
    console.error("Error en Bridge:", e);
    return redirect('/login?error=invalid_token');
  }
}