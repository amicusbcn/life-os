// /app/finance-shared/components/FinanceSharedView.tsx
'use client'

import React, { useState, useMemo, useEffect } from "react"
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
import { Search, Plus, Settings, HandCoins, AlertCircle, Clock, CheckCircle2 } from "lucide-react"

// UI COMPONENTS
import { SharedTransactionRow } from "./ui/SharedTransactionRow" 
import { DashboardStats } from "./ui/DashboardStats"
import { YearNavigator } from "./ui/YearNavigator"
import { MemberEquityCard } from "./ui/MemberEquityCard"

// CONTEXTO
import { useImpersonation } from "./ui/ImpersonationContext"
import { toast } from "sonner"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

interface Props {
    groups: SharedGroup[]
    activeGroupId: string
    dashboardData: DashboardData
    // currentUserId ya no es necesario aquí, lo coge el contexto
}

export function FinanceSharedView({ groups, activeGroupId, dashboardData }: Props) {
    const searchParams = useSearchParams()
    const activeTab = searchParams.get('view') || 'dashboard'
    const currentYear = Number(searchParams.get('year')) || new Date().getFullYear()

    useEffect(() => {
        const handleOpenNew = () => handleNewClick()
        window.addEventListener('open-new-tx', handleOpenNew)
        return () => window.removeEventListener('open-new-tx', handleOpenNew)
    }, [])
    
    // --- ESTADOS DE UI (Filtros) ---
    const [searchTerm, setSearchTerm] = useState('')
    const [filterAccount, setFilterAccount] = useState('all')
    
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
    //NAVEGACION DEL DETALLE
    const currentIndex = detailTx 
    ? currentTabTransactions.findIndex((t: any) => t.id === detailTx.id) 
    : -1;
    const handleNextDetail = () => {
        if (currentIndex < currentTabTransactions.length - 1) {
                setDetailTx(currentTabTransactions[currentIndex + 1]);
        }
    };
    
    const handlePrevDetail = () => {
        if (currentIndex > 0) {
                setDetailTx(currentTabTransactions[currentIndex - 1]);
        }
    };

    return (
        <div className="space-y-6 pb-20">
            {/* 1. VISTA DASHBOARD (Análisis) */}
            {activeTab === 'dashboard' && (
                <div className="space-y-6">
                    <DashboardStats 
                        data={safeData} 
                        currentMemberId={activeMember?.id} 
                        mainBankAccountId={mainBankAccountId} 
                    />
                    {/* Aquí irán los gráficos futuros */}
                </div>
            )}

            {/* 2. VISTA BALANCES (Saldos) */}
            {activeTab === 'balances' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {members.map((member: any) => (
                        <MemberEquityCard key={member.id} member={member} isMe={member.user_id === activeMember?.user_id} />
                    ))}
                </div>
            )}

            {/* 3. VISTAS DE LISTADO (General, Mis Gastos, Pendientes) */}
            {(activeTab === 'general' || activeTab === 'mine' ) && (
                <div className="space-y-6">
                    {/* FILTROS: Solo aparecen aquí */}
                    <div className="flex gap-2 items-center w-full sm:w-auto bg-white p-2 rounded-xl border shadow-sm">
                        <div className="relative flex-1 sm:w-[250px]">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                            <Input 
                                placeholder="Buscar concepto..." 
                                className="pl-9 h-9 border-none bg-slate-50 focus-visible:ring-1" 
                                value={searchTerm} 
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* LISTADO AGRUPADO */}
                    <div className="space-y-8">
                        {Object.entries(groupedView).map(([month, txs]) => (
                            <div key={month} className="space-y-3">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] pl-1 border-b pb-2">{month}</h3>
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
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'pending' && (
                <Accordion type="multiple" defaultValue={["approval", "allocation", "justification"]} className="space-y-4">
                    
                    {/* SECCIÓN 1: PENDIENTES DE APROBAR */}
                    {isAdmin && tabCounts.approval > 0 && (
                        <AccordionItem value="approval" className="bg-white rounded-xl border shadow-sm px-4">
                            <AccordionTrigger className="hover:no-underline">
                                <div className="flex items-center gap-2 text-indigo-600">
                                    <Clock className="h-4 w-4" />
                                    <span className="text-sm font-bold uppercase tracking-tight">
                                        Esperando validación ({tabCounts.approval})
                                    </span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 pb-4 space-y-2">
                                {visibleTransactions.filter(tx => tx.status === 'pending').map(tx => (
                                    <div key={tx.id} onClick={() => handleRowClick(tx)} className="cursor-pointer">
                                        <SharedTransactionRow 
                                                transaction={tx} 
                                                members={members}
                                                category={tx.category} 
                                                account={accounts.find((a: any) => a.id === tx.account_id)}
                                                currentMemberId={activeMember?.id}
                                                splitTemplates={splitTemplates}
                                            />
                                    </div>
                                ))}
                            </AccordionContent>
                        </AccordionItem>
                    )}

                    {/* SECCIÓN 2: PENDIENTES DE ASIGNAR */}
                    {isAdmin && tabCounts.allocation > 0 && (
                        <AccordionItem value="allocation" className="bg-white rounded-xl border shadow-sm px-4">
                            <AccordionTrigger className="hover:no-underline">
                                <div className="flex items-center gap-2 text-rose-600">
                                    <AlertCircle className="h-4 w-4" />
                                    <span className="text-sm font-bold uppercase tracking-tight">
                                        Gastos sin reparto ({tabCounts.allocation})
                                    </span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 pb-4 space-y-2">
                                {visibleTransactions.filter(tx => !tx.not_detailed && tx.type !== 'transfer' && (!tx.allocations || tx.allocations.length === 0)).map(tx => (
                                    <div key={tx.id} onClick={() => handleRowClick(tx)} className="cursor-pointer">
                                        <SharedTransactionRow 
                                                transaction={tx} 
                                                members={members}
                                                category={tx.category} 
                                                account={accounts.find((a: any) => a.id === tx.account_id)}
                                                currentMemberId={activeMember?.id}
                                                splitTemplates={splitTemplates}
                                            />
                                    </div>
                                ))}
                            </AccordionContent>
                        </AccordionItem>
                    )}

                    {/* SECCIÓN 3: CUBOS (Justificación) */}
                    {tabCounts.justification > 0 && (
                        <AccordionItem value="justification" className="bg-white rounded-xl border shadow-sm px-4">
                            <AccordionTrigger className="hover:no-underline">
                                <div className="flex items-center gap-2 text-amber-600">
                                    <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                                    <span className="text-sm font-bold uppercase tracking-tight">
                                        Por detallar ({tabCounts.justification})
                                    </span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 pb-4 space-y-2">
                                {visibleTransactions.filter(tx => tx.not_detailed && (!isCardOwner || myResponsibleAccountIds.includes(tx.account_id))).map(tx => (
                                    <div key={tx.id} onClick={() => handleRowClick(tx)} className="cursor-pointer">
                                        <SharedTransactionRow 
                                                transaction={tx} 
                                                members={members}
                                                category={tx.category} 
                                                account={accounts.find((a: any) => a.id === tx.account_id)}
                                                currentMemberId={activeMember?.id}
                                                splitTemplates={splitTemplates}
                                            />
                                    </div>
                                ))}
                            </AccordionContent>
                        </AccordionItem>
                    )}

                    {/* ESTADO VACÍO (Fuera del Accordion) */}
                    {tabCounts.justification === 0 && tabCounts.allocation === 0 && tabCounts.approval === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-3" />
                            <p className="text-slate-900 font-bold">¡Todo al día!</p>
                        </div>
                    )}
                </Accordion>
            )}            

            {/* --- DIÁLOGOS --- */}

            {/* 1. VISOR DETALLE */}
            <TransactionDetailDialog 
                key={detailTx?.id ? `detail-${detailTx.id}` : 'detail-none'}
                open={!!detailTx}
                transaction={detailTx}
                onClose={() => setDetailTx(null)}
                members={members}
                categories={categories}
                accounts={accounts} 
                isAdmin={isAdmin}
                onEdit={handleEditFromDetail}
                splitTemplates={splitTemplates}
                onNext={handleNextDetail}
                onPrev={handlePrevDetail}
                mainBankAccountId={mainBankAccountId}
                isFirst={currentIndex === 0}
                isLast={currentIndex === currentTabTransactions.length - 1} 
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