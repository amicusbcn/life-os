'use client'

import { SharedMember, SharedCategory } from '@/types/finance-shared'
import { formatCurrency } from '@/lib/utils'
import { TransactionDetailDialog } from '../dialogs/TransactionDetailDialog'
import { useState } from 'react'
import LoadIcon from '@/utils/LoadIcon'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, User } from 'lucide-react'

// DEFINIMOS LOS MODOS DE VISTA
type ViewMode = 'default' | 'mine' | 'unallocated'

interface Props {
    transactions: any[]
    currentUserId: string
    currentMemberId?: string
    isAdmin: boolean
    members: SharedMember[]
    onEditTransaction: (tx: any) => void
    categories: SharedCategory[]
    viewMode?: ViewMode // <--- NUEVA PROP
    splitTemplates:any[]
}

export function TransactionList({ 
    transactions, 
    currentUserId, 
    currentMemberId, 
    isAdmin, 
    members, 
    onEditTransaction, 
    categories,
    viewMode = 'default' // Por defecto
}: Props) {
    const [selectedTx, setSelectedTx] = useState<any>(null)

    if (transactions.length === 0) {
        return (
            <div className="text-center py-10 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                <p className="text-sm text-slate-400">No hay movimientos en esta vista.</p>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-lg border shadow-sm divide-y divide-slate-100">
            {transactions.map((tx) => (
                <TransactionItem 
                    key={tx.id} 
                    tx={tx} 
                    isAdmin={isAdmin} 
                    currentMemberId={currentMemberId}
                    categories={categories}
                    viewMode={viewMode} // Pasamos el modo
                    onClick={() => setSelectedTx(tx)}
                />
            ))}
        </div>
    )
}

// ---------------- SUBCOMPONENTE ITEM ----------------

function TransactionItem({ tx, isAdmin, currentMemberId, categories, viewMode, onClick }: any) {
    // Datos básicos
    const category = categories.find((c: any) => c.id === tx.category_id)
    const isIncome = tx.type === 'income'
    const isUnassigned = !tx.allocations || tx.allocations.length === 0
    
    // Cálculos de importes
    const totalAmount = tx.amount
    
    // Mi parte (Allocation)
    const myAllocation = tx.allocations?.find((a: any) => a.member_id === currentMemberId)
    const myCost = myAllocation ? myAllocation.amount : 0
    
    // ¿Fui yo el pagador original?
    const iAmPayer = tx.payment_source === 'member' && tx.payer_member_id === currentMemberId

    // LÓGICA DE VISUALIZACIÓN SEGÚN EL MODO
    let mainAmount = totalAmount
    let subAmountLabel = null
    let sign = isIncome ? '+' : '-'
    let colorClass = isIncome ? 'text-green-600' : 'text-slate-900'

    if (viewMode === 'mine') {
        // En modo "Mío", lo grande es lo que me cuesta a mí.
        if (isUnassigned) {
            // Si no está asignado pero yo lo pagué, muestro el total (porque lo adelanté yo)
            mainAmount = totalAmount
        } else {
            // Si está repartido, muestro mi coste
            mainAmount = myCost
        }
        
        // Si no me cuesta nada (0) pero lo pagué yo, mostramos 0 en grande? 
        // Mejor mostramos el total si yo lo pagué, o 0 si solo soy espectador.
        if (myCost === 0 && iAmPayer) mainAmount = totalAmount

        // El color depende de si es coste (gasto) o ingreso
        colorClass = isIncome ? 'text-green-600' : 'text-slate-700'
        
        // Subtexto: El total real
        if (Math.abs(mainAmount - totalAmount) > 0.01) {
            subAmountLabel = `Total: ${formatCurrency(totalAmount)}`
        }
    }

    return (
        <div 
            onClick={onClick}
            className={`flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors cursor-pointer group 
                ${isUnassigned && isAdmin ? 'bg-red-50/30' : ''}
            `}
        >
            {/* 1. ICONO */}
            <div 
                className={`h-10 w-10 rounded-full flex items-center justify-center border shrink-0`}
                style={{ 
                    backgroundColor: category?.color ? `${category.color}20` : '#f1f5f9',
                    color: category?.color || '#94a3b8'
                }}
            >
                <LoadIcon name={category?.icon_name || 'HelpCircle'} className="h-5 w-5" />
            </div>

            {/* 2. TEXTOS */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-900 truncate">
                        {tx.description}
                        {tx.notes && ( <span className="text-xs text-slate-500 italic truncate mb-0.5 pr-2"> ({tx.notes})</span>)}
                    </p>
                    
                    {/* Badge Sin Asignar */}
                    {isUnassigned && (
                        <Badge variant="destructive" className="h-5 text-[10px] px-1.5 gap-1">
                            <AlertTriangle className="h-3 w-3" /> <span className="hidden sm:inline">Sin asignar</span>
                        </Badge>
                    )}
                </div>
                
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="truncate">{new Date(tx.date).toLocaleDateString()}</span>
                    <span>•</span>
                    {tx.payment_source === 'account' ? (
                        <span className="flex items-center gap-1">🏦 Cuenta</span>
                    ) : (
                        <span className="flex items-center gap-1">
                            <User className="h-3 w-3"/> {tx.payer?.name}
                        </span>
                    )}
                </div>
            </div>

            {/* 3. IMPORTE (DINÁMICO SEGÚN VISTA) */}
            <div className="text-right flex flex-col items-end">
                <p className={`text-sm font-bold ${colorClass}`}>
                    {sign}{formatCurrency(mainAmount)}
                </p>
                
                {/* Subtexto: En vista "Mío" muestra el total. En vista "Default" muestra "Tú: X" */}
                {viewMode === 'mine' ? (
                    subAmountLabel && (
                        <span className="text-[10px] text-slate-400">{subAmountLabel}</span>
                    )
                ) : (
                    // VISTA DEFAULT (Muestra "tú: 20€")
                    !isUnassigned && myCost > 0 && Math.abs(myCost - totalAmount) > 0.01 && (
                        <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full mt-0.5">
                            tú: {formatCurrency(myCost)}
                        </span>
                    )
                )}
            </div>
        </div>
    )
}