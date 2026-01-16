import { createClient } from '@/utils/supabase/server'

// Definimos la interfaz aquí para evitar líos de importación
export interface DashboardData {
    accounts: any[]
    members: any[]
    categories: any[]
    stats: {
        bankBalance: number
        netBalance: number
        pendingApproval: number
        unallocatedCount: number
        pendingCardJustification: number
        activeLoans: number
        activeProvisions: number
    }
}

export async function getSharedGroups() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('finance_shared_groups')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) console.error('Error fetching groups:', error)
  return data || []
}

export async function getGroupTransactions(groupId: string, year: number) {
  if (!groupId) return []
  const supabase = await createClient()
  
  // Definimos rango de fechas
  const startDate = `${year}-01-01`
  const endDate = `${year}-12-31`

  const { data, error } = await supabase
    .from('finance_shared_transactions')
    .select(`
      *,
      payer:payer_member_id ( id, name ),
      category:category_id ( id, name, icon_name, color, is_individual_assignment ),
      allocations:finance_shared_allocations ( member_id, amount )
    `)
    .eq('group_id', groupId)
    .gte('date', startDate) // Mayor o igual al 1 Ene
    .lte('date', endDate)   // Menor o igual al 31 Dic
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    // Quitamos el límite hardcodeado o lo ponemos muy alto (ej: 1000 por año)
    .limit(2000) 

  if (error) {
    console.error('Error fetching transactions:', error)
    return []
  }

  return data
}

export async function getGroupDashboardData(groupId: string): Promise<DashboardData> {
  // Objeto por defecto (vacío) para devolver si algo falla
  const emptyData: DashboardData = {
      accounts: [],
      members: [],
      categories: [],
      stats: {
          bankBalance: 0,
          netBalance: 0,
          pendingApproval: 0,
          unallocatedCount: 0,
          pendingCardJustification: 0,
          activeLoans: 0,
          activeProvisions: 0
      }
  }

  if (!groupId) return emptyData

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return emptyData

  try {
      // 1. Cuentas y Categorías
      const { data: accounts } = await supabase.from('finance_shared_accounts').select('*').eq('group_id', groupId)
      const { data: categories } = await supabase.from('finance_shared_categories').select('*').eq('group_id', groupId).order('name')
      
      // 2. Miembros
      const { data: members } = await supabase
        .from('view_finance_shared_member_balances')
        .select('*')
        .eq('group_id', groupId)
        .order('name')

      // 3. ESTADÍSTICAS
      
      // A. Saldo Banco
      const { data: lastBalanceTx } = await supabase
        .from('finance_shared_transactions')
        .select('bank_balance')
        .eq('group_id', groupId)
        .not('bank_balance', 'is', null)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const bankBalance = lastBalanceTx?.bank_balance || 0

      // B. Pendientes Aprobar
      const { count: pendingApproval } = await supabase
        .from('finance_shared_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId)
        .eq('approval_status', 'pending')

      // C. Pendientes Repartir (Sin allocations)
      // Traemos las últimas 50 para comprobar
      const { data: recentTxs } = await supabase
        .from('finance_shared_transactions')
        .select('id, allocations:finance_shared_allocations(id)')
        .eq('group_id', groupId)
        .order('date', { ascending: false })
        .limit(50)

      const unallocatedCount = recentTxs?.filter(tx => !tx.allocations || tx.allocations.length === 0).length || 0

      const pendingCardJustification = 0 
      const activeLoans = 0
      const activeProvisions = 0
      const netBalance = bankBalance + activeLoans - activeProvisions

      return {
        accounts: accounts || [],
        members: members || [],
        categories: categories || [],
        stats: {
          bankBalance,
          netBalance,
          pendingApproval: pendingApproval || 0,
          unallocatedCount,
          pendingCardJustification,
          activeLoans,
          activeProvisions
        }
      }

  } catch (error) {
      console.error("Error cargando dashboard:", error)
      return emptyData
  }
}