import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { formatCurrency, cn } from "@/lib/utils"
import { History, ArrowDownToLine, ArrowUpFromLine, HandCoins, Info } from "lucide-react"

export function MemberEquityCard({ member, isMe, year }: any) {
    // MAPEÓ DE LA NUEVA VISTA SQL
    // 1. Aportaciones (Ingresos + Gastos donados)
    const annualPaid = member.debug_allocated_income || 0
    
    // 2. Consumo (Gastos confirmados + Gastos pendientes/cubos)
    const annualConsumed = member.debug_consumed || 0
    
    // 3. Préstamos (Saldo histórico de préstamos + reembolsos pendientes)
    const pendingLoanAmount = member.debug_loans || 0
    
    // 4. Balance Global (El que manda en la cabecera)
    const globalBalance = member.global_balance || 0

    // LOGICA DE VISIBILIDAD
    const hasPendingLoans = Math.abs(pendingLoanAmount) > 0.01
    const hasActivity = Math.abs(annualPaid) > 0.01 || Math.abs(annualConsumed) > 0.01 || hasPendingLoans

    return (
        <Card className={cn(
            "relative overflow-hidden transition-all hover:shadow-md", 
            isMe ? "border-slate-800 ring-1 ring-slate-800" : "border-slate-200"
        )}>
            <CardHeader className="pb-4 flex flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                        <AvatarFallback className={cn("font-bold text-white", isMe ? "bg-slate-800" : "bg-slate-400")}>
                            {member.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            {member.name} 
                            {isMe && <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded-full text-slate-500 font-normal">Tú</span>}
                        </CardTitle>
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Estado de Cuenta</p>
                    </div>
                </div>

                {/* SALDO GLOBAL (El resultado final de la caja) */}
                <div className="text-right">
                    <span className={cn("text-2xl font-black tracking-tighter", globalBalance >= 0 ? "text-emerald-600" : "text-rose-600")}>
                        {globalBalance > 0 ? '+' : ''}{formatCurrency(globalBalance)}
                    </span>
                </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
                {/* DESGLOSE ACTIVIDAD */}
                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100/50">
                        <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-bold uppercase mb-1">
                            <ArrowUpFromLine className="h-3 w-3" /> Aportado
                        </div>
                        <span className="text-lg font-bold text-emerald-800 tracking-tight">
                            {formatCurrency(annualPaid)}
                        </span>
                    </div>

                    <div className="bg-rose-50/50 rounded-xl p-3 border border-rose-100/50">
                        <div className="flex items-center gap-1.5 text-[10px] text-rose-700 font-bold uppercase mb-1">
                            <ArrowDownToLine className="h-3 w-3" /> Gastado
                        </div>
                        <span className="text-lg font-bold text-rose-800 tracking-tight">
                            {formatCurrency(annualConsumed)}
                        </span>
                    </div>
                </div>

                {/* PRÉSTAMOS Y REEMBOLSOS */}
                {hasPendingLoans && (
                    <div className={cn(
                        "flex justify-between items-center px-3 py-2 rounded-lg border",
                        pendingLoanAmount > 0 ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"
                    )}>
                        <span className={cn("flex items-center gap-2 text-[10px] font-bold uppercase", pendingLoanAmount > 0 ? "text-emerald-700" : "text-amber-700")}>
                            <HandCoins className="h-3.5 w-3.5" /> 
                            {pendingLoanAmount > 0 ? 'A cobrar' : 'A pagar'}
                        </span>
                        <span className={cn("text-xs font-black", pendingLoanAmount > 0 ? "text-emerald-600" : "text-amber-600")}>
                            {formatCurrency(Math.abs(pendingLoanAmount))}
                        </span>
                    </div>
                )}

                {/* SALDO INICIAL / PREVIO */}
                <div className="pt-3 border-t border-dashed border-slate-200">
                    <div className="flex justify-between items-center text-[10px]">
                        <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                            <History className="h-3.5 w-3.5" /> Saldo Inicial:
                        </span>
                        <span className="font-bold text-slate-500">
                            {formatCurrency(member.initial_balance || 0)}
                        </span>
                    </div>
                </div>

                {!hasActivity && (
                     <div className="text-center pt-2">
                        <span className="text-[10px] text-slate-400 italic">Sin movimientos en el histórico</span>
                     </div>
                )}
            </CardContent>
        </Card>
    )
}