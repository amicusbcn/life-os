import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn, formatCurrency } from "@/lib/utils"
import { Wallet, Scale, AlertCircle, CheckCircle2, Calculator, PiggyBank, TrendingUp, TrendingDown, Building2 } from "lucide-react"

export function DashboardStats({ data, currentMemberId, isAdmin, mainBankAccountId, }: any) {
    const { accounts, members, transactions,provisions } = data
console.log("1. ID que buscamos (currentMemberId):", currentMemberId)
    console.log("2. Lista de miembros disponible:", members.map((m: any) => ({ 
        id: m.id, 
        name: m.name, 
        balance_raw: m.balance,
        balance_num: Number(m.balance)
    })))
    // 1. SALDO BANCARIO
    const mainAccount = accounts.find((a: any) => a.id === mainBankAccountId) || accounts[0]
    const mainBalance = mainAccount?.balance || 0
    const balanceDate = mainAccount?.balance_date 
        ? new Date(mainAccount.balance_date).toLocaleDateString() 
        : 'Sin fecha'

    // 2. CÁLCULO DE PROVISIONES (Nueva Lógica Robusta)
    const activeProvisions = transactions.reduce((acc: number, tx: any) => {
        return tx.is_provision ? acc + Math.abs(tx.amount) : acc
     }, 0)

    // 3. PRÉSTAMOS PENDIENTES (Saldo neto de la caja con los miembros)
    // Sumamos el pending_loans_balance de todos los miembros que viene de la vista SQL
    const totalPendingLoans = members.reduce((acc: number, m: any) => {
        return acc + (Number(m.pending_loans_balance) || 0)
    }, 0)

    // 4. PATRIMONIO REAL (La fórmula que me has pedido)
    // Saldo Principal - Provisiones + Saldo Préstamos
    // (Nota: totalPendingLoans será negativo si los miembros deben a la caja, 
    // lo cual resta al "efectivo" pero es un activo a cobrar)
    const netBalance = mainBalance - activeProvisions - totalPendingLoans

    //5. Mi saldo
    const myMemberProfile = members.find((m: any) => m.id === currentMemberId)
    // --- GESTIÓN (Logica mantenida igual) ---
    // --- GESTIÓN ---
    const pendingAllocation = transactions.filter((tx: any) => !tx.is_virtual && tx.type !== 'transfer' && (!tx.allocations || tx.allocations.length === 0))
    const pendingAllocationAmount = pendingAllocation.reduce((acc:number, tx:any) => acc + Math.abs(tx.amount), 0)

    const pendingApproval = transactions.filter((tx: any) => tx.approval_status === 'pending')
    const pendingApprovalAmount = pendingApproval.reduce((acc:number, tx:any) => acc + Math.abs(tx.amount), 0)

    const pendingJustificationRows = transactions.filter((tx: any) => tx.type === 'transfer' && !tx.parent_transaction_id && tx.amount > 0)
    let pendingJustificationCount = 0
    let pendingJustificationAmount = 0
    
    pendingJustificationRows.forEach((parent: any) => {
        const children = transactions.filter((t:any) => t.parent_transaction_id === parent.id)
        const spent = children.reduce((sum:number, c:any) => sum + Math.abs(c.amount), 0)
        const remaining = Math.abs(parent.amount) - spent
        if (remaining > 0.01) {
            pendingJustificationAmount += remaining
            pendingJustificationCount++
        }
    })

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* 1. SALDO PRINCIPAL */}
            <Card className="border-l-4 border-l-slate-600 shadow-sm bg-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {mainAccount?.name || 'Saldo Principal'}
                    </CardTitle>
                    <Building2 className="h-4 w-4 text-slate-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-slate-800">{formatCurrency(mainBalance)}</div>
                    <div className="flex justify-between items-center mt-1">
                        <p className="text-[10px] text-slate-400">Disponible operativo</p>
                        <p className="text-[9px] text-slate-300 italic">Act: {balanceDate}</p>
                    </div>
                </CardContent>
            </Card>

            {/* 2. PATRIMONIO NETO */}
            <Card className={`border-l-4 shadow-sm bg-white ${netBalance >= 0 ? 'border-l-indigo-500' : 'border-l-red-500'}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider">Patrimonio Real</CardTitle>
                    <Calculator className="h-4 w-4 text-slate-300" />
                </CardHeader>
                <CardContent>
                    {/* CIFRA PRINCIPAL */}
                    <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                        {formatCurrency(netBalance)}
                    </div>
                    
                    {/* DESGLOSE EXPLICATIVO */}
                    <div className="text-[10px] text-slate-500 mt-2 space-y-1 pt-2 border-t border-dashed border-slate-100">
                        
                        <div className="text-[10px] text-slate-500 mt-2 space-y-1 pt-2 border-t border-dashed border-slate-100">
                        {/* Banco */}
                        <div className="flex justify-between items-center">
                            <span>Saldo en {mainAccount?.name || 'Banco'}</span>
                            <span className="font-mono font-medium">{formatCurrency(mainBalance)}</span>
                        </div>

                        {/* Préstamos */}
                        <div className="flex justify-between items-center">
                            <span>Préstamos temporales</span>
                            <span className={cn("font-mono font-medium", totalPendingLoans >= 0 ? "text-amber-600" : "text-emerald-600")}>
                                {totalPendingLoans <= 0 ? '+' : '-'}{formatCurrency(Math.abs(totalPendingLoans))}
                            </span>
                        </div>

                        {/* Provisiones */}
                        {activeProvisions > 0 && (
                            <div className="flex justify-between items-center text-rose-500">
                                <span>Regalos Pendientes</span>
                                <span className="font-mono font-bold">-{formatCurrency(activeProvisions)}</span>
                            </div>
                        )}
                    </div>
                    </div>
                </CardContent>
            </Card>

            {/* 3. MI POSICIÓN */}
            <Card className={`border-l-4 shadow-sm bg-white ${myMemberProfile?.global_balance >= 0 ? "border-l-emerald-500" : "border-l-rose-500"}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mi Posición (Total)</CardTitle>
                    <Scale className="h-4 w-4 text-slate-300" />
                </CardHeader>
                <CardContent>
                    {/* SALDO GLOBAL (GRANDE) */}
                    <div className="flex items-center gap-2">
                        <div className={`text-2xl font-bold ${myMemberProfile?.global_balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {myMemberProfile?.global_balance > 0 ? '+' : ''}
                            {formatCurrency(myMemberProfile?.global_balance || 0)}
                        </div>
                        {myMemberProfile?.global_balance !== 0 && (
                            myMemberProfile?.global_balance > 0 
                                ? <TrendingUp className="h-5 w-5 text-emerald-500" /> 
                                : <TrendingDown className="h-5 w-5 text-rose-500" />
                        )}
                    </div>
                    
                    <p className="text-[10px] text-slate-500 mt-1 font-medium mb-3">
                        {myMemberProfile?.global_balance === 0 ? "Estás al día" : (myMemberProfile?.global_balance > 0 ? "Te deben en total" : "Debes en total")}
                    </p>

                    {/* SALDO ANUAL (PEQUEÑO) */}
                    <div className="pt-2 border-t border-dashed border-slate-100 flex justify-between items-center text-xs">
                        <span className="text-slate-400">Este año (2025):</span>
                        <span className={`font-mono font-medium ${myMemberProfile?.annual_balance >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                           {myMemberProfile?.annual_balance > 0 ? '+' : ''}
                           {formatCurrency(myMemberProfile?.annual_balance || 0)}
                        </span>
                    </div>
                </CardContent>
            </Card>

            {/* 4. GESTIÓN PENDIENTE (Igual que antes) */}
            {isAdmin && (
                <Card className="lg:col-span-1 border-dashed border-slate-300 bg-slate-50/50 shadow-none">
                    <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gestión</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-2">
                        {pendingAllocation.length > 0 && (
                            <div className="flex justify-between items-center text-xs bg-white p-1.5 rounded border border-slate-100 shadow-sm">
                                <span className="flex items-center gap-1.5 text-slate-600 font-medium"><AlertCircle className="h-3.5 w-3.5 text-rose-500" /> Repartir ({pendingAllocation.length})</span>
                                <span className="font-bold text-slate-700">{formatCurrency(pendingAllocationAmount)}</span>
                            </div>
                        )}
                        {pendingApproval.length > 0 && (
                            <div className="flex justify-between items-center text-xs bg-white p-1.5 rounded border border-slate-100 shadow-sm">
                                <span className="flex items-center gap-1.5 text-slate-600 font-medium"><CheckCircle2 className="h-3.5 w-3.5 text-amber-500" /> Validar ({pendingApproval.length})</span>
                                <span className="font-bold text-slate-700">{formatCurrency(pendingApprovalAmount)}</span>
                            </div>
                        )}
                        {pendingJustificationCount > 0 && (
                            <div className="flex justify-between items-center text-xs bg-white p-1.5 rounded border border-slate-100 shadow-sm">
                                <span className="flex items-center gap-1.5 text-slate-600 font-medium"><PiggyBank className="h-3.5 w-3.5 text-purple-500" /> Detallar ({pendingJustificationCount})</span>
                                <span className="font-bold text-purple-700">{formatCurrency(pendingJustificationAmount)}</span>
                            </div>
                        )}
                        {pendingAllocation.length === 0 && pendingApproval.length === 0 && pendingJustificationCount === 0 && (
                            <div className="flex flex-col items-center justify-center py-2 text-center">
                                <CheckCircle2 className="h-8 w-8 text-slate-200 mb-1" />
                                <span className="text-[10px] text-slate-400 italic">Todo al día</span>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}