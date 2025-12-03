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

export default function LoginPage({
  searchParams,
}: {
  searchParams: { message: string }
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
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
            
            {/* Si hay error, lo mostramos aquí */}
            {searchParams?.message && (
              <p className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">
                {searchParams.message}
              </p>
            )}

            <div className="flex flex-col gap-2 pt-4">
              {/* Botón Principal: Entrar */}
              <Button formAction={login} className="w-full">
                Iniciar Sesión
              </Button>
              
              {/* Botón Secundario: Registrarse (Outline) */}
              <Button formAction={signup} variant="outline" className="w-full">
                Registrarse
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}