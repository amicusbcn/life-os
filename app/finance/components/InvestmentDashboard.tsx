'use client'

import React, { useMemo } from 'react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer, BarChart, Bar, Cell 
} from 'recharts';
import { Card } from '@/components/ui/card';
import { TrendingUp, ArrowUpRight, Wallet, PieChart } from 'lucide-react';

// Lógica para procesar la evolución del patrimonio
const processInvestmentHistory = (transactions: any[], year: number) => {
    const AJUSTE_VALOR_CAT_ID = "a0190e18-87c4-4c3a-ba01-31ae433c5ace"; // CAMBIA ESTO
    
    // Filtramos transacciones hasta el final del año actual
    const history: any[] = [];
    let runningCapital = 0; // Lo que tú has metido/sacado
    let runningTotal = 0;   // El valor real con ajustes

    // Agrupamos por meses para el gráfico
    const monthlyData: Record<string, any> = {};

    transactions.forEach(t => {
        const amt = t.amount;
        const date = new Date(t.date);
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;

        if (t.category_id === AJUSTE_VALOR_CAT_ID) {
            // Es un ajuste de mercado
            runningTotal += amt;
        } else {
            // Es una aportación o retirada de capital
            runningCapital += amt;
            runningTotal += amt;
        }

        monthlyData[monthKey] = {
            date: new Date(date.getFullYear(), date.getMonth(), 1),
            capital: runningCapital,
            valorTotal: runningTotal,
            beneficio: runningTotal - runningCapital
        };
    });

    return Object.values(monthlyData);
};

export function InvestmentDashboard({ data }: any) {
    const history = useMemo(() => 
        processInvestmentHistory(data.investmentTransactions, data.year), 
    [data]);

    const currentStatus = history[history.length - 1] || { valorTotal: 0, capital: 0, beneficio: 0 };
    const roi = currentStatus.capital !== 0 
        ? (currentStatus.beneficio / currentStatus.capital) * 100 
        : 0;

    return (
        <div className="space-y-8 animate-in fade-in duration-1000">
            {/* KPIs PRINCIPALES */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-6 bg-slate-900 text-white rounded-[2rem]">
                    <p className="text-[10px] font-black uppercase text-indigo-400 mb-1">Patrimonio Neto</p>
                    <h3 className="text-3xl font-black italic">{currentStatus.valorTotal.toLocaleString()} €</h3>
                </Card>
                <Card className="p-6 bg-white rounded-[2rem] border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Capital Invertido</p>
                    <h3 className="text-3xl font-black italic text-slate-800">{currentStatus.capital.toLocaleString()} €</h3>
                </Card>
                <Card className="p-6 bg-white rounded-[2rem] border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Plusvalía Total</p>
                    <h3 className="text-3xl font-black italic text-emerald-500">+{currentStatus.beneficio.toLocaleString()} €</h3>
                </Card>
                <Card className="p-6 bg-white rounded-[2rem] border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Rentabilidad Histórica</p>
                    <h3 className="text-3xl font-black italic text-indigo-600">{roi.toFixed(2)} %</h3>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* GRÁFICO DE EVOLUCIÓN HISTÓRICA */}
                <Card className="lg:col-span-8 p-8 rounded-[3rem] border-slate-100 shadow-sm">
                    <div className="mb-6">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Crecimiento del Patrimonio</h4>
                        <p className="text-xs text-slate-500 font-bold">Capital vs Revalorización</p>
                    </div>
                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={history}>
                                <defs>
                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                    dataKey="date" 
                                    tickFormatter={(date) => new Intl.DateTimeFormat('es-ES', { month: 'short', year: '2-digit' }).format(date)}
                                    tick={{fontSize: 9, fontWeight: 'bold'}}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis hide domain={['dataMin - 1000', 'dataMax + 1000']} />
                                <Tooltip 
                                    labelFormatter={(date) => new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(date)}
                                    contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                                />
                                {/* Área de Capital (lo que tú pusiste) */}
                                <Area type="monotone" dataKey="capital" stroke="#94a3b8" fill="#f1f5f9" strokeWidth={2} name="Capital Invertido" />
                                {/* Área de Valor Total (Capital + Ajustes) */}
                                <Area type="monotone" dataKey="valorTotal" stroke="#6366f1" fill="url(#colorTotal)" strokeWidth={4} name="Valor de Mercado" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* DISTRIBUCIÓN POR CUENTA / ACTIVO */}
                <Card className="lg:col-span-4 p-8 rounded-[3rem] border-slate-100 shadow-sm">
                    <div className="mb-6">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Distribución</h4>
                        <p className="text-xs text-slate-500 font-bold">Por cuenta de inversión</p>
                    </div>
                    {/* Aquí podrías poner un PieChart con data.investmentAccounts */}
                    <div className="space-y-4">
                        {data.investmentAccounts.map((acc: any) => (
                            <div key={acc.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-slate-400">{acc.name}</p>
                                    <p className="text-sm font-bold text-slate-800">{acc.balance.toLocaleString()} €</p>
                                </div>
                                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-black text-[10px]">
                                    {((acc.balance / currentStatus.valorTotal) * 100).toFixed(0)}%
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
}