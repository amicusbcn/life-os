import { createClient } from '@/utils/supabase/server'
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from 'next/link'
import { Briefcase, ShoppingCart, Box, Clock } from 'lucide-react'
import { redirect } from 'next/navigation'
// IMPORTAMOS EL HEADER UNIFICADO
import { UnifiedAppHeader } from '@/app/core/components/UnifiedAppHeader'
import { SettingsMenu } from './settings/components/SettingsMenu'
// IMPORTAMOS EL TIPO DE LA ENTIDAD APP_MODULES
import { AppModule } from '@/types/settings' 

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
	inventory: '/inventory',
	shopping: '/shopping' 	
}

export default async function Dashboard() {
	const supabase = await createClient()

	const { data: { user } } = await supabase.auth.getUser()

	if (!user) {
		redirect('/login')
	}

	// Obtenemos el perfil para sacar el rol
	const { data: profile } = await supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single()
	
	console.log('ROL OBTENIDO DE LA BBDD:', profile?.role);
	
	// Usamos el tipo AppModule
	const { data: modules } = await supabase.from('app_modules').select('*').eq('is_active', true).returns<AppModule[]>()

	// Datos necesarios para el Header
	const userEmail = user.email || '';
	const userRole = profile?.role || null;
	
	return (
		<div className="min-h-screen bg-slate-50 font-sans">
			
			{/* HEADER UNIFICADO */}
			<UnifiedAppHeader
				title="Life OS"
				backHref={null} // No hay botón de vuelta en la Home
				userEmail={userEmail}
				userRole={userRole}
				maxWClass="max-w-5xl" // Usamos el ancho del main para el Header de la Home
        		moduleMenu={<SettingsMenu />}
			/>

			{/* CONTENIDO PRINCIPAL */}
			<main className="max-w-5xl mx-auto p-6">
				<h2 className="text-2xl font-bold mb-6 text-slate-700">Mis Aplicaciones</h2>
				
				<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
					{(modules || []).map((mod) => {
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