'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Loader2, Lock, CheckCircle2 } from 'lucide-react'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleUpdate = async () => {
    if (!password || password.length < 6) {
        return toast.error('La contraseña debe tener al menos 6 caracteres')
    }
    
    setLoading(true)

    // Al haber pasado por el callback, el usuario ya tiene sesión activa.
    // Solo actualizamos su usuario con la nueva contraseña.
    const { error } = await supabase.auth.updateUser({
      password: password
    })

    if (error) {
      toast.error('Error al guardar', { description: error.message })
    } else {
      toast.success('¡Contraseña guardada!')
      // Redirigir al inicio (Dashboard)
      router.replace('/') 
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
      <div className="w-full max-w-sm bg-white p-8 rounded-xl shadow-lg border border-slate-200">
        
        <div className="text-center mb-6">
            <div className="h-12 w-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Establecer Contraseña</h1>
            <p className="text-sm text-slate-500 mt-2">
                Bienvenido. Para terminar de configurar tu cuenta, elige una contraseña segura.
            </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pass">Nueva Contraseña</Label>
            <Input 
              id="pass"
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="******"
              autoFocus
            />
          </div>
          
          <Button onClick={handleUpdate} disabled={loading} className="w-full bg-slate-900 hover:bg-slate-800">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            {loading ? 'Guardando...' : 'Guardar y Entrar'}
          </Button>
        </div>

      </div>
    </div>
  )
}