'use client'

import { 
    ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, 
    Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend 
} from 'recharts';
import { Card } from '@/components/ui/card';
import { TrendingDown, Wallet, Zap, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useMemo, useState } from 'react';

export function AnalyticsDashboard({ data, year }: any) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const changeYear = (delta: number) => {
        const query = new URLSearchParams(searchParams.toString());
        query.set('year', (year + delta).toString());
        router.push(`?${query.toString()}`);
    };

    const [activeParentId, setActiveParentId] = useState<string | null>(null);

    const displayData = useMemo(() => {
        if (!activeParentId) return data.categoryDistribution;
        // Buscamos las subcategorías del padre seleccionado
        // Nota: Necesitarás pasar el ID del padre en categoryDistribution
        return data.subCategoryDistribution[activeParentId] || [];
    }, [activeParentId, data]);

    const handlePieClick = (entry: any) => {
        if (!activeParentId) {
            // Buscamos el ID real de la categoría padre por su nombre
            // (O mejor si incluyes el ID en data.categoryDistribution)
            setActiveParentId(entry.id); 
        }
    };

    const formatCurrency = (value: any) => {
        if (value === undefined || value === null) return "0 €";
        return `${Number(value).toLocaleString('es-ES')} €`;
    };

    return (
        <div className="space-y-8">
            {/* NAVEGADOR DE AÑO Y TÍTULO */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black italic tracking-tighter text-slate-800">ANÁLISIS ANUAL</h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Resumen de flujos y categorías</p>
                </div>
                <div className="flex items-center bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-none border-r" onClick={() => changeYear(-1)}>
                        <ChevronLeft size={18} />
                    </Button>
                    <span className="px-8 text-sm font-black italic text-slate-700">{year}</span>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-none border-l" onClick={() => changeYear(1)}>
                        <ChevronRight size={18} />
                    </Button>
                </div>
            </div>

            {/* KPI CARDS SUPERIORES */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 bg-slate-900 text-white rounded-[2.5rem] border-none shadow-2xl relative overflow-hidden group">
                    <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-1">Gasto Total Anual</p>
                        <h3 className="text-3xl font-black italic">{data.totalSpent.toLocaleString('es-ES')} €</h3>
                        <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-slate-400">
                            <TrendingDown size={12} /> Media de {(data.totalSpent / 12).toLocaleString('es-ES')} € / mes
                        </div>
                    </div>
                    <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
                        <Zap size={120} />
                    </div>
                </Card>

                <Card className="p-6 bg-white rounded-[2.5rem] border-slate-100 shadow-xl">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Ingresos Totales</p>
                    <h3 className="text-3xl font-black italic text-slate-800">{data.totalIncome.toLocaleString('es-ES')} €</h3>
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-emerald-500">
                        <Wallet size={12} /> +{(data.totalIncome - data.totalSpent).toLocaleString('es-ES')} € de balance
                    </div>
                </Card>

                <Card className="p-6 bg-white rounded-[2.5rem] border-slate-100 shadow-xl">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Tasa de Ahorro</p>
                    <h3 className={cn(
                        "text-3xl font-black italic",
                        data.savingsRate > 20 ? "text-indigo-600" : "text-rose-500"
                    )}>
                        {data.savingsRate.toFixed(1)} %
                    </h3>
                    <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-indigo-500 rounded-full transition-all duration-1000" 
                            style={{ width: `${Math.max(0, Math.min(100, data.savingsRate))}%` }}
                        />
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* EVOLUCIÓN MIXTA (Gastos Barras + Ingresos Línea) */}
                <Card className="lg:col-span-8 p-8 rounded-[3rem] border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-10">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 italic">
                            <div className="h-2 w-2 rounded-full bg-indigo-500" /> Evolución Mensual Flujos
                        </h4>
                    </div>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={data.monthlyEvolution}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} />
                                <YAxis hide />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                                    cursor={{fill: '#f8fafc'}}
                                    formatter={formatCurrency}
                                />
                                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: 'bold' }} />
                                <Bar 
                                    name="Gastos"
                                    dataKey="gastos" 
                                    fill="#818cf8" 
                                    radius={[6, 6, 0, 0]} 
                                    barSize={40}
                                    isAnimationActive={true}
                                />
                                <Line 
                                    name="Ingresos"
                                    type="monotone" 
                                    dataKey="ingresos" 
                                    stroke="#10b981" 
                                    strokeWidth={4} 
                                    dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                                    activeDot={{ r: 6 }}
                                    isAnimationActive={true}
                                    animationDuration={2000}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* DISTRIBUCIÓN */}
                <Card className="lg:col-span-4 p-8 rounded-[3rem] shadow-sm flex flex-col items-center relative">
                    <div className="flex justify-between w-full mb-6">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 italic">
                            {activeParentId ? `Desglose: ${activeParentId}` : "Distribución Gastos"}
                        </h4>
                        {activeParentId && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setActiveParentId(null)}
                                className="h-6 text-[10px] font-black uppercase text-indigo-500 gap-1"
                            >
                                <ArrowLeft size={12} /> Volver
                            </Button>
                        )}
                    </div>

                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={displayData}
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                    onClick={handlePieClick}
                                    isAnimationActive={true}
                                    animationDuration={500}
                                    className="cursor-pointer outline-none"
                                >
                                    {displayData.map((entry: any, index: number) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={entry.color} 
                                            stroke="none"
                                            className="hover:opacity-80 transition-opacity"
                                        />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ borderRadius: '1rem', border: 'none', fontWeight: 'bold' }}
                                    formatter={formatCurrency}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Lista de leyendas que cambia según el nivel */}
                    <div className="mt-4 w-full space-y-2 overflow-y-auto max-h-[120px] custom-scrollbar">
                        {displayData.map((cat: any) => (
                            <div key={cat.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                                    <span className="text-[10px] font-bold text-slate-500 uppercase truncate max-w-[120px]">{cat.name}</span>
                                </div>
                                <span className="text-[10px] font-black text-slate-700">{cat.value.toLocaleString()} €</span>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
}