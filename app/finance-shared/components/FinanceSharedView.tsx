// /app/finance-shared/components/FinanceSharedView.tsx
'use client'

import React, { useState, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { SharedGroup, DashboardData } from "@/types/finance-shared"

// --- DIALOGS IMPORTS ---
import { TransactionFormDialog } from "./dialogs/TransactionFormDialog"
import { TransactionDetailDialog } from "./dialogs/TransactionDetailDialog" // <--- NUEVO
import { JustificationDialog } from "./dialogs/JustificationDialog"         // <--- NUEVO
import { GroupSettingsDialog } from "./dialogs/GroupSettingsDialog"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Search, Plus, Settings, HandCoins } from "lucide-react"

// UI COMPONENTS
import { SharedTransactionRow } from "./ui/SharedTransactionRow" 
import { DashboardStats } from "./ui/DashboardStats"
import { YearNavigator } from "./ui/YearNavigator"
import { MemberEquityCard } from "./ui/MemberEquityCard"

// CONTEXTO
import { useImpersonation } from "./ui/ImpersonationContext"
import { toast } from "sonner"

interface Props {
    groups: SharedGroup[]
    activeGroupId: string
    dashboardData: DashboardData
    // currentUserId ya no es necesario aquí, lo coge el contexto
}

export function FinanceSharedView({ groups, activeGroupId, dashboardData }: Props) {
    const searchParams = useSearchParams()
    const currentYear = Number(searchParams.get('year')) || new Date().getFullYear()

    // --- ESTADOS DE UI (Filtros) ---
    const [searchTerm, setSearchTerm] = useState('')
    const [filterAccount, setFilterAccount] = useState('all')
    const [activeTab, setActiveTab] = useState('general')
    
    // --- ESTADOS DE DIÁLOGOS ---
    const [isFormOpen, setIsFormOpen] = useState(false) // Crear/Editar
    const [detailTx, setDetailTx] = useState<any>(null) // Ver detalle
    const [justifyTx, setJustifyTx] = useState<any>(null) // Justificar cubo
    
    // Estado auxiliar para pasar datos al FormDialog cuando venimos de editar
    const [editingTx, setEditingTx] = useState<any>(null)

    // --- DATOS SEGUROS ---
    const safeData = dashboardData || { accounts: [], members: [], categories: [], stats: {}, transactions: [], splitTemplates: [] }
    const { members, categories, accounts, splitTemplates } = safeData
    const rawTransactions = (safeData as any).transactions || [] 
    const mainBankAccountId = groups.find(g => g.id === activeGroupId)?.default_account_id || '';

    // --- PERMISOS (IMPERSONATION) ---
    const { activeMember } = useImpersonation()    
    const isAdmin = activeMember?.role === 'admin'
    
    // Identificar mis cuentas
    const myResponsibleAccountIds = accounts
        .filter((a: any) => a.responsible_member_id === activeMember?.id)
        .map((a: any) => a.id)
    const isCardOwner = myResponsibleAccountIds.length > 0

    // --- LÓGICA DEL CUBO (PROCESAMIENTO) ---
    const processedTransactions = useMemo(() => {
        const result: any[] = []
        const transfersMap = new Map<string, any>()
        const childrenMap = new Map<string, any[]>()

        rawTransactions.forEach((tx: any) => {
            // A. CONTENEDOR (Solo entradas positivas a cuenta que son transferencias sin padre)
            if (tx.type === 'transfer' && !tx.parent_transaction_id && tx.amount > 0) {
                transfersMap.set(tx.id, { ...tx })
                return 
            } 
            // B. HIJO
            if (tx.parent_transaction_id) {
                const list = childrenMap.get(tx.parent_transaction_id) || []
                list.push(tx)
                childrenMap.set(tx.parent_transaction_id, list)
                result.push(tx) 
                return
            } 
            // C. NORMAL
            result.push(tx) 
        })

        // Generar filas virtuales
        transfersMap.forEach((parentTx, id) => {
            const children = childrenMap.get(id) || []
            const spentAmount = children.reduce((sum, child) => sum + Math.abs(child.amount), 0)
            const totalLoad = Math.abs(parentTx.amount)
            const remaining = totalLoad - spentAmount

            if (remaining > 0.01) {
                
                // 🧠 LÓGICA INTELIGENTE: ¿Cuál de los dos IDs es la Tarjeta?
                const acc1 = accounts.find((a:any) => a.id === parentTx.account_id)
                const acc2 = accounts.find((a:any) => a.id === parentTx.transfer_account_id)
                
                let targetAccountId = parentTx.account_id // Fallback por defecto

                // Función auxiliar para detectar nombres de tarjeta
                const isCardName = (name: string) => /visa|tarjeta|card|mastercard/i.test(name || '')

                if (acc2 && isCardName(acc2.name)) {
                    // Si el ID de transferencia es la Visa (tu caso actual), usamos ese
                    targetAccountId = acc2.id
                } else if (acc1 && isCardName(acc1.name)) {
                    // Si el ID principal fuera la Visa, usamos ese
                    targetAccountId = acc1.id
                }
                // -------------------------------------

                result.push({
                    id: `virtual-${parentTx.id}`,
                    original_id: parentTx.id,
                    not_detailed: true,
                    date: parentTx.date,
                    description: `Pendiente de Detallar (${parentTx.description})`,
                    amount: -remaining, 
                    type: 'expense',
                    allocations: members.map(m => ({ member_id: m.id, amount: remaining / members.length })),
                    category: { name: 'Sin detallar', icon_name: 'reditCard', color: '#f59e0b' },
                    
                    // AHORA SÍ: Usamos el ID de la tarjeta detectada
                    account_id: targetAccountId,
                    
                    // Y actualizamos el objeto padre para que el diálogo reciba el ID bueno
                    parent_obj: { ...parentTx, account_id: targetAccountId } 
                })
            }
        })
        
        return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }, [rawTransactions, members])

    // --- OCULTAMOS LOS PRÉSTAMOS DEVUELTOS

    const visibleTransactions = useMemo(() => {
        // 1. Tomamos las transacciones procesadas (con cubos, etc.)
        // 2. Filtramos las que tienen el vínculo de deuda cerrado
        return processedTransactions.filter(tx => {
            // REGLA: Si tiene debt_link_id, es un préstamo saldado o una devolución vinculada.
            // Lo ocultamos del listado principal para limpiar el ruido.
            if (tx.debt_link_id) {
                return false;
            }
            return true;
        });
    }, [processedTransactions]);

    // --- FILTRADO POR PESTAÑAS ---
    const getTabTransactions = (tab: string) => {
        let data = visibleTransactions

        // Filtros Globales
        data = data.filter(tx => {
            if (filterAccount !== 'all' && tx.account_id !== filterAccount) return false
            if (searchTerm && !tx.description.toLowerCase().includes(searchTerm.toLowerCase())) return false
            return true
        })

        switch (tab) {
            case 'mine':
                if (!activeMember) return []
                return data.filter(tx => {
                    // 1. Soy el pagador?
                    const isPayer = tx.payer_member_id === activeMember.id 
                    
                    // 2. Estoy incluido en el reparto?
                    const isAllocated = tx.allocations?.some((a: any) => a.member_id === activeMember.id )
                    
                    // 3. Es un gasto "huérfano" (sin allocations) que no sea provisión ni pendiente?
                    // (Esto coincide con la lógica de cálculo proporcional 1/N)
                    const hasNoAllocations = !tx.allocations || tx.allocations.length === 0
                    const isExpenseOrTransfer = tx.type === 'expense' || tx.type === 'transfer'
                    const isValidForSplit = !tx.is_provision && tx.status !== 'pending'
                    
                    const isProportionalSplit = hasNoAllocations && isExpenseOrTransfer && isValidForSplit

                    // CONDICIÓN FINAL:
                    return isPayer || isAllocated || isProportionalSplit
                })
            case 'pending_justification':
                const notDetailed = data.filter(tx => tx.not_detailed)
                if (isAdmin) return notDetailed
                if (isCardOwner) return notDetailed.filter(tx => myResponsibleAccountIds.includes(tx.account_id))
                return []
            case 'pending_allocation':
                if (!isAdmin) return [] 
                return data.filter(tx => !tx.not_detailed && tx.type !== 'transfer' && (!tx.allocations || tx.allocations.length === 0))
            case 'pending_approval':
                if (!isAdmin) return []
                return data.filter(tx => tx.status === 'pending')
            default: // 'general'
                // Ocultamos transferencias internas puras para no ensuciar, salvo que filtren
                return data
        }
    }

    // Agrupación Mes
    const groupTransactions = (txs: any[]) => {
        const groups: { [key: string]: any[] } = {}
        txs.forEach(tx => {
            const date = new Date(tx.date)
            const key = date.toLocaleString('es-ES', { month: 'long', year: 'numeric' })
            const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1)
            if (!groups[capitalizedKey]) groups[capitalizedKey] = []
            groups[capitalizedKey].push(tx)
        })
        return groups
    }

    const currentTabTransactions = getTabTransactions(activeTab)
    const groupedView = groupTransactions(currentTabTransactions)

    // --- CONTADORES (BADGES) ---
    const tabCounts = useMemo(() => {
        const allnotDetailed = visibleTransactions.filter(tx => tx.not_detailed)
        let justificationCount = 0
        if (isAdmin) justificationCount = allnotDetailed.length
        else if (isCardOwner) justificationCount = allnotDetailed.filter(tx => myResponsibleAccountIds.includes(tx.account_id)).length

        const allocationCount = isAdmin ? visibleTransactions.filter(tx => !tx.not_detailed && tx.type !== 'transfer' && (!tx.allocations || tx.allocations.length === 0)).length : 0
        const approvalCount = isAdmin ? visibleTransactions.filter(tx => tx.status === 'pending').length : 0

        return { justification: justificationCount, allocation: allocationCount, approval: approvalCount }
    }, [visibleTransactions, isAdmin, isCardOwner, myResponsibleAccountIds])


    // --- HANDLERS CLICS ---

    // 1. Click en "Nuevo Movimiento" -> Abre Form Vacío
    const handleNewClick = () => {
        setEditingTx(null)
        setIsFormOpen(true)
    }

    // 2. Click en Fila -> Decide qué abrir
    const handleRowClick = (tx: any) => {
        if (tx.not_detailed) {
            // A. ES UN CUBO -> Abrir Justificador
            // Necesitamos el objeto real del padre, que guardamos en parent_obj
            setJustifyTx(tx.parent_obj) 
        } else {
            // B. ES NORMAL -> Abrir Detalle (Solo Lectura inicial)
            setDetailTx(tx)
        }
    }

    // 3. Click "Editar" desde el Detalle
    const handleEditFromDetail = () => {
        setEditingTx(detailTx) // Pasamos la transacción actual al form
        setDetailTx(null)      // Cerramos detalle
        setIsFormOpen(true)    // Abrimos form
    }

    const handleNextDetail = () => {
    if (!detailTx) return;
    // Cambiado 'transactions' por 'rawTransactions'
    const currentIndex = rawTransactions.findIndex((t: any) => t.id === detailTx.id);
    if (currentIndex !== -1 && currentIndex < rawTransactions.length - 1) {
        setDetailTx(rawTransactions[currentIndex + 1]);
    } else {
        toast.info("Es el último movimiento de la lista");
    }
};

