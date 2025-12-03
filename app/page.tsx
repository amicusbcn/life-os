'use client'
import { createClient } from '@/utils/supabase/client'
import { useEffect, useState } from 'react'
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from 'next/link'
import { Briefcase, ShoppingCart, Box, Clock, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

const iconMap: Record<string, any> = {
  travel: Briefcase,
  inventory: Box,
  shopping: ShoppingCart,
  timeline: Clock
}

// Mapeo de rutas: Clave del módulo -> Ruta de la web
const routeMap: Record<string, string> = {
  travel: '/travel',
  timeline: '/timeline',
  inventory: '/inventory', // (Aún no existe, dará 404 si entras)
  shopping: '/shopping'    // (Aún no existe, dará 404 si entras)
}

export default function Dashboard() {
  const [modules, setModules] = useState<any[]>([])
  const [userEmail, setUserEmail] = useState("")
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserEmail(user.email || "")

      const { data } = await supabase.from('app_modules').select('*').eq('is_active', true)
      if (data) setModules(data)
    }
    init()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.refresh()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* HEADER */}
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-slate-800">Life OS</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500 hidden sm:inline">Hola, {userEmail}</span>
          <Button variant="ghost" size="sm" onClick={handleLogout} title="Cerrar Sesión">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-5xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-6 text-slate-700">Mis Aplicaciones</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {modules.map((mod) => {
            const IconComponent = iconMap[mod.key] || Box
            
            // BUSCAMOS LA RUTA EN EL MAPA
            const href = routeMap[mod.key] || '#' 
            
            return (
              <Link href={href} key={mod.id}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full border-slate-200">
                  <CardHeader className="flex flex-row items-center gap-4">
                    <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
                      <IconComponent className="h-8 w-8" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{mod.name}</CardTitle>
                      <CardDescription>{mod.description || 'Aplicación del sistema'}</CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            )
          })}
        </div>
      </main>
    </div>
  )
}