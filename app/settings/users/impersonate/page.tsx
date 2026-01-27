'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ImpersonatePage() {
  const router = useRouter()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [errorMsg, setErrorMsg] = useState('')
  const supabase = createClient()

  useEffect(() => {
    const handleImpersonation = async () => {
        // 1. Leer el hash de la URL
        const hashStr = window.location.hash.substring(1); 
        const hashParams = new URLSearchParams(hashStr);
        
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const errorDescription = hashParams.get('error_description');

        // Caso A: Error explícito en la URL
        if (errorDescription) {
            setStatus('error');
            setErrorMsg(errorDescription.replace(/\+/g, ' '));
            return;
        }

        // Caso B: Tenemos token -> FORZAMOS LA SESIÓN
        if (accessToken && refreshToken) {
            console.log("🕵️‍♂️ Token detectado. Suplantando identidad...");
            
            const { error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
            });

            if (!error) {
                setStatus('success');
                toast.success("Identidad suplantada con éxito");
                // Redirigir a la home después de un momento
                setTimeout(() => {
                    router.push('/');
                    router.refresh();
                }, 1000);
            } else {
                setStatus('error');
                setErrorMsg(error.message);
            }
        } else {
            // Caso C: No hay hash (quizás llegó por params normales o no llegó nada)
            // Intentamos ver si la sesión ya está activa por magia de Supabase
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setStatus('success');
                setTimeout(() => router.push('/'), 500);
            } else {
                setStatus('error');
                setErrorMsg("No se encontró token de acceso en el enlace.");
            }
        }
    }

    handleImpersonation();
  }, [supabase, router]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-slate-800 bg-slate-900 text-slate-100">
            <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2 text-xl">
                    {status === 'processing' && <Loader2 className="animate-spin h-6 w-6 text-indigo-500" />}
                    {status === 'success' && "✅ Acceso Concedido"}
                    {status === 'error' && "❌ Error de Acceso"}
                </CardTitle>
                <CardDescription className="text-slate-400">
                    {status === 'processing' && "Configurando sesión de usuario..."}
                    {status === 'success' && "Redirigiendo al Dashboard..."}
                    {status === 'error' && errorMsg}
                </CardDescription>
            </CardHeader>
        </Card>
    </div>
  )
}