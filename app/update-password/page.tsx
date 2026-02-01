'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, AlertCircle, XCircle, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  
  const [sessionState, setSessionState] = useState<'checking' | 'verified' | 'error'>('checking')
  const [errorMessage, setErrorMessage] = useState<string>('')
  
  const supabase = createClient()

  useEffect(() => {
    const handleAuth = async () => {
        // 1. Detección de ERRORES en URL (Prioritario)
        const hashStr = window.location.hash.substring(1); // Quitamos el '#'
        const hashParams = new URLSearchParams(hashStr);
        
        const error = hashParams.get('error');
        const errorDesc = hashParams.get('error_description');
        const errorCode = hashParams.get('error_code');

        if (error) {
            console.error("❌ Error en URL:", errorDesc);
            if (errorCode === 'otp_expired') {
                setErrorMessage("El enlace ha caducado. Pide uno nuevo.");
            } else {
                setErrorMessage(errorDesc?.replace(/\+/g, ' ') || "Enlace no válido.");
            }
            setSessionState('error');
            return;
        }

        // 2. INTENTO ESTÁNDAR: ¿Supabase ya tiene la sesión?
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            console.log("✅ Sesión detectada (Estándar)");
            setSessionState('verified');
            return;
        }

        // 3. INTENTO DE FUERZA BRUTA (La Solución Nuclear) ☢️
        // Si Supabase no se ha enterado, leemos nosotros el token del hash
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken && refreshToken) {
            console.log("⚠️ Forzando sesión manualmente desde el Hash...");
            const { error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
            });

            if (!error) {
                console.log("✅ Sesión forzada con éxito");
                setSessionState('verified');
                return;
            } else {
                console.error("Fallo al forzar sesión:", error);
            }
        }

        // 4. Último recurso: Escuchar eventos (por si acaso)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY' || session) {
                setSessionState('verified');
            }
        });

        return () => subscription.unsubscribe();
    }

    handleAuth();
  }, [supabase]);


  // --- MANEJADOR DEL FORMULARIO (CLIENT SIDE) ---
  async function handleSubmit(formData: FormData) {
    setLoading(true)
    
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (password !== confirmPassword) {
        toast.error('Las contraseñas no coinciden')
        setLoading(false)
        return
    }

    // Usamos updateUser directo (el cliente ya tiene la sesión gracias al useEffect)
    const { error } = await supabase.auth.updateUser({ password })

    setLoading(false)

    if (error) {
      toast.error('Error al actualizar', { description: error.message })
    } else {
      toast.success('Contraseña actualizada correctamente')
      setTimeout(() => {
          router.push('/') 
          router.refresh()
      }, 1000)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg bg-white">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-2">
                {sessionState === 'checking' && <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />}
                {sessionState === 'verified' && <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center text-green-600"><AlertCircle /></div>}
                {sessionState === 'error' && <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center text-red-600"><XCircle /></div>}
            </div>
            
            <CardTitle className="text-2xl font-bold text-center text-slate-900">
                {sessionState === 'error' ? 'Error de Enlace' : 'Recuperación'}
            </CardTitle>
            <CardDescription className="text-center">
              {sessionState === 'checking' && "Procesando credenciales..."}
              {sessionState === 'verified' && "Sesión activa. Crea tu nueva contraseña."}
              {sessionState === 'error' && errorMessage}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {sessionState === 'checking' && (
                 <div className="text-center pb-4">
                    <p className="text-xs text-slate-400">Validando token de seguridad...</p>
                 </div>
            )}

            {sessionState === 'error' && (
                <div className="space-y-4">
                    <Button onClick={() => router.push('/login')} variant="outline" className="w-full gap-2">
                        <ArrowLeft className="h-4 w-4" /> Volver al Login
                    </Button>
                </div>
            )}

            {sessionState === 'verified' && (
                <form action={handleSubmit} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="space-y-2">
                        <Label htmlFor="password">Nueva contraseña</Label>
                        <Input id="password" name="password" type="password" placeholder="******" required minLength={6} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                        <Input id="confirmPassword" name="confirmPassword" type="password" placeholder="******" required minLength={6} />
                    </div>
                    
                    <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Guardar Nueva Contraseña'}
                    </Button>
                </form>
            )}
          </CardContent>
        </Card>
    </div>
  )
}