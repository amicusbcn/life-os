'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { updatePassword } from '@/app/settings/profile/actions'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [sessionState, setSessionState] = useState<'checking' | 'verified' | 'error'>('checking')
  const supabase = createClient()

  // --- LÓGICA DE DETECCIÓN DE SESIÓN ---
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const verifySession = async () => {
        // 1. Preguntar a Supabase si ya tiene sesión (el hash se procesa auto)
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session) {
            console.log("✅ Sesión detectada:", session.user.email)
            setSessionState('verified')
            return true;
        }
        return false;
    }

    // Intento 1: Inmediato + Suscripción
    verifySession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log("🔔 Evento Auth:", event)
        if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || session) {
            setSessionState('verified')
        }
    })

    // Intento 2: Polling de seguridad (por si llegamos tarde al evento)
    // Comprobamos cada 500ms durante 5 segundos
    let attempts = 0;
    intervalId = setInterval(async () => {
        attempts++;
        const found = await verifySession();
        if (found || attempts > 10) clearInterval(intervalId);
    }, 500);

    return () => {
        subscription.unsubscribe()
        clearInterval(intervalId)
    }
  }, [supabase])


  // --- MANEJADOR DEL FORMULARIO ---
  async function handleSubmit(formData: FormData) {
    setLoading(true)
    const result = await updatePassword(formData)
    setLoading(false)

    if (result.success) {
      toast.success('Contraseña restablecida correctamente')
      // Redirigir al login o home tras éxito
      setTimeout(() => router.push('/'), 1000)
    } else {
      toast.error('Error', { description: result.error })
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg bg-white">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center text-slate-900">
                Recuperación
            </CardTitle>
            <CardDescription className="text-center">
              {sessionState === 'checking' && "Verificando enlace de seguridad..."}
              {sessionState === 'verified' && "Enlace verificado. Crea tu nueva contraseña."}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {/* ESTADO: CARGANDO / VERIFICANDO */}
            {sessionState === 'checking' && (
                 <div className="flex flex-col items-center justify-center py-6 gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                    
                    {/* Botón de escape por si se atasca en Incógnito */}
                    <p className="text-xs text-slate-400 text-center px-4">
                        Si esto tarda más de unos segundos...
                    </p>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setSessionState('verified')} // Forzamos mostrar el form
                        className="text-xs"
                    >
                        Mostrar formulario manualmente
                    </Button>
                 </div>
            )}

            {/* ESTADO: VERIFICADO (FORMULARIO) */}
            {sessionState === 'verified' && (
                <form action={handleSubmit} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="p-3 bg-indigo-50 text-indigo-700 text-sm rounded-md flex gap-2 items-start">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <p>Tu sesión es temporal. Al cambiar la contraseña quedarás logueado permanentemente.</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Nueva contraseña</Label>
                        <Input 
                            id="password" 
                            name="password" 
                            type="password" 
                            placeholder="Mínimo 6 caracteres" 
                            required 
                            minLength={6} 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                        <Input 
                            id="confirmPassword" 
                            name="confirmPassword" 
                            type="password" 
                            placeholder="Repite la contraseña" 
                            required 
                            minLength={6} 
                        />
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