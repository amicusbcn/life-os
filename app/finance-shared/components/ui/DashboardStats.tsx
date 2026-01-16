'use client'

import { useState } from 'react'
import { DashboardData } from '@/app/finance-shared/data'
import { formatCurrency } from '@/lib/utils'
import { Wallet, Landmark, CheckCircle2, PieChart, CreditCard, ChevronDown, ChevronUp, RefreshCw, ArrowRight, LogIn, LogOut } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Props {
  data: DashboardData
  currentUserId: string
}

export function DashboardStats({ data, currentUserId }: Props) {
  if (!data || !data.stats) {
      return <div className="p-4 border rounded-xl bg-red-50 text-red-600 text-sm">Esperando datos...</div>
  }

  const { stats, members } = data
  const [showLiquidation, setShowLiquidation] = useState(false)
  
  const myMember = members.find(m => m.user_id === currentUserId)
  const isAdmin = myMember?.role === 'admin'
  const isCardAdmin = false 
  const myBalance = myMember?.total_balance || 0

  // --- ALGORITMO DE LIQUIDACIÓN CONTRA CUENTA ---
  // 1. Deudores: Tienen saldo negativo. Deben INGRESAR dinero a la cuenta.
  const debtors = members
      .filter(m => m.total_balance < -0.01)
      .map(m => ({ name: m.name, amount: Math.abs(m.total_balance) }))
      .sort((a, b) => b.amount - a.amount)

  // 2. Acreedores: Tienen saldo positivo. Deben RETIRAR dinero de la cuenta.
  const creditors = members
      .filter(m => m.total_balance > 0.01)
      .map(m => ({ name: m.name, amount: m.total_balance }))
      .sort((a, b) => b.amount - a.amount)

  const totalToCollect = debtors.reduce((acc, curr) => acc + curr.amount, 0)
  const totalToPayOut = creditors.reduce((acc, curr) => acc + curr.amount, 0)

  // 3. Predicción del Saldo Bancario Final
  // Saldo Actual + Lo que ingresan los deudores - Lo que retiran los acreedores
  const projectedBankBalance = stats.bankBalance + totalToCollect - totalToPayOut

  // Detectar si hay movimientos que hacer
  const hasMovements = debtors.length > 0 || creditors.length > 0

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      
      {/* CABECERA: SALDO NETO (Patrimonio del Grupo) */}
      <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
        <div>
           <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Patrimonio Neto</p>
           <h2 className="text-2xl font-bold text-slate-900">{formatCurrency(stats.netBalance)}</h2>
        </div>
        <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center border shadow-sm">
            <Landmark className="h-5 w-5 text-indigo-600" />
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        
        {/* 1. SALDO BANCO REAL */}
        <StatRow 
            label="Saldo en Banco" 
            value={stats.bankBalance} 
            icon={<Wallet className="h-4 w-4 text-slate-400"/>}
            subtext={stats.activeLoans > 0 || stats.activeProvisions > 0 ? "Incluye provisiones" : undefined}
        />

        {/* 2. MI SITUACIÓN */}
        <div className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors border-l-4 border-l-transparent">
            <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center">
                   <span className="text-xs font-bold text-indigo-700">YO</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-700">Mi Situación</span>
                </div>
            </div>
            <div className="text-right">
                 <span className={`text-sm font-bold ${myBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {myBalance >= 0 ? '+' : ''}{formatCurrency(myBalance)}
                 </span>
                 <p className="text-[10px] text-slate-400">
                    {myBalance >= 0 ? 'Retirable' : 'A ingresar'}
                 </p>
            </div>
        </div>

        {/* 3. SIMULACIÓN LIQUIDACIÓN CONTRA CUENTA */}
        <div className="flex flex-col">
            <div 
                className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setShowLiquidation(!showLiquidation)}
            >
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8">
                        <RefreshCw className="h-4 w-4 text-slate-400" />
                    </div>
                    <span className="text-sm font-medium text-slate-600">Simular Liquidación</span>
                </div>
                <div className="flex items-center gap-2">
                     <Badge variant={hasMovements ? "secondary" : "outline"} className="text-[10px] h-5 font-normal">
                         {hasMovements ? 'Ver movimientos' : 'Al día'}
                     </Badge>
                    {showLiquidation ? <ChevronUp className="h-4 w-4 text-slate-300"/> : <ChevronDown className="h-4 w-4 text-slate-300"/>}
                </div>
            </div>

            {/* DESPLEGABLE */}
            {showLiquidation && hasMovements && (
                <div className="bg-slate-50 p-4 space-y-4 border-t border-slate-100 shadow-inner animate-in slide-in-from-top-2">
                    
                    {/* A. INGRESOS (Deudores pagan a la cuenta) */}
                    {debtors.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                                <LogIn className="h-3 w-3" /> Deben ingresar en cuenta
                            </p>
                            {debtors.map((d, i) => (
                                <div key={i} className="flex justify-between text-xs bg-white p-2 rounded border border-red-100 text-red-700">
                                    <span>{d.name}</span>
                                    <span className="font-mono font-bold">+{formatCurrency(d.amount)}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* B. RETIRADAS (Acreedores cobran de la cuenta) */}
                    {creditors.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                                <LogOut className="h-3 w-3" /> Pueden retirar de cuenta
                            </p>
                            {creditors.map((c, i) => (
                                <div key={i} className="flex justify-between text-xs bg-white p-2 rounded border border-green-100 text-green-700">
                                    <span>{c.name}</span>
                                    <span className="font-mono font-bold">-{formatCurrency(c.amount)}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* C. RESULTADO FINAL */}
                    <div className="pt-2 border-t border-slate-200 mt-2">
                        <div className="flex justify-between items-center text-xs mb-1">
                            <span className="text-slate-500">Saldo actual Banco:</span>
                            <span className="font-mono">{formatCurrency(stats.bankBalance)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm font-bold">
                            <span className="text-slate-900">Saldo tras liquidar:</span>
                            {/* Si es 0 o provisiones, es bueno. Si es negativo, falta dinero */}
                            <span className={projectedBankBalance < -0.01 ? 'text-red-600' : 'text-slate-900'}>
                                {formatCurrency(projectedBankBalance)}
                            </span>
                        </div>
                        {Math.abs(projectedBankBalance) > 0.01 && (
                            <p className="text-[10px] text-slate-400 mt-1 italic">
                                *El remanente corresponde a provisiones (regalos) o deudas externas.
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>

        {/* 4. ALERTAS ADMIN */}
        {isAdmin && stats.pendingApproval > 0 && (
             <ActionRow label="Pendiente de Aprobar" count={stats.pendingApproval} color="amber" icon={<CheckCircle2 className="h-4 w-4" />} />
        )}
        {isAdmin && stats.unallocatedCount > 0 && (
             <ActionRow label="Sin asignar (Repartir)" count={stats.unallocatedCount} color="red" icon={<PieChart className="h-4 w-4" />} />
        )}
        {(isAdmin || isCardAdmin) && stats.pendingCardJustification > 0 && (
             <ActionRow label="Tarjeta sin justificar" count={stats.pendingCardJustification} type="currency" color="purple" icon={<CreditCard className="h-4 w-4" />} />
        )}
      </div>
    </div>
  )
}

// Subcomponentes auxiliares (StatRow y ActionRow) se mantienen igual que antes
function StatRow({ label, value, icon, subtext }: any) {
    return (
        <div className="p-3 flex items-center justify-between group">
            <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8">{icon}</div>
                <div>
                    <span className="text-sm font-medium text-slate-600">{label}</span>
                    {subtext && <p className="text-[10px] text-slate-400 hidden group-hover:block">{subtext}</p>}
                </div>
            </div>
            <span className="text-sm font-semibold text-slate-900">{formatCurrency(value)}</span>
        </div>
    )
}

function ActionRow({ label, count, color, icon, type = 'count' }: any) {
    const colors: any = {
        red: 'bg-red-50 text-red-700 border-red-100',
        amber: 'bg-amber-50 text-amber-700 border-amber-100',
        purple: 'bg-purple-50 text-purple-700 border-purple-100',
    }
    return (
        <div className={`p-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 border-l-4 ${color === 'red' ? 'border-l-red-500' : color === 'amber' ? 'border-l-amber-500' : 'border-l-purple-500'}`}>
            <div className="flex items-center gap-3">
                 <div className={`h-8 w-8 rounded-full flex items-center justify-center ${colors[color]} bg-opacity-50`}>
                    {icon}
                 </div>
                 <span className="text-sm font-medium text-slate-700">{label}</span>
            </div>
            <Badge variant="outline" className={`${colors[color]} border shadow-sm`}>
                {type === 'currency' ? formatCurrency(count) : count}
                {type === 'count' && <ArrowRight className="h-3 w-3 ml-1 opacity-50" />}
            </Badge>
        </div>
    )
}