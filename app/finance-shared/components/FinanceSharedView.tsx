// app/finance-shared/components/FinanceSharedView.tsx

'use client'

import { useState } from 'react'
import { SharedGroup, SharedAccount } from '@/types/finance-shared'
import { DashboardData } from '@/app/finance-shared/data'
import { DashboardStats } from './ui/DashboardStats' // <--- IMPORTAR
import { MemberEquityCard } from './ui/MemberEquityCard'
import { TransactionList } from './ui/TransactionList' // <--- Importar
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { CreateTransactionDialog } from './dialogs/CreateTransactionDialog' // <--- IMPORTAR
import { TransactionFormDialog } from './dialogs/TransactionFormDialog'
import { YearNavigator } from './ui/YearNavigator'

interface Props {
  groups: SharedGroup[]
  activeGroupId: string
  dashboardData: DashboardData
  currentUserId: string 
  transactions: any[]
  selectedYear:number
}

export function FinanceSharedView({ groups, activeGroupId, dashboardData, currentUserId, transactions,selectedYear }: Props) {
  const safeData = dashboardData || { 
      accounts: [], members: [], categories: [], 
      stats: { bankBalance: 0, netBalance: 0, pendingApproval: 0, unallocatedCount: 0, pendingCardJustification: 0, activeLoans: 0, activeProvisions: 0 } 
  }

  const { members, categories } = safeData // Usamos safeData

  // Determinamos si soy Admin buscando en la lista de miembros
  // (Nota: Esto asume que el user_id ya está vinculado correctamente en la vista SQL)
  const myMember = members.find(m => m.user_id === currentUserId)
  const isAdmin = myMember?.role === 'admin'
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTx, setEditingTx] = useState<any>(null) // Guardará la transacción a editar

  const handleOpenCreate = () => {
      setEditingTx(null) // Limpiamos para modo crear
      setIsFormOpen(true)
  }

  const handleOpenEdit = (tx: any) => {
      setEditingTx(tx) // Cargamos datos
      setIsFormOpen(true)
  }
  const myTransactions = transactions.filter(tx => 
      (tx.payment_source === 'member' && tx.payer_member_id === myMember?.id) ||
      (tx.allocations?.some((a: any) => a.member_id === myMember?.id))
  )
  const unallocatedTransactions = transactions.filter(tx => 
      !tx.allocations || tx.allocations.length === 0
  )
  const hasUnallocated = unallocatedTransactions.length > 0

  return (
    <div className="space-y-6">
      
      {/* 1. NUEVA CABECERA DE ESTADÍSTICAS */}
      <DashboardStats 
         data={safeData}
         currentUserId={currentUserId}
      />

      {/* 2. AREA DE ACCIÓN PRINCIPAL (Botón de Gasto) */}
      <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-4 mb-4">
           {/* El navegador de año a la izquierda (o centro en móvil) */}
           <YearNavigator currentYear={selectedYear} />

           <Button onClick={handleOpenCreate} className="bg-slate-900 text-white hover:bg-slate-800 w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" /> Nuevo Gasto
           </Button>
      </div>

      {/* 3. TABS DE DETALLE (Reorganizamos un poco) */}
      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="bg-white border p-1 mb-4 w-full sm:w-auto overflow-x-auto flex justify-start">
           <TabsTrigger value="activity">Actividad</TabsTrigger>
           <TabsTrigger value="mine">Mis Movimientos</TabsTrigger>
           
           {/* PESTAÑA ADMIN: PENDIENTES */}
           {isAdmin && (
               <TabsTrigger 
                    value="pending" 
                    disabled={!hasUnallocated} // Deshabilitado si no hay nada
                    className={hasUnallocated ? "text-red-600 data-[state=active]:bg-red-50 data-[state=active]:text-red-700" : "opacity-50"}
               >
                   Pendientes
                   {hasUnallocated && (
                       <span className="ml-2 bg-red-100 text-red-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                           {unallocatedTransactions.length}
                       </span>
                   )}
               </TabsTrigger>
           )}
           
           <TabsTrigger value="members">Balance</TabsTrigger>
        </TabsList>
        
        {/* 1. ACTIVIDAD GLOBAL (TODO) */}
        <TabsContent value="activity">
            <TransactionList 
                transactions={transactions} 
                currentUserId={currentUserId}
                currentMemberId={myMember?.id}
                isAdmin={isAdmin}
                members={members}
                onEditTransaction={handleOpenEdit}
                categories={categories}
                viewMode="default"
            />
        </TabsContent>

        {/* 2. MIS MOVIMIENTOS (FILTRADO + VISTA "MINE") */}
        <TabsContent value="mine">
             <TransactionList 
                transactions={myTransactions} 
                currentUserId={currentUserId}
                currentMemberId={myMember?.id}
                isAdmin={isAdmin}
                members={members}
                onEditTransaction={handleOpenEdit}
                categories={categories}
                viewMode="mine" // <--- CAMBIA EL DISEÑO VISUAL
            />
        </TabsContent>
        
        {/* 3. PENDIENTES DE ASIGNAR (ADMIN ONLY) */}
        {isAdmin && (
            <TabsContent value="pending">
                 <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-800">
                    Estas transacciones no afectan al saldo de nadie todavía. Debes asignarlas a una categoría o repartirlas.
                 </div>
                 <TransactionList 
                    transactions={unallocatedTransactions} 
                    currentUserId={currentUserId}
                    currentMemberId={myMember?.id}
                    isAdmin={isAdmin}
                    members={members}
                    onEditTransaction={handleOpenEdit}
                    categories={categories}
                    viewMode="unallocated"
                />
            </TabsContent>
        )}
        
        {/* 4. BALANCE MIEMBROS */}
        <TabsContent value="members">
             {/* ... MembersBalanceList ... */}
             <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {members.map((member: any) => (
                    <MemberEquityCard 
                        key={member.id} 
                        member={member} 
                        isMe={member.user_id === currentUserId}
                    />
                ))}
             </div>
        </TabsContent>
      </Tabs>
      <TransactionFormDialog 
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          groupId={activeGroupId}
          members={members}
          categories={categories} // <--- Aquí sí tenemos categories
          currentUserMemberId={myMember?.id}
          isAdmin={isAdmin}
          transactionToEdit={editingTx}
      />
    </div>
  )
}