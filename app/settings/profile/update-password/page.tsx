'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { updatePassword } from '@/app/settings/profile/actions'
import { createClient } from '@/utils/supabase/client' // Importa tu cliente de navegador
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Lock } from 'lucide-react'
import { toast } from 'sonner'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [sessionChecked, setSessionChecked] = useState(false)
  const supabase = createClient()

  // 1. EFECTO DE AUTO-LOGIN
  // Este efecto detecta el hash (#access_token=...) en la URL, lo procesa
  // y loguea al usuario silenciosamente.
  useEffect(() => {
    const checkSession = async () => {
      // Al inicializarse, supabase busca el hash en la URL automáticamente.
      // Solo verificamos si tenemos sesión.
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        // Si no hay sesión, quizás es que el hash no se ha procesado aún 
        // o el link es inválido. Escuchamos cambios.
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'PASSWORD_RECOVERY' || session) {
            setSessionChecked(true)
          }
        })
        return () => subscription.unsubscribe()
      } else {
        setSessionChecked(true)
      }
    }

    checkSession()
  }, [supabase])


  async function handleSubmit(formData: FormData) {
    if (!sessionChecked) {
        toast.error("No se ha detectado una sesión válida. Vuelve a hacer clic en el correo.")
        return;
    }
    
    setLoading(true)
    const result = await updatePassword(formData)
    setLoading(false)

    if (result.success) {
      toast.success('Contraseña restablecida correctamente')
      router.push('/') // O a /dashboard
    } else {
      toast.error('Error', { description: result.error })
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Recuperación</CardTitle>
            <CardDescription className="text-center">
              {sessionChecked 
                ? "Sesión verificada. Introduce tu nueva contraseña." 
                : "Verificando enlace de seguridad..."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Solo mostramos el formulario si hemos validado la sesión/link */}
            {!sessionChecked ? (
                 <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                 </div>
            ) : (
                <form action={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="password">Nueva contraseña</Label>
                    <Input id="password" name="password" type="password" required minLength={6} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                    <Input id="confirmPassword" name="confirmPassword" type="password" required minLength={6} />
                </div>
                
                <Button type="submit" className="w-full bg-indigo-600" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Guardar Nueva Contraseña'}
                </Button>
                </form>
            )}
          </CardContent>
        </Card>
    </div>
  )
}