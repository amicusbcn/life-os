// app/finance-shared/page.tsx
import { redirect } from 'next/navigation'
import { getSharedGroups, getGroupDashboardData } from './data'
import { getUserData } from '@/utils/security'
import { UnifiedAppSidebar } from '@/components/layout/UnifiedAppSidebar'
import { FinanceSharedView } from './components/FinanceSharedView'
import { FinanceSharedMenu } from './components/FinanceSharedMenu'
import { CreateGroupDialog } from './components/dialogs/CreateGroupDialog'
import { Button } from '@/components/ui/button'
import { ImpersonationProvider } from './components/ui/ImpersonationContext'
import { ImpersonationBar } from './components/ui/ImpersonationBar'
import LoadIcon from '@/utils/LoadIcon'
import Link from 'next/link'

interface Props {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function FinanceSharedPage(props: Props) {
    // 1. Datos globales de seguridad
    const { profile, accessibleModules, userRole } = await getUserData();
    const searchParams = await props.searchParams;
    const isAdmin = userRole === 'admin';
    const view = searchParams.view || 'general';
    const viewTitles: Record<string, string> = {
        dashboard: 'Resumen Anual',
        general: 'Movimientos Globales',
        mine: 'Mis Gastos',
        pending: 'Pendientes',
        balances: 'Saldos del Grupo'
    };
    const dynamicTitle = viewTitles[view as string] || 'Gastos Compartidos';
    const showImpersonationBar = isAdmin && searchParams.debug === 'true';

    const groups = await getSharedGroups();
    const groupIdParam = typeof searchParams.groupId === 'string' ? searchParams.groupId : undefined;
    const activeGroupId = groupIdParam || (groups.length > 0 ? groups[0].id : undefined)
    const selectedYear = typeof searchParams.year === 'string' ? parseInt(searchParams.year) : new Date().getFullYear();
    
    let dashboardData: any = undefined;
    if (activeGroupId) {
        dashboardData = await getGroupDashboardData(activeGroupId, selectedYear);
    }

    // --- CASO A: ESTADO VACÍO (Sin grupos) ---
    if (!activeGroupId || groups.length === 0 || !dashboardData) {
        return (
            <UnifiedAppSidebar
                title={dynamicTitle}
                profile={profile}
                modules={accessibleModules}
                moduleMenu={null}
            >
                <div className="max-w-md mx-auto mt-10">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 text-center">
                        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <LoadIcon name="Wallet" className="h-10 w-10 text-indigo-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-3">
                            {isAdmin ? "Crea tu primer grupo" : "Sin grupos asignados"}
                        </h2>
                        <p className="text-slate-500 mb-8 leading-relaxed">
                            {isAdmin 
                                ? "Para empezar a gestionar gastos compartidos, necesitas crear un grupo e invitar a otros miembros." 
                                : "Actualmente no formas parte de ningún grupo financiero."}
                        </p>
                        <div className="flex flex-col gap-3">
                            {isAdmin ? <CreateGroupDialog /> : (
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-600">
                                    Tu cuenta está activa, pero falta que te asignen a un grupo.
                                </div>
                            )}
                            <Button variant="ghost" asChild className="text-slate-400">
                                <Link href="/">Volver al Dashboard</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </UnifiedAppSidebar>
        )
    }

    // --- CASO B: VISTA PRINCIPAL (Con datos) ---
    return (
        <ImpersonationProvider 
            realUserId={profile.id} 
            members={dashboardData?.members || []}
        >
            <UnifiedAppSidebar
                title={dynamicTitle}
                profile={profile}
                modules={accessibleModules}
                // Inyectamos el menú operativo (Cuerpo)
                moduleMenu={
                    <FinanceSharedMenu 
                        groupId={activeGroupId} 
                        data={dashboardData} 
                        currentUserId={profile.id}
                        mode="operative"
                        isDebugActive={showImpersonationBar}
                    />
                }
                // Inyectamos el menú de configuración (Pie)
                moduleSettings={
                    <FinanceSharedMenu 
                        groupId={activeGroupId} 
                        data={dashboardData} 
                        currentUserId={profile.id}
                        isAdminGlobal={isAdmin}
                        isDebugActive={showImpersonationBar}
                        mode="settings"
                    />
                }
            >
                {/* Barra de debug para Admins */}
                {showImpersonationBar && <div className="mb-6"><ImpersonationBar /></div>}

                <div className="max-w-7xl mx-auto">
                    <FinanceSharedView 
                        groups={groups} 
                        activeGroupId={activeGroupId} 
                        dashboardData={dashboardData}
                    />
                </div>
            </UnifiedAppSidebar>
        </ImpersonationProvider>
    );
}