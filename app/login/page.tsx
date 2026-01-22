// app/login/page.tsx

import { login } from './actions' // signup si lo usas
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ForgotPasswordDialog } from './components/ForgotPasswordDialog' // <--- IMPORTAR

export default async function LoginPage({ 
  searchParams,
}: {
  searchParams: { message: string } 
}) {
  const params = await searchParams;
  const message = params?.message; // El ? por seguridad si params es undefined

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
              <Input id="email" name="email" type="email" placeholder="tu@email.com" required />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
                {/* 👇 AQUÍ PONEMOS EL BOTÓN */}
                <ForgotPasswordDialog />
              </div>
              <Input id="password" name="password" type="password" required minLength={6} />
            </div>
            
            {message && (
              <p className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">
                {message}
              </p>
            )}

            <div className="flex flex-col gap-2 pt-4">
              <Button formAction={login} className="w-full bg-slate-900 hover:bg-slate-800">
                Iniciar Sesión
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}