// app/page.tsx

import { createClient } from '@/utils/supabase/server'
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from 'next/link'
import { redirect } from 'next/navigation'
import LoadIcon from '@/utils/LoadIcon'
import { UnifiedAppHeader } from '@/app/core/components/UnifiedAppHeader'
import { SettingsMenu } from './settings/components/SettingsMenu'
import { AppModule } from '@/types/users' 

export default async function Dashboard() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // 1. Obtenemos el perfil (Rol Global) y sus permisos específicos
    const [profileRes, permissionsRes, modulesRes] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', user.id).single(),
        supabase.from('app_permissions').select('module_key').eq('user_id', user.id),
        supabase.from('app_modules').select('*').eq('is_active', true)
    ])
    
    const userRole = profileRes.data?.role || 'user';
    const userPermissions = permissionsRes.data?.map(p => p.module_key) || [];
    const allModules = (modulesRes.data || []) as AppModule[];

    // 2. LÓGICA DE FILTRADO
    // Si es admin global, ve todo. 
    // Si es usuario normal, solo ve lo que esté en app_permissions.
    const accessibleModules = allModules.filter(mod => {
        if (userRole === 'admin') return true;
        return userPermissions.includes(mod.key);
    });

    const userEmail = user.email || '';

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <UnifiedAppHeader
                title="Life OS"
                backHref={null} 
                userEmail={userEmail}
                userRole={userRole}
                maxWClass="max-w-5xl" 
                // La tuerca de ajustes solo para Admins Globales
                moduleMenu={userRole === 'admin' ? <SettingsMenu /> : null}
            />

            <main className="max-w-5xl mx-auto p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-700">Mis Aplicaciones</h2>
                    {userRole === 'admin' && (
                        <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full border border-amber-200 uppercase tracking-wider">
                            Modo Super Admin
                        </span>
                    )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {accessibleModules.length > 0 ? (
                        accessibleModules.map((mod) => {
                            const iconName = mod.icon || 'Box';
                            // Usamos mod.key como href asumiendo que es la ruta (ej: /finance-shared)
                            const href = mod.key.startsWith('/') ? mod.key : `/${mod.key}`;
                            
                            return (
                                <Link href={href} key={mod.id}>
                                    <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer h-full border-slate-200 group overflow-hidden">
                                        <CardHeader className="flex flex-row items-center gap-4">
                                            <div className="p-3 bg-slate-100 rounded-xl text-slate-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                                                <LoadIcon name={iconName} className="h-8 w-8" />
                                            </div>
                                            <div className="flex-1">
                                                <CardTitle className="text-lg font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                                                    {mod.name}
                                                </CardTitle>
                                                <CardDescription className="line-clamp-2 text-slate-500">
                                                    {mod.description || 'Acceder al módulo'}
                                                </CardDescription>
                                            </div>
                                        </CardHeader>
                                    </Card>
                                </Link>
                            )
                        })
                    ) : (
                        <div className="col-span-full bg-white p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl shadow-sm">
                            <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                <LoadIcon name="Lock" className="h-8 w-8 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-700">Sin accesos configurados</h3>
                            <p className="text-slate-500 max-w-sm mx-auto mt-2">
                                No tienes permisos asignados a ningún módulo. Contacta con el administrador para que te asigne aplicaciones.
                            </p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}