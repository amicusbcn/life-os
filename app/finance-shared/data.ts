import { SharedMember, SharedAccount, SharedCategory, DashboardData } from '@/types/finance-shared'
import { createClient } from '@/utils/supabase/server'

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
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(2000) 

  if (error) {
    console.error('Error fetching transactions:', error)
    return []
  }

  return data
}

export async function getGroupDashboardData(groupId: string, year: number = new Date().getFullYear()): Promise<DashboardData> {
    const emptyData: DashboardData = {
        accounts: [],
        members: [],
        categories: [],
        transactions: [],
        splitTemplates: []
    }

    if (!groupId) return emptyData

    const supabase = await createClient()
    
    // Rango de fechas para el cálculo ANUAL
    const startDate = `${year}-01-01`
    const endDate = `${year}-12-31`

    try {
        // 1. Cuentas
        const { data: accounts } = await supabase
            .from('finance_shared_accounts')
            .select('*')
            .eq('group_id', groupId)
            .order('name')

        // 2. Categorías
        const { data: categories } = await supabase
            .from('finance_shared_categories')
            .select('*')
            .eq('group_id', groupId)
            .order('name')
        
        // 3. Miembros (DESDE LA VISTA SQL) -> Trae 'global_balance' (Histórico)
        const { data: rawMembers } = await supabase
            .from('view_finance_shared_member_balances') // <--- OJO: Usamos la vista nueva
            .select('*')
            .eq('group_id', groupId)
            .order('name')

        // 4. Transacciones (SOLO DEL AÑO)
        const { data: transactions } = await supabase
            .from('finance_shared_transactions')
            .select(`
                *,
                allocations:finance_shared_allocations(*),
                category:finance_shared_categories(*)
            `)
            .eq('group_id', groupId)
            .gte('date', startDate) // Filtramos por año actual
            .lte('date', endDate)
            .order('date', { ascending: false })
            .order('created_at', { ascending: false })
        
        // --- TEMPLATES  ---
        const { data: splitTemplates } = await supabase
            .from('finance_shared_split_templates')
            .select(`
                *,
                template_members:finance_shared_split_template_members(*)
            `)
            .eq('group_id', groupId)
            .order('created_at', { ascending: false })
        // 5. CÁLCULO HÍBRIDO CON REGLAS DE NEGOCIO AVANZADAS
        
        // --- A. CONFIGURACIÓN DE PESOS (PREPARADO PARA EL FUTURO) ---
        // Aquí podrías leer m.split_weight de la BBDD. Por ahora, todos valen 1.
        const membersWithWeights = rawMembers?.map((m: any) => ({
            ...m,
            weight: 1 // TODO: En el futuro cambiar esto por: m.default_weight || 1
        })) || []

        // Suma total de pesos (Ej: si sois 4 personas con peso 1, esto es 4)
        const totalGroupWeight = membersWithWeights.reduce((sum: number, m: any) => sum + m.weight, 0) || 1

        const membersWithBalances = membersWithWeights.map((m: any) => {
            let paidExpenses = 0
            let allocatedIncome = 0
            let consumed = 0
            let loanImpact = 0

            transactions?.forEach((tx: any) => {
                
                // REGLA 1: PENDIENTES SE IGNORAN
                // Asumo que tienes un campo 'status'. Si no, quita esta línea.
                if (tx.status === 'pending') return 

                const isPayer = tx.payer_member_id === m.id
                const amountAbs = Math.abs(tx.amount)
                
                // --- 1. LÓGICA DEL PAGADOR (APORTACIONES) ---
                if (isPayer) {
                    if (tx.type === 'expense') {
                        paidExpenses += amountAbs
                    } else if (tx.type === 'loan') {
                        loanImpact += tx.amount
                    }
                    // Nota: Si es Transferencia pagada, no suma "Aportado" contablemente, 
                    // salvo que queramos contar el movimiento de salida. 
                    // Normalmente en Equity, pagar una transferencia interna no cambia tu saldo neto 
                    // hasta que se consume el destino. Pero si quieres reflejar esfuerzo, avísame.
                }

                // --- 2. LÓGICA DEL CONSUMIDOR (ALLOCATIONS + REPARTOS) ---
                
                // Calculamos cuánto está ya asignado explícitamente a alguien
                const totalAllocatedInTx = tx.allocations?.reduce((sum: number, a: any) => sum + Math.abs(a.amount), 0) || 0
                const remainder = Math.max(0, amountAbs - totalAllocatedInTx) // Lo que falta por justificar
                
                // Buscamos si este miembro tiene asignación explícita
                const myAlloc = tx.allocations?.find((a: any) => a.member_id === m.id)
                const myAllocAmount = myAlloc ? Math.abs(myAlloc.amount) : 0

                // CASO A: REPARTO EXPLÍCITO (Allocations)
                // Aplica a TODO: Gastos, Ingresos, Provisiones...
                if (myAllocAmount > 0) {
                    if (tx.type === 'income') {
                        allocatedIncome += myAllocAmount
                    } else if (tx.type === 'expense' || tx.type === 'transfer' || tx.is_provision) {
                        consumed += myAllocAmount
                    }
                }

                // CASO B: REPARTO DEL RESTO (Proporcional / Por Pesos)
                // REGLA 2: Provisiones NO reparten el resto (Solo allocations explícitas)
                // REGLA 3: Gastos y Transferencias SÍ reparten el resto
                if (!tx.is_provision && remainder > 0.01) { 
                    
                    if (tx.type === 'expense' || tx.type === 'transfer') {
                        // Fórmula: (Resto * MiPeso) / PesoTotalGrupo
                        const myShareOfRemainder = (remainder * m.weight) / totalGroupWeight
                        
                        consumed += myShareOfRemainder
                        
                        // Log diferente según si es total o parcial
                        const isFullSplit = totalAllocatedInTx === 0
                        const typeLabel = tx.type === 'transfer' ? 'Transf. no justificada' : 'Gasto sin asignar'
                        
                    }
                }
            })

            const totalContributed = paidExpenses + allocatedIncome 
            const annualBalance = totalContributed - consumed + loanImpact

            return {
                ...m,
                global_balance: Number(m.global_balance) || 0,
                annual_paid: totalContributed, 
                annual_consumed: consumed,
                annual_loans: loanImpact, 
                annual_balance: annualBalance
            }
        })

        return {
            accounts: accounts || [],
            members: membersWithBalances || [],
            categories: categories || [],
            transactions: transactions || [],
            splitTemplates: splitTemplates || []
        }

    } catch (error) {
        console.error("Error cargando dashboard:", error)
        return emptyData
    }
}

