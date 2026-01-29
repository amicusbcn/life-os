// app/page.tsx
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { UnifiedAppSidebar } from '@/components/layout/UnifiedAppSidebar'
import { SettingsMenu } from './settings/components/SettingsMenu'
import { AppModule, UserProfile } from '@/types/users' 
import { DashboardGrid } from '@/app/core/components/DashboardGrid' 
import LoadIcon from '@/utils/LoadIcon'
import { getUserData } from '@/utils/security'

export default async function Dashboard() {
    const { profile, accessibleModules, userRole } = await getUserData()
    return (
        <UnifiedAppSidebar
            title="Life OS"
            profile={profile}
            modules={accessibleModules}
            moduleMenu={userRole === 'admin' ? <SettingsMenu /> : null}
        >
            {/* El contenido de tu DashboardGrid ahora es el "children" */}
            <div className="max-w-5xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div className="space-y-1">
                        <h2 className="text-2xl font-bold text-slate-700">Mis Aplicaciones</h2>
                        <p className="text-sm text-slate-500">Bienvenido de nuevo, {profile.full_name?.split(' ')[0]}</p>
                    </div>
                    {userRole === 'admin' && (
                        <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full border border-amber-200 uppercase tracking-wider">
                            Modo Super Admin
                        </span>
                    )}
                </div>
                
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
            </div>
        </UnifiedAppSidebar>
    )
}