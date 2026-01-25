import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { formatCurrency, cn } from "@/lib/utils"
import { History, ArrowDownToLine, ArrowUpFromLine, HandCoins } from "lucide-react"

export function MemberEquityCard({ member, isMe, year }: any) {
    const annualBalance = member.annual_balance || 0
    const annualPaid = member.annual_paid || 0
    const annualConsumed = member.annual_consumed || 0
    
    // Préstamos Pendientes (Debt)
    const pendingLoanAmount = member.debug_loans || 0
    const hasPendingLoans = Math.abs(pendingLoanAmount) > 0.01

    // Deuda Histórica Total
    const globalBalance = member.global_balance || 0
    const hasGlobalDebt = Math.abs(globalBalance) > 0.01

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
                        {/* Ahora el año es dinámico según la prop 'year' */}
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Balance {year || 2025}</p>
                    </div>
                </div>

                {/* 1. SALDO ANUAL (Ahora en la cabecera) */}
                <span className={cn("text-2xl font-black tracking-tighter", annualBalance >= 0 ? "text-emerald-600" : "text-rose-600")}>
                    {annualBalance > 0 ? '+' : ''}{formatCurrency(annualBalance)}
                </span>
            </CardHeader>
            
            <CardContent className="space-y-4">
                {/* 2. DESGLOSE ACTIVIDAD (ANUAL) */}
                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100/50">
                        <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-bold uppercase mb-1">
                            <ArrowUpFromLine className="h-3 w-3" /> Aportado
                        </div>
                        <span className="text-lg font-bold text-emerald-800 tracking-tight">{formatCurrency(annualPaid)}</span>
                    </div>

                    <div className="bg-rose-50/50 rounded-xl p-3 border border-rose-100/50">
                        <div className="flex items-center gap-1.5 text-[10px] text-rose-700 font-bold uppercase mb-1">
                            <ArrowDownToLine className="h-3 w-3" /> Gastado
                        </div>
                        <span className="text-lg font-bold text-rose-800 tracking-tight">{formatCurrency(annualConsumed)}</span>
                    </div>
                </div>

                {/* 3. LÍNEA OPCIONAL: PRÉSTAMOS PENDIENTES */}
                {hasPendingLoans && (
                    <div className="flex justify-between items-center px-3 py-2 bg-amber-50/50 border border-amber-100 rounded-lg">
                        <span className="flex items-center gap-2 text-[10px] text-amber-700 font-bold uppercase">
                            <HandCoins className="h-3.5 w-3.5" /> Préstamos pte:
                        </span>
                        <span className={cn("text-xs font-bold", pendingLoanAmount > 0 ? "text-emerald-600" : "text-amber-600")}>
                            {pendingLoanAmount > 0 ? 'Te deben: ' : 'Debes: '}
                            {formatCurrency(Math.abs(pendingLoanAmount))}
                        </span>
                    </div>
                )}

                {/* 4. ACUMULADO TOTAL */}
                <div className="pt-3 border-t border-dashed border-slate-200">
                    <div className="flex justify-between items-center text-xs">
                        <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                            <History className="h-3.5 w-3.5" /> Acumulado Total:
                        </span>
                        <span className={cn("font-bold", globalBalance >= 0 ? "text-emerald-600" : "text-rose-500")}>
                            {globalBalance > 0 ? '+' : ''}{formatCurrency(globalBalance)}
                        </span>
                    </div>
                </div>

                {/* Estado vacío */}
                {!hasGlobalDebt && annualBalance === 0 && annualPaid === 0 && !hasPendingLoans && (
                     <div className="text-center pt-2">
                        <span className="text-[10px] text-slate-400 italic">Sin actividad registrada</span>
                     </div>
                )}
            </CardContent>
        </Card>
    )
}