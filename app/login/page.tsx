// En app/login/page.tsx (Código CORREGIDO)

import { login, signup } from './actions'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default async function LoginPage({ 
  searchParams,
}: {
  // Nota: El tipo real de searchParams es Promise<Record<string, string | string[]>>
  // Lo corregiremos al usar 'await'. Por ahora, este tipo es suficiente.
  searchParams: { message: string } // Next.js lo maneja como Promise
}) {
  // ✅ CORRECCIÓN: Usa 'await' para obtener el objeto de parámetros real.
  // Esto resuelve la Promesa (Proxy Promise) que Next.js utiliza.
  const params = await searchParams;
  const message = params.message; // Ahora 'message' es una string (o undefined)
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 pb-32">
      <Card className="w-full max-w-md shadow-lg border-0">
        <CardHeader>
          <CardTitle className="text-2xl text-center font-bold">Life OS</CardTitle>
          <CardDescription className="text-center">
            Acceso al sistema de gestión familiar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                name="email" 
                type="email" 
                placeholder="tu@email.com" 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input 
                id="password" 
                name="password" 
                type="password" 
                required 
                minLength={6}
              />
            </div>
            
            {/* ✅ CORRECCIÓN: Usamos la variable 'message' que ya ha sido esperada (await) */}
            {message && (
              <p className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">
                {message}
              </p>
            )}

            <div className="flex flex-col gap-2 pt-4">
              <Button formAction={login} className="w-full">
                Iniciar Sesión
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}