import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { formatCurrency, cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, History, ArrowDownToLine, ArrowUpFromLine } from "lucide-react"

export function MemberEquityCard({ member, isMe }: any) {
    const annualBalance = member.annual_balance || 0
    const annualPaid = member.annual_paid || 0
    const annualConsumed = member.annual_consumed || 0
    
    // Deuda Histórica Total
    const globalBalance = member.global_balance || 0
    const hasGlobalDebt = Math.abs(globalBalance) > 0.01

    return (
        <Card className={cn(
            "relative overflow-hidden transition-all hover:shadow-md", 
            isMe ? "border-slate-800 ring-1 ring-slate-800" : "border-slate-200"
        )}>
            <CardHeader className="pb-2 flex flex-row items-center gap-3">
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
                    <p className="text-[10px] text-slate-400 font-medium">Balance 2025</p>
                </div>
            </CardHeader>
            
            <CardContent>
                {/* 1. CIFRA PRINCIPAL (SALDO ANUAL) */}
                <div className="flex items-baseline gap-2 mb-4">
                    <span className={cn("text-3xl font-bold tracking-tight", annualBalance >= 0 ? "text-emerald-600" : "text-rose-600")}>
                        {annualBalance > 0 ? '+' : ''}{formatCurrency(annualBalance)}
                    </span>
                </div>

                {/* 2. DESGLOSE INGRESOS vs GASTOS (ANUAL) */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                    {/* Aportado */}
                    <div className="bg-emerald-50 rounded-lg p-2 border border-emerald-100">
                        <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-bold uppercase mb-0.5">
                            <ArrowUpFromLine className="h-3 w-3" /> Aportado
                        </div>
                        <span className="text-sm font-bold text-emerald-800">{formatCurrency(annualPaid)}</span>
                    </div>

                    {/* Gastado */}
                    <div className="bg-rose-50 rounded-lg p-2 border border-rose-100">
                        <div className="flex items-center gap-1.5 text-[10px] text-rose-700 font-bold uppercase mb-0.5">
                            <ArrowDownToLine className="h-3 w-3" /> Gastado
                        </div>
                        <span className="text-sm font-bold text-rose-800">{formatCurrency(annualConsumed)}</span>
                    </div>
                </div>

                {/* 3. CONDICIONAL: DEUDA GLOBAL (SI EXISTE) */}
                {hasGlobalDebt && (
                    <div className="pt-3 border-t border-dashed border-slate-200">
                        <div className="flex justify-between items-center text-xs">
                            <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                                <History className="h-3.5 w-3.5" /> Acumulado Total:
                            </span>
                            <span className={cn("font-mono font-bold", globalBalance >= 0 ? "text-emerald-600" : "text-rose-500")}>
                                {globalBalance > 0 ? '+' : ''}{formatCurrency(globalBalance)}
                            </span>
                        </div>
                    </div>
                )}

                {/* Si está totalmente a cero */}
                {!hasGlobalDebt && annualBalance === 0 && annualPaid === 0 && (
                     <div className="pt-3 border-t border-dashed border-slate-200 text-center">
                        <span className="text-[10px] text-slate-400 italic">Sin actividad pendiente</span>
                     </div>
                )}

            </CardContent>
        </Card>
    )
}