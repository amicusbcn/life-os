'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updatePassword } from '@/app/settings/profile/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Lock, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { UnifiedAppHeader } from '@/app/core/components/UnifiedAppHeader' // Tu header estándar

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    
    // Llamamos a la Server Action
    const result = await updatePassword(formData)
    
    setLoading(false)

    if (result.success) {
      toast.success('Contraseña restablecida', {
        description: 'Tu contraseña se ha actualizado. Redirigiendo...'
      })
      
      // Esperamos un segundo para que el usuario lea el mensaje y redirigimos
      setTimeout(() => {
        router.push('/') 
      }, 2000)
    } else {
      toast.error('Error', { description: result.error })
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
       {/* Header simple (quizás sin menú si es un proceso crítico) */}
       <header className="bg-white border-b border-slate-200 p-4 flex justify-center">
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Lock className="h-5 w-5 text-indigo-600" />
                Life-OS Security
            </h1>
       </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Nueva Contraseña</CardTitle>
            <CardDescription className="text-center">
              Introduce tu nueva contraseña para recuperar el acceso a tu cuenta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nueva contraseña</Label>
                <Input 
                  id="password" 
                  name="password" 
                  type="password" 
                  placeholder="••••••••" 
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
                  placeholder="••••••••" 
                  required 
                  minLength={6}
                />
              </div>
              
              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
                {loading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Actualizando...
                    </>
                ) : (
                    'Actualizar Contraseña'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}