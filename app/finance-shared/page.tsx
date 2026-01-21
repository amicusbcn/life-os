import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { UnifiedAppHeader } from '@/app/core/components/UnifiedAppHeader'

// Data Fetching & Actions
import { getSharedGroups, getGroupDashboardData, getGroupTransactions } from './data'
// Client Components
import { FinanceSharedView } from './components/FinanceSharedView'
import { FinanceSharedMenu } from './components/FinanceSharedMenu'
import { CreateGroupDialog } from './components/dialogs/CreateGroupDialog'
import { Button } from '@/components/ui/button'
import { ImpersonationProvider } from './components/ui/ImpersonationContext'
import { ImpersonationBar } from './components/ui/ImpersonationBar'

// Definimos los tipos correctamente para Next.js 15
interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function FinanceSharedPage(props: Props) {
  // 1. AWAIT searchParams (Corrección Next.js 15)
  const searchParams = await props.searchParams;
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return redirect('/login')

  // 2. Obtener Rol
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  
  const userRole = profile?.role || 'user'
  const isAdmin = userRole === 'admin'

  // 3. Obtener Grupos
  const groups = await getSharedGroups()

  // 4. CALCULAR EL ESTADO ACTUAL
  const groupIdParam = typeof searchParams.groupId === 'string' ? searchParams.groupId : undefined
  const activeGroupId = groupIdParam || groups[0]?.id
  const defaultAccountId =  groupIdParam || groups[0]?.default_account_id

  const yearParam = typeof searchParams.year === 'string' ? searchParams.year : undefined
  const selectedYear = yearParam ? parseInt(yearParam) : new Date().getFullYear()

  // Solo buscamos datos si hay un grupo activo
  const [dashboardData, transactions] = await Promise.all([
      getGroupDashboardData(activeGroupId,selectedYear),
      getGroupTransactions(activeGroupId, selectedYear) // <--- AQUÍ
  ])

  // 5. Lógica de "Empty State" (Sin grupos)
  if (!groups || groups.length === 0) {
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
        
        <main className="max-w-7xl mx-auto p-4 md:p-6 mt-12 text-center">

            <div className="max-w-md mx-auto space-y-6">
                <div className="p-8 bg-white rounded-lg shadow border border-slate-200">
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">
                        Bienvenido a Finanzas Compartidas
                    </h2>
                    
                    {isAdmin ? (
                        <>
                            <p className="text-slate-500 mb-6">
                                Aún no perteneces a ningún grupo. Como administrador, puedes crear el primer grupo.
                            </p>
                            <CreateGroupDialog />
                        </>
                    ) : (
                        <>
                            <p className="text-slate-500 mb-6">
                                Actualmente no perteneces a ningún grupo de gastos compartido. 
                                Contacta con el administrador.
                            </p>
                            <Button variant="outline" disabled>Esperando invitación...</Button>
                        </>
                    )}
                </div>
            </div>
        </main>
      </div>
    )
  }

  // 6. Renderizado Principal (Dashboard)
  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24">
                <ImpersonationProvider 
                realUserId={user?.id || ''} 
                members={dashboardData.members}
            >
                {/* 1. LA BARRA GLOBAL (Se gestiona sola) */}
                <ImpersonationBar />
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
            />
        }
      />

      <main className="max-w-7xl mx-auto p-4 md:p-6 mt-6">
        
        <FinanceSharedView 
           groups={groups} 
           activeGroupId={activeGroupId || ''} 
           defaultAccountId={defaultAccountId}
           dashboardData={dashboardData}
        />
      </main>
      
            </ImpersonationProvider>
    </div>
  )
}