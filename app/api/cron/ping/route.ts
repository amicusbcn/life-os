// app/api/cron/ping/route.ts
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Verificamos que la petición venga de un robot autorizado por Vercel
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('No autorizado', { status: 401 });
  }

  try {
    const supabase = await createClient();
    
    // Hacemos una consulta ridículamente simple a tu tabla de cuentas
    // Solo para que Supabase vea que la base de datos se está usando.
    await supabase.from('finance_accounts').select('id').limit(1);

    return NextResponse.json({ success: true, message: '¡Supabase está despierto!' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}