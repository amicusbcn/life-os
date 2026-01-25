// app/finance-shared/components/ui/SharedTransactionRow.tsx

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import LoadIcon from "@/utils/LoadIcon"
import { formatCurrency, cn } from "@/lib/utils"
import { 
    AlertCircle, 
    AlertTriangle, 
    ArrowRightLeft, 
    PiggyBank, 
    Clock, 
    CreditCard, 
    Users, 
    HandCoins
} from "lucide-react"
import { SharedSplitTemplate } from "@/types/finance-shared"

interface Props {
    transaction: any
    members: any[]
    category?: any
    account?: any
    currentMemberId?: any
    viewPersonal?: boolean
    splitTemplates : SharedSplitTemplate[]
}

export function SharedTransactionRow({ 
    transaction, 
    members, 
    category, 
    account, 
    currentMemberId, 
    viewPersonal = false,
    splitTemplates
}: Props) {
    const notDetailed = transaction.not_detailed
    const dateObj = new Date(transaction.date)
    const day = dateObj.getDate()
    const month = dateObj.toLocaleString('es-ES', { month: 'short' }).toUpperCase()

    // --- LÓGICA DE ESTADO ---
    const isExpense = transaction.type === 'expense'
    const isIncome = transaction.type === 'income'
    const isTransfer = transaction.type === 'transfer'
    const isLoan = transaction.type === 'loan'
    const isProvision = transaction.is_provision
    if(isTransfer) return false;
    
    // 1. PENDIENTE DE APROBAR
    const isPendingApproval = transaction.status === 'pending'

    // 2. DETECCIÓN DE PENDIENTE DE REPARTO / JUSTIFICAR
    // - Gasto sin allocations
    // - Transferencia (supuesto gasto tarjeta) sin allocations
    const hasAllocations = transaction.allocations && transaction.allocations.length > 0
    const isPendingAllocation = !notDetailed && !isProvision && !isPendingApproval && !hasAllocations

    // Calculamos el reparto proporcional por si hace falta mostrarlo (1/N)
    const totalMembers = members.length || 1
    const proportionalAmount = Math.abs(transaction.amount) / totalMembers

    // --- FILTRADO DE RUIDO (Punto 5) ---
    // Si es una transferencia de entrada (Amount > 0) y parece ser interna (ej: pago tarjeta),
    // podrías devolver null aquí si tuvieras una forma segura de identificarla (ej: category 'Traspaso').
    // Por seguridad, no ocultamos nada "duro" aquí, pero asumimos que la lista viene filtrada.
    // Lo que sí hacemos es detectar si es el "Pago de Tarjeta" (Salida) para cambiar el icono.
    const isCardPayment = isTransfer && !hasAllocations && isExpense // Heurística: Transferencia de salida sin hijos

    // --- ESTILOS VISUALES ---

    // Color de categoría
    const catColor = category?.color || '#64748b' 

    // Importe Absoluto
    const absAmount = Math.abs(transaction.amount)
    
    // Signo visual
    let sign = ''
    if (isExpense || notDetailed || (isTransfer && transaction.amount < 0) || (isLoan && transaction.amount < 0)) sign = '-'
    if (isIncome || (isTransfer && transaction.amount > 0) || (isLoan && transaction.amount > 0)) sign = '+'
    
    // --- LÓGICA DE IMPORTES (Punto 6) ---
    // Mi Parte
    const myAllocation = transaction.allocations?.find((a: any) => a.member_id === currentMemberId)
    // Si hay allocation explícito lo usamos, si no y es proporcional pendiente, calculamos.
    // PERO: Si está pendiente de aprobar, mi parte es 0 (o interrogante).
    let myAmount = 0
    if (myAllocation) {
        myAmount = Math.abs(myAllocation.amount)
    } else if (isPendingAllocation) {
        myAmount = proportionalAmount // Mostramos lo que "te tocaría" provisionalmente
    }

    // Definimos qué es Grande y qué es Pequeño según el modo
    const totalFormatted = `${sign}${formatCurrency(absAmount)}`
    const myFormatted = `${sign}${formatCurrency(myAmount)}`

    let primaryAmount = totalFormatted
    let secondaryAmount = null
    let secondaryLabel = ""

    if ( viewPersonal) {
        // MODO PERSONAL: Grande = Mi parte, Pequeño = Total
        if (isPendingApproval) {
            primaryAmount = "Pendiente" // O 0,00 €
            secondaryAmount = totalFormatted
            secondaryLabel = "Total: "
        } else {
            primaryAmount = myFormatted
            secondaryAmount = totalFormatted
            secondaryLabel = "Total: "
        }
    } else {
        // MODO GLOBAL: Grande = Total, Pequeño = Mi parte
        primaryAmount = totalFormatted
        // Mostrar mi parte en Gastos E Ingresos (Punto 4)
        // Solo si participo o si está pendiente de asignación
        if (!isPendingApproval && (myAmount > 0 || isPendingAllocation)) {
            secondaryAmount = myFormatted
            secondaryLabel = isPendingAllocation ? "Temp: " : "Mí: "
        }
    }

    // Colores de importe
    let amountClass = "font-bold text-slate-900"
    if (isPendingApproval) amountClass = "font-bold text-slate-400"
    else if (notDetailed) amountClass = "font-bold text-amber-600"
    else if (isExpense) amountClass = "font-bold text-red-600"
    else if (isIncome) amountClass = "font-bold text-emerald-600"
    else if (isTransfer) amountClass = "font-bold text-slate-700"

    // --- RENDER ---
    return (
        <div className={cn(
            "flex items-center gap-3 p-3 rounded-lg border transition-all relative overflow-hidden group",
            // Fondo base
            notDetailed 
                ? "bg-amber-50 border-amber-200 hover:border-amber-300" 
                : isPendingApproval 
                    ? "bg-slate-50 border-slate-200 opacity-80" // (Punto 1: Grisáceo)
                    : "bg-white border-slate-100 hover:border-indigo-200 hover:shadow-sm",
            
            // Borde Izquierdo por Estado
            isPendingApproval 
                ? "border-l-4 border-l-slate-300" 
                : isPendingAllocation 
                    ? "border-l-4 border-l-red-500 bg-red-50/10" // (Punto 1 y 3)
                    : ""
        )}>
            
            {/* 1. FECHA */}
            <div className={cn(
                "flex flex-col items-center justify-center w-10 h-10 rounded-md shrink-0 border",
                notDetailed ? "bg-amber-100 border-amber-200 text-amber-700" : "bg-slate-50 border-slate-200 text-slate-500"
            )}>
                <span className="text-xs font-bold leading-none">{day}</span>
                <span className="text-[9px] uppercase leading-none mt-0.5">{month}</span>
            </div>

            {/* 2. ICONO (Punto 5: Icono de tarjeta en lugar de categoría si procede) */}
            <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                notDetailed ? "bg-amber-200 text-amber-700" : "bg-slate-100 text-slate-500"
            )} style={{ 
                // Si es pending o tarjeta, usamos colores neutros o específicos, si no, el de la categoría
                backgroundColor: isPendingApproval ? '#f1f5f9' : (isCardPayment ? '#e2e8f0' : (notDetailed ? '#fef3c7' : `${catColor}20`)),
                borderColor: isPendingApproval ? '#cbd5e1' : (notDetailed ? '#fcd34d' : `${catColor}40`),
                color: isPendingApproval ? '#94a3b8' : (isCardPayment ? '#475569' : (notDetailed ? '#b45309' : catColor))
            }}>
                {notDetailed ? (
                    <CreditCard className="h-4 w-4" />
                ) : isCardPayment ? (
                    // (Punto 5) Icono Tarjeta/Traspaso en la posición de la categoría
                    <CreditCard className="h-4 w-4" />
                ) : isLoan ? (
                    <HandCoins className="h-4 w-4" />
                ) : (
                    <LoadIcon name={category?.icon_name || 'HelpCircle'} className="h-4 w-4" />
                )}
            </div>

            {/* 3. DESCRIPCIÓN Y CUENTA */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
                {isProvision ? (
                    <div className="flex items-center gap-2">
                        <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1">
                             <PiggyBank className="h-3 w-3" /> Provisión
                        </span>
                        <span className="text-sm font-medium text-slate-700 truncate">{transaction.description}</span>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-2">
                            <span className={cn("text-sm truncate", notDetailed ? "font-bold text-amber-900" : isPendingApproval ? "text-slate-500 italic" : "font-medium text-slate-900")}>
                                {transaction.description}
                            </span>
                            
                            {/* BADGES DE ESTADO */}
                            {isPendingApproval && (
                                <span className="bg-slate-200 text-slate-500 text-[9px] font-bold px-1.5 py-0.5 rounded border border-slate-300 flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> Pendiente
                                </span>
                            )}
                            
                            {isPendingAllocation && (
                                <span className="bg-red-100 text-red-600 text-[9px] font-bold px-1.5 py-0.5 rounded border border-red-200 flex items-center gap-1 animate-pulse">
                                    <AlertTriangle className="h-3 w-3" /> Sin asignar
                                </span>
                            )}
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                            {account && (
                                <span className="flex items-center gap-1 truncate max-w-[100px] text-slate-500">
                                    {account.name}
                                </span>
                            )}
                            
                            {!notDetailed && transaction.payer_member_id && (
                                <>
                                    <span className="hidden sm:inline">•</span>
                                    <span className="truncate">Pagó: {members.find(m => m.id === transaction.payer_member_id)?.name}</span>
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* 4. REPARTO (Allocations) - OCULTO SI ESTÁ PENDIENTE DE APROBAR */}
            {!isPendingApproval && (
                <div className="hidden sm:flex items-center justify-end w-28 shrink-0">
                    {isPendingAllocation ? (
                        // (Punto 2 y 3) Pendiente de reparto: Mostrar previsión en pequeño
                        <div className="flex flex-col items-end text-xs text-slate-400">
                            <div className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-full mb-0.5">
                                <Users className="h-3 w-3" />
                                <span className="text-[10px]">A repartir</span>
                            </div>
                        </div>
                    ) : transaction.split_template_id ? (
                        <div className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-1 rounded-md max-w-full">
                            <Users className="h-3 w-3 shrink-0" />
                            <span className="text-[9px] font-extrabold uppercase tracking-tighter truncate">
                                {/* Buscamos el nombre en el array que pasamos por props */}
                                {splitTemplates?.find((t:any) => t.id === transaction.split_template_id)?.name || 'Auto'}
                            </span>
                        </div>
                    ) :(
                        // Reparto normal
                        <div className="flex -space-x-2">
                            {transaction.allocations?.slice(0, 3).map((alloc: any) => {
                                const member = members.find(m => m.id === alloc.member_id)
                                if (!member) return null
                                return (
                                    <div key={alloc.member_id} className="relative transition-transform hover:z-10 hover:scale-110">
                                        <Avatar className="h-6 w-6 border-2 border-white ring-1 ring-slate-100">
                                            <AvatarFallback className={cn("text-[9px] font-bold", notDetailed ? "bg-amber-200 text-amber-800" : "bg-slate-200 text-slate-600")}>
                                                {member.name.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                    </div>
                                )
                            })}
                            {(transaction.allocations?.length || 0) > 3 && (
                                <div className="flex items-center justify-center h-6 w-6 rounded-full bg-slate-100 border-2 border-white text-[9px] font-bold text-slate-500">
                                    +{(transaction.allocations?.length || 0) - 3}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* 5. IMPORTE (Punto 6: Invertido según viewPersonal) */}
            <div className="text-right shrink-0 min-w-[85px]">
                {/* Importe Principal */}
                <div className={cn("text-sm", amountClass)}>
                    {primaryAmount}
                </div>
                
                {/* Importe Secundario (Punto 4: Incluido ingresos) */}
                {secondaryAmount && !isPendingApproval && (
                    <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                        {secondaryLabel}{secondaryAmount}
                    </div>
                )}
            </div>
        </div>
    )
}