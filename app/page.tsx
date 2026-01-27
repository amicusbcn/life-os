// app/page.tsx
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { UnifiedAppHeader } from '@/app/core/components/UnifiedAppHeader'
import { SettingsMenu } from './settings/components/SettingsMenu'
import { AppModule } from '@/types/users' 
import { DashboardGrid } from '@/app/core/components/DashboardGrid' 
import LoadIcon from '@/utils/LoadIcon'

export default async function Dashboard() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // 1. Obtenemos perfil, permisos y módulos (Con alias para las nuevas columnas)
    const [profileRes, permissionsRes, modulesRes] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', user.id).single(),
        supabase.from('app_permissions').select('module_key').eq('user_id', user.id),
        supabase
            .from('app_modules')
            // TRUCO SQL: Alias para limpiar los nombres con comillas
            .select('id, key, name, description, icon, is_active, order:"Order", folder:"Folder"')
            .eq('is_active', true)
    ])
    
    const userRole = profileRes.data?.role || 'user';
    const userPermissions = permissionsRes.data?.map(p => p.module_key) || [];
    const allModules = (modulesRes.data || []) as AppModule[];

    // 2. LÓGICA DE FILTRADO (Igual que antes)
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
                
                {/* 3. Delegamos la renderización al Client Component */}
                {accessibleModules.length > 0 ? (
                    <DashboardGrid modules={accessibleModules} />
                ) : (
                    <div className="bg-white p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl shadow-sm">
                        <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                            <LoadIcon name="Lock" className="h-8 w-8 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-700">Sin accesos configurados</h3>
                        <p className="text-slate-500 max-w-sm mx-auto mt-2">
                            No tienes permisos asignados a ningún módulo. Contacta con el administrador.
                        </p>
                    </div>
                )}
            </main>
        </div>
    )
}