const handlePrevDetail = () => {
    if (!detailTx) return;
    // Cambiado 'transactions' por 'rawTransactions'
    const currentIndex = rawTransactions.findIndex((t: any) => t.id === detailTx.id);
    if (currentIndex > 0) {
        setDetailTx(rawTransactions[currentIndex - 1]);
    } else {
        toast.info("Es el primer movimiento de la lista");
    }
};

    return (
        <div className="space-y-6 pb-20">
            
            {/* HEADER */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold tracking-tight">Finanzas Compartidas</h1>
                    <YearNavigator currentYear={currentYear} />
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleNewClick} className="gap-2 bg-slate-900 text-white hover:bg-slate-800">
                        <Plus className="h-4 w-4" /> Nuevo Movimiento
                    </Button>
                </div>
            </div>

            {/* DASHBOARD */}
            <DashboardStats data={safeData} currentMemberId={activeMember?.id}  mainBankAccountId={mainBankAccountId} />

            {/* TABS Y LISTADO */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <TabsList className="flex flex-wrap h-auto">
                        <TabsTrigger value="general">General</TabsTrigger>
                        <TabsTrigger value="mine">Mis Movimientos</TabsTrigger>
                        
                        {tabCounts.justification > 0 && (
                            <TabsTrigger value="pending_justification" className="data-[state=active]:text-amber-700 data-[state=active]:bg-amber-50 gap-2">
                                Pte. Justificar
                                <span className="flex items-center justify-center bg-amber-200 text-amber-800 text-[10px] font-bold h-5 w-5 rounded-full">{tabCounts.justification}</span>
                            </TabsTrigger>
                        )}
                        {tabCounts.allocation > 0 && (
                            <TabsTrigger value="pending_allocation" className="gap-2">
                                Pte. Asignar
                                <span className="flex items-center justify-center bg-red-100 text-red-700 text-[10px] font-bold h-5 w-5 rounded-full">{tabCounts.allocation}</span>
                            </TabsTrigger>
                        )}
                        {tabCounts.approval > 0 && (
                            <TabsTrigger value="pending_approval" className="gap-2">
                                Pte. Aprobar
                                <span className="flex items-center justify-center bg-indigo-100 text-indigo-700 text-[10px] font-bold h-5 w-5 rounded-full">{tabCounts.approval}</span>
                            </TabsTrigger>
                        )}
                        <TabsTrigger value="balances">Saldos</TabsTrigger>
                        {isAdmin && (
                            <TabsTrigger value="debt_history" className="gap-2 border-l ml-2 pl-4">
                                <HandCoins className="h-3.5 w-3.5" /> Préstamos
                            </TabsTrigger>
                        )}
                    </TabsList>

                    {/* FILTROS */}
                    {activeTab !== 'balances' && (
                        <div className="flex gap-2 items-center w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-[200px]">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                                <Input placeholder="Buscar..." className="pl-8 h-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
                            </div>
                            <Select value={filterAccount} onValueChange={setFilterAccount}>
                                <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Cuenta" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas</SelectItem>
                                    {accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>

                {/* CONTENIDO LISTAS */}
                {['general', 'mine', 'pending_justification', 'pending_allocation', 'pending_approval'].map(tabName => (
                    <TabsContent key={tabName} value={tabName} className="mt-0">
                         <div className="space-y-6">
                            {Object.keys(groupedView).length === 0 ? (
                                <div className="text-center py-10 text-slate-400 border border-dashed rounded-lg bg-slate-50/50">No hay movimientos.</div>
                            ) : (
                                Object.entries(groupedView).map(([month, txs]) => (
                                    <div key={month} className="space-y-2">
                                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider pl-1 sticky top-0 bg-slate-50/95 py-2 z-10 w-full backdrop-blur-sm border-b mb-2">{month}</h3>
                                        <div className="space-y-2">
                                            {txs.map((tx: any) => (
                                                <div key={tx.id} onClick={() => handleRowClick(tx)} className="cursor-pointer">
                                                    <SharedTransactionRow 
                                                        transaction={tx} 
                                                        members={members}
                                                        category={tx.category} 
                                                        account={accounts.find((a: any) => a.id === tx.account_id)}
                                                        currentMemberId={activeMember?.id}
                                                        viewPersonal={activeTab === 'mine'}
                                                        splitTemplates={splitTemplates}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </TabsContent>
                ))}

                <TabsContent value="balances">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {members.map((member: any) => (
                            <MemberEquityCard key={member.id} member={member} isMe={member.user_id === activeMember?.user_id} />
                        ))}
                    </div>
                </TabsContent>
                <TabsContent value="debt_history">
                    <div className="space-y-4">
                        <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-lg text-xs text-indigo-700 italic">
                            Aquí aparecen los préstamos y devoluciones que ya han sido vinculados y saldados.
                        </div>
                        {processedTransactions
                            .filter(tx => !!tx.debt_link_id)
                            .map(tx => (
                                <SharedTransactionRow 
                                    transaction={tx} 
                                    members={members}
                                    category={tx.category} 
                                    account={accounts.find((a: any) => a.id === tx.account_id)}
                                    currentMemberId={activeMember?.id}
                                    viewPersonal={activeTab === 'mine'}
                                    splitTemplates={splitTemplates}
                                />
                            ))}
                    </div>
                </TabsContent>
            </Tabs>

            {/* --- DIÁLOGOS --- */}

            {/* 1. VISOR DETALLE */}
            <TransactionDetailDialog 
                key={detailTx?.id ? `detail-${detailTx.id}` : 'detail-none'}
                open={!!detailTx}
                transaction={detailTx}
                onClose={() => setDetailTx(null)}
                members={members}
                categories={categories}
                accounts={accounts} // O rawAccounts si te da error
                isAdmin={isAdmin}
                onEdit={handleEditFromDetail}
                splitTemplates={splitTemplates}
                onNext={handleNextDetail}
                onPrev={handlePrevDetail}
                // Buscamos dinámicamente el ID de la cuenta bancaria principal
                mainBankAccountId={mainBankAccountId}
            />

            {/* 2. GESTOR DE CUBOS */}
            <JustificationDialog 
                open={!!justifyTx}
                onOpenChange={(val: boolean) => !val && setJustifyTx(null)}
                parentTransaction={justifyTx}
                groupId={activeGroupId}
                categories={categories}
                members={members}
            />

            {/* 3. FORMULARIO CREAR/EDITAR */}
            <TransactionFormDialog 
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                groupId={activeGroupId}
                mainBankAccountId={mainBankAccountId}
                members={members}
                categories={categories}
                accounts={accounts}
                transactionToEdit={editingTx}
                splitTemplates={splitTemplates || []}
                allTransactions={visibleTransactions}
            />

        </div>
    )
}