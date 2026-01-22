// utils/supabase/admin.ts
import { createClient } from '@supabase/supabase-js'

// Este cliente usa la SERVICE_ROLE_KEY y NO usa cookies.
// Esto le permite saltarse el RLS (Row Level Security) completamente.
export const createAdminClient = async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}