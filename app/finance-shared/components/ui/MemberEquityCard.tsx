'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SharedMember } from '@/types/finance-shared'
import { formatCurrency } from '@/lib/utils' 
import { Wallet, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'

// Extendemos la interfaz para aceptar los campos de la nueva vista SQL
// aunque no estén en el tipo base SharedMember todavía.
interface ExtendedMember extends SharedMember {
    total_balance?: number
    total_consumed?: number
    total_paid_expenses?: number
    total_contributed?: number
    // Mantener compatibilidad por si acaso
    current_equity?: number 
    total_paid?: number
}

interface MemberEquityCardProps {
  member: ExtendedMember
  currency?: string
  isMe?: boolean // Opcional: Para destacar tu tarjeta
}

export function MemberEquityCard({ member, currency = 'EUR', isMe = false }: MemberEquityCardProps) {
  
  // 1. MAPEAMOS LOS CAMPOS DE LA NUEVA VISTA SQL
  // 'total_balance' es el nuevo nombre de 'current_equity'
  const balance = member.total_balance ?? member.current_equity ?? 0
  
  // 'total_consumed' se mantiene igual
  const consumed = member.total_consumed ?? 0

  // 2. CÁLCULO DE "APORTADO TOTAL"
  // Sumamos lo que pagó con tarjeta (paid_expenses) + lo que ingresó (contributed)
  // Si usamos la lógica antigua, usará member.total_paid
  const totalPut = (member.total_paid_expenses ?? 0) + (member.total_contributed ?? 0) + (member.total_paid ?? 0)

  const isPositive = balance >= 0

  return (
    <Card className={`shadow-sm transition-all hover:shadow-md ${isMe ? 'border-indigo-200 ring-2 ring-indigo-50' : ''}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {member.name}
          {isMe && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 rounded-full">Tú</span>}
        </CardTitle>
        <Wallet className={`h-4 w-4 ${isMe ? 'text-indigo-400' : 'text-slate-300'}`} />
      </CardHeader>
      
      <CardContent>
        {/* BALANCE PRINCIPAL */}
        <div className={`text-2xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {isPositive ? '+' : ''}{formatCurrency(balance, currency)}
        </div>
        <p className="text-[10px] text-muted-foreground mb-3">Saldo Neto</p>
        
        {/* DESGLOSE */}
        <div className="grid grid-cols-2 gap-2 text-xs border-t pt-2">
            
            {/* APORTADO */}
            <div className="flex flex-col gap-1 p-1.5 rounded bg-green-50/50">
                <span className="text-slate-500 flex items-center gap-1 text-[10px] uppercase font-bold">
                     <ArrowUpCircle className="h-3 w-3 text-green-600"/> Aportado
                </span>
                <span className="font-semibold text-slate-700">
                    {formatCurrency(totalPut, currency)}
                </span>
            </div>

            {/* GASTADO */}
            <div className="flex flex-col gap-1 p-1.5 rounded bg-red-50/50">
                <span className="text-slate-500 flex items-center gap-1 text-[10px] uppercase font-bold">
                    <ArrowDownCircle className="h-3 w-3 text-red-600"/> Gastado
                </span>
                <span className="font-semibold text-slate-700">
                    {formatCurrency(consumed, currency)}
                </span>
            </div>

        </div>
      </CardContent>
    </Card>
  )
}