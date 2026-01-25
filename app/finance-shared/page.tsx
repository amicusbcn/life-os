import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { UnifiedAppHeader } from '@/app/core/components/UnifiedAppHeader'

// Data Fetching & Actions
import { getSharedGroups, getGroupDashboardData, getGroupTransactions } from './data'
// Client Components
import { validateModuleAccess } from '@/utils/security'
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
  const { 
    user, 
    userRole,        // Esto mapea al rol global (admin/user)
    isAdminGlobal: isAdmin // Renombramos isAdminGlobal a isAdmin para que tu código funcione
  } = await validateModuleAccess('finance-shared')

  const searchParams = await props.searchParams;
  const showImpersonationBar = isAdmin && searchParams.debug === 'true';

  const groups = await getSharedGroups();
  const groupIdParam = typeof searchParams.groupId === 'string' ? searchParams.groupId : undefined;
  const activeGroupId = groupIdParam || (groups.length > 0 ? groups[0].id : undefined)
  const selectedYear = typeof searchParams.year === 'string' ? parseInt(searchParams.year) : new Date().getFullYear();
  let dashboardData: any = undefined;
  if (activeGroupId) {
    dashboardData = await getGroupDashboardData(activeGroupId, selectedYear);
  }

  if (!activeGroupId || groups.length === 0 || !dashboardData) {
        return (
            <div className="min-h-screen bg-slate-50 font-sans">
                <UnifiedAppHeader
                    title="Finanzas Compartidas"
                    backHref="/"
                    userEmail={user.email || ''}
                    userRole={userRole}
                    maxWClass="max-w-7xl"
                    moduleMenu={null}
                />
                
                <main className="max-w-7xl mx-auto p-4 md:p-6 mt-16">
                    <div className="max-w-md mx-auto">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 text-center">
                            {/* Icono decorativo */}
                            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <LoadIcon name="Wallet" className="h-10 w-10 text-indigo-600" />
                            </div>

                            <h2 className="text-2xl font-bold text-slate-900 mb-3">
                                {isAdmin ? "Crea tu primer grupo" : "Sin grupos asignados"}
                            </h2>
                            
                            <p className="text-slate-500 mb-8 leading-relaxed">
                                {isAdmin 
                                    ? "Para empezar a gestionar gastos compartidos, necesitas crear un grupo (ej. 'Casa', 'Viaje Japón') e invitar a otros miembros." 
                                    : "Actualmente no formas parte de ningún grupo financiero. Solicita al administrador que te añada a uno para empezar a ver los gastos."
                                }
                            </p>

                            <div className="flex flex-col gap-3">
                                {isAdmin ? (
                                    <CreateGroupDialog />
                                ) : (
                                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center gap-3 text-left">
                                        <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                                        <span className="text-sm text-slate-600">
                                            Tu cuenta está activa, pero falta que te asignen a un grupo de gastos.
                                        </span>
                                    </div>
                                )}
                                
                                <Button variant="ghost" asChild className="text-slate-400 hover:text-slate-600">
                                    <Link href="/">Volver al Dashboard</Link>
                                </Button>
                            </div>
                        </div>

                        {/* Footer informativo extra */}
                        <p className="text-center mt-6 text-xs text-slate-400 uppercase tracking-widest">
                            Módulo de Finanzas • Life OS
                        </p>
                    </div>
                </main>
            </div>
        )
    }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24">
      {/* CORRECCIÓN: El Provider envuelve SIEMPRE al contenido para evitar el error de Contexto.
          Internamente, el Provider debe manejar si permite o no la impersonación según el rol.
      */}
      <ImpersonationProvider 
        realUserId={user.id} 
        members={dashboardData?.members || []}
      >
        {/* La barra solo se muestra visualmente si es admin */}
        {showImpersonationBar && <ImpersonationBar />}
        
        <UnifiedAppHeader
          title="Finanzas Compartidas"
          backHref="/"
          userEmail={user.email || ''}
          userRole={userRole}
          maxWClass="max-w-7xl"
          moduleMenu={
            <FinanceSharedMenu 
              groupId={activeGroupId} 
              data={dashboardData} 
              currentUserId={user.id}
              isAdminGlobal={isAdmin}
              isDebugActive={showImpersonationBar}
            />
          }
        />

        <main className="max-w-7xl mx-auto p-4 md:p-6 mt-6">
          <FinanceSharedView 
            groups={groups} 
            activeGroupId={activeGroupId} 
            dashboardData={dashboardData}
          />
        </main>
      </ImpersonationProvider>
    </div>
  );
}