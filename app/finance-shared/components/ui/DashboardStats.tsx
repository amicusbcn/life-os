import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn, formatCurrency } from "@/lib/utils"
import { Wallet, Scale, AlertCircle, CheckCircle2, Calculator, PiggyBank, TrendingUp, TrendingDown, Building2 } from "lucide-react"

export function DashboardStats({ data, currentMemberId, isAdmin, mainBankAccountId, }: any) {
    const { accounts, members, transactions } = data

    // 1. SALDO BANCARIO (La base real)
    const mainAccount = accounts.find((a: any) => a.id === mainBankAccountId) || accounts[0]
    const mainBalance = Number(mainAccount?.balance || 0)
    const balanceDate = mainAccount.balance_date
    // 2. PROVISIONES PURAS (Solo las que NO son movimientos bancarios reales todavía)
    // Filtramos transacciones que son provisión y NO vienen de una importación bancaria
    const theoreticalProvisions = transactions.reduce((acc: number, tx: any) => {
        return (tx.is_provision && !tx.import_id) ? acc + Math.abs(tx.amount) : acc
    }, 0)

    // 3. PRÉSTAMOS EXTERNOS (Dinero fuera que volverá)
    // Sumamos solo la parte de "Préstamos Puros" de los miembros (debug_loans de la vista)
    const totalPendingLoans = members.reduce((acc: number, m: any) => acc + (Number(m.debug_loans) || 0), 0)

    // 4. DEUDA POR REEMBOLSOS (Dinero que el grupo debe soltar a corto plazo)
    // Sumamos lo que los miembros tienen como reimbursement_status = 'pending'
    const totalPendingReimbursements = members.reduce((acc: number, m: any) => acc + (Number(m.reimbursements_pte) || 0), 0)

    // 5. PATRIMONIO REAL
    // Banco + Lo que nos deben - Lo que debemos devolver a miembros - Provisiones futuras
    const netBalance = mainBalance + totalPendingLoans - totalPendingReimbursements - theoreticalProvisions

    // 5. MI POSICIÓN
    const myMemberProfile = members.find((m: any) => m.id === currentMemberId)

    // --- LÓGICA DE GESTIÓN (Mantenida) ---
    const pendingAllocation = transactions.filter((tx: any) => !tx.is_virtual && tx.type !== 'transfer' && (!tx.allocations || tx.allocations.length === 0))
    const pendingAllocationAmount = pendingAllocation.reduce((acc:number, tx:any) => acc + Math.abs(tx.amount), 0)
    const pendingApproval = transactions.filter((tx: any) => tx.approval_status === 'pending')
    const pendingApprovalAmount = pendingApproval.reduce((acc:number, tx:any) => acc + Math.abs(tx.amount), 0)

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* 1. DISPONIBLE EN BANCO */}
            <Card className="border-l-4 border-l-slate-600 shadow-sm bg-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {mainAccount?.name || 'Banco'}
                    </CardTitle>
                    <Building2 className="h-4 w-4 text-slate-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-slate-800">{formatCurrency(mainBalance)}</div>
                    <p className="text-[10px] text-slate-400 mt-1 italic">Actualizado: {balanceDate}</p>
                </CardContent>
            </Card>

            {/* 2. PATRIMONIO REAL (La verdad contable) */}
            <Card className={`border-l-4 shadow-sm bg-white ${netBalance >= 0 ? 'border-l-indigo-500' : 'border-l-red-500'}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider">Caja Proyectada</CardTitle>
                    <Calculator className="h-4 w-4 text-slate-300" />
                </CardHeader>
                <CardContent>
                    <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                        {formatCurrency(netBalance)}
                    </div>
                    
                    <div className="text-[10px] text-slate-500 mt-2 space-y-1 pt-2 border-t border-dashed border-slate-100">
                        {/* Banco: La base */}
                        <div className="flex justify-between items-center">
                            <span>Saldo Bancario</span>
                            <span className="font-mono">{formatCurrency(mainBalance)}</span>
                        </div>

                        {/* Préstamos: Activo */}
                        {totalPendingLoans > 0 && (
                            <div className="flex justify-between items-center text-emerald-600">
                                <span>Préstamos a cobrar</span>
                                <span className="font-mono">+{formatCurrency(totalPendingLoans)}</span>
                            </div>
                        )}

                        {/* Reembolsos: Pasivo */}
                        {totalPendingReimbursements > 0 && (
                            <div className="flex justify-between items-center text-rose-500">
                                <span>Reembolsos a miembros</span>
                                <span className="font-mono">-{formatCurrency(totalPendingReimbursements)}</span>
                            </div>
                        )}

                        {/* Provisiones: Compromiso futuro */}
                        {theoreticalProvisions > 0 && (
                            <div className="flex justify-between items-center text-rose-400 italic">
                                <span>Provisiones (no bancarias)</span>
                                <span className="font-mono">-{formatCurrency(theoreticalProvisions)}</span>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* 3. MI POSICIÓN INDIVIDUAL */}
            <Card className={`border-l-4 shadow-sm bg-white ${myMemberProfile?.global_balance >= 0 ? "border-l-emerald-500" : "border-l-rose-500"}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mi Saldo Total</CardTitle>
                    <Scale className="h-4 w-4 text-slate-300" />
                </CardHeader>
                <CardContent>
                    <div className={`text-2xl font-bold flex items-center gap-2 ${myMemberProfile?.global_balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatCurrency(myMemberProfile?.global_balance || 0)}
                        {myMemberProfile?.global_balance !== 0 && (
                            myMemberProfile?.global_balance > 0 
                                ? <TrendingUp className="h-4 w-4" /> 
                                : <TrendingDown className="h-4 w-4" />
                        )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                        {myMemberProfile?.global_balance >= 0 ? "A tu favor" : "Debes al grupo"}
                    </p>
                </CardContent>
            </Card>

            {/* 4. GESTIÓN (ADMIN) */}
            {isAdmin && (
                <Card className="border-l-4 border-l-amber-400 bg-slate-50/50 shadow-none">
                    <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bandeja de Entrada</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-2">
                        {/* Indicadores rápidos de gestión */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-medium text-slate-500">
                                {pendingAllocation.length} pendientes de repartir
                            </span>
                            <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                                <div className="bg-amber-400 h-full" style={{ width: '40%' }}></div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}