'use client'

import React, { useState, useMemo } from 'react';
import { 
    ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, 
    Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend 
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
    ChevronLeft, ChevronRight, ArrowLeft, FilterX, Target
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

// --- MOTOR DE PROCESAMIENTO ---
const processData = (transactions: any[], categories: any[], year: number, selectedMonth: number | null, selectedDay: number | null) => {
    const TRANSFER_CAT_ID = "10310a6a-5d3b-4e95-a19f-bfef8cd2dd1a";
    
    // Filtrado para el Donut (afectado por Mes, Día y Categoría)
    const filteredTxs = transactions.filter(t => {
        const d = new Date(t.date);
        const matchMonth = selectedMonth === null || d.getMonth() === selectedMonth;
        const matchDay = selectedDay === null || d.getDate() === selectedDay;
        return matchMonth && matchDay;
    });

    const expensesForDonut = filteredTxs.filter(t => t.amount < 0 && t.category_id !== TRANSFER_CAT_ID);
    const incomeForDonut = filteredTxs.filter(t => t.amount > 0 && t.category_id !== TRANSFER_CAT_ID);

    // --- LÓGICA DE EVOLUCIÓN (Gráfico de Barras) ---
    let evolutionData: any[] = [];
    if (selectedMonth === null) {
        evolutionData = Array.from({ length: 12 }, (_, i) => ({
            name: new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(new Date(year, i)).toUpperCase(),
            gastos: 0, ingresos: 0
        }));
    } else {
        const daysInMonth = new Date(year, selectedMonth + 1, 0).getDate();
        evolutionData = Array.from({ length: daysInMonth }, (_, i) => ({
            name: (i + 1).toString(),
            gastos: 0, ingresos: 0
        }));
    }

    // Llenamos la evolución con todas las txs (sin filtrar por día para que el gráfico no se vacíe)
    transactions.forEach(t => {
        const d = new Date(t.date);
        const amt = Math.abs(t.amount);
        const isExpense = t.amount < 0 && t.category_id !== TRANSFER_CAT_ID;
        const isIncome = t.amount > 0 && t.category_id !== TRANSFER_CAT_ID;

        if (selectedMonth === null) {
            if (isExpense) evolutionData[d.getMonth()].gastos += amt;
            if (isIncome) evolutionData[d.getMonth()].ingresos += amt;
        } else if (d.getMonth() === selectedMonth) {
            if (isExpense) evolutionData[d.getDate() - 1].gastos += amt;
            if (isIncome) evolutionData[d.getDate() - 1].ingresos += amt;
        }
    });

    // Totales para KPIs
    const totalSpent = expensesForDonut.reduce((acc, t) => acc + Math.abs(t.amount), 0);
    const totalIncome = incomeForDonut.reduce((acc, t) => acc + t.amount, 0);

    // --- LÓGICA DE CATEGORÍAS (Donut) ---
    const parentMap: Record<string, any> = {};
    const subMap: Record<string, any[]> = {};

    expensesForDonut.forEach(t => {
        const absAmount = Math.abs(t.amount);
        const cat = categories.find(c => c.id === t.category_id);
        const parent = cat?.parent_id ? categories.find(p => p.id === cat.parent_id) : cat;

        if (parent) {
            if (!parentMap[parent.id]) {
                parentMap[parent.id] = { id: parent.id, name: parent.name, value: 0, color: parent.color || "#94a3b8" };
            }
            parentMap[parent.id].value += absAmount;
            
            if (!subMap[parent.id]) subMap[parent.id] = [];
            const subName = cat?.id === parent.id ? `${parent.name} (Gral.)` : (cat?.name || "S/C");
            const existingSub = subMap[parent.id].find(s => s.name === subName);
            if (existingSub) existingSub.value += absAmount;
            else subMap[parent.id].push({ name: subName, value: absAmount, color: cat?.color || parent.color || "#cbd5e1" });
        }
    });

    return {
        totalSpent,
        totalIncome,
        savingsRate: totalIncome > 0 ? ((totalIncome - totalSpent) / totalIncome) * 100 : 0,
        monthlyEvolution: evolutionData,
        categoryDistribution: Object.values(parentMap).sort((a, b) => b.value - a.value),
        subCategoryDistribution: subMap
    };
};

export function AnalyticsDashboard({ data, year }: any) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
    const [selectedDay, setSelectedDay] = useState<number | null>(null);
    const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
    const [isDrillDown, setIsDrillDown] = useState(false);

    const changeYear = (delta: number) => {
        const query = new URLSearchParams(searchParams.toString());
        query.set('year', (year + delta).toString());
        router.push(`?${query.toString()}`);
    };

    const displayData = useMemo(() => {
        let txs = [...(data.rawTransactions || [])];
        if (selectedCatId !== null) {
            txs = txs.filter(t => {
                const cat = data.categories.find((c: any) => c.id === t.category_id);
                return t.category_id === selectedCatId || cat?.parent_id === selectedCatId;
            });
        }
        return processData(txs, data.categories, year, selectedMonth, selectedDay);
    }, [selectedMonth, selectedDay, selectedCatId, data, year]);

    const formatCurrency = (v: any) => `${Number(v || 0).toLocaleString('es-ES')} €`;

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-20">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black italic tracking-tighter text-slate-800 uppercase leading-none">
                        {selectedDay !== null ? `Día ${selectedDay} de ${displayData.monthlyEvolution[0]?.name || ''}` : 
                         selectedMonth !== null ? `Balance ${displayData.monthlyEvolution[0]?.name || ''}` : `Análisis Anual ${year}`}
                    </h2>
                    <div className="flex gap-2 mt-3">
                        {selectedCatId && (
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 text-[10px] font-black rounded uppercase flex items-center gap-1 border border-indigo-200">
                                <Target size={10} /> {data.categories.find((c: any) => c.id === selectedCatId)?.name}
                            </span>
                        )}
                        {(selectedMonth !== null || selectedDay !== null) && (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-black rounded uppercase border border-slate-200">
                                {selectedDay ? `Día ${selectedDay}` : 'Vista Mensual'}
                            </span>
                        )}
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    {(selectedMonth !== null || selectedCatId !== null || selectedDay !== null) && (
                        <Button 
                            variant="ghost" 
                            onClick={() => { setSelectedMonth(null); setSelectedDay(null); setSelectedCatId(null); setIsDrillDown(false); }}
                            className="h-10 px-4 rounded-2xl text-[10px] font-black uppercase text-rose-500 hover:bg-rose-50 gap-2 border border-transparent hover:border-rose-200"
                        >
                            <FilterX size={14} /> Limpiar Filtros
                        </Button>
                    )}
                    <div className="flex items-center bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                        <Button variant="ghost" size="icon" onClick={() => changeYear(-1)} className="h-10 w-10 border-r rounded-none hover:bg-slate-50"><ChevronLeft size={18}/></Button>
                        <span className="px-6 text-xs font-black italic text-slate-600">{year}</span>
                        <Button variant="ghost" size="icon" onClick={() => changeYear(1)} className="h-10 w-10 border-l rounded-none hover:bg-slate-50"><ChevronRight size={18}/></Button>
                    </div>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 bg-slate-900 text-white rounded-[2.5rem] shadow-2xl border-none">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-1">Gasto Neto</p>
                    <h3 className="text-3xl font-black italic tracking-tighter">{formatCurrency(displayData.totalSpent)}</h3>
                </Card>
                <Card className="p-6 bg-white rounded-[2.5rem] border-slate-100 shadow-xl">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Ingreso Neto</p>
                    <h3 className="text-3xl font-black italic tracking-tighter text-slate-800">{formatCurrency(displayData.totalIncome)}</h3>
                </Card>
                <Card className="p-6 bg-white rounded-[2.5rem] border-slate-100 shadow-xl">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Ahorro %</p>
                    <h3 className={cn("text-3xl font-black italic tracking-tighter", displayData.savingsRate > 0 ? "text-emerald-500" : "text-rose-500")}>
                        {displayData.savingsRate.toFixed(1)}%
                    </h3>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* GRÁFICO DE BARRAS */}
                <Card className="lg:col-span-8 p-8 rounded-[3rem] border-slate-100 shadow-sm">
                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart 
                                data={displayData.monthlyEvolution}
                                onClick={(state: any) => {
                                    const index = state?.activeTooltipIndex !== undefined ? Number(state.activeTooltipIndex) : null;
                                    if (index === null) return;
                                    
                                    if (selectedMonth === null) {
                                        setSelectedMonth(index);
                                    } else {
                                        const day = index + 1;
                                        setSelectedDay(selectedDay === day ? null : day);
                                    }
                                }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: '900', fill: '#94a3b8'}} />
                                <YAxis hide />
                                <Tooltip formatter={formatCurrency} cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '1rem', border:'none', boxShadow:'0 10px 25px -3px rgba(0,0,0,0.1)'}} />
                                <Bar dataKey="gastos" name="Gastos" barSize={selectedMonth !== null ? 12 : 35} radius={[6, 6, 0, 0]} isAnimationActive={true}>
                                    {displayData.monthlyEvolution.map((entry: any, index: number) => {
                                        let isHighlighted = false;
                                        let color = "#818cf8";
                                        
                                        if (selectedMonth === null) {
                                            isHighlighted = true;
                                        } else if (selectedDay === null) {
                                            isHighlighted = true;
                                        } else {
                                            isHighlighted = (index + 1) === selectedDay;
                                            if (isHighlighted) color = "#f43f5e";
                                        }

                                        return (
                                            <Cell 
                                                key={`cell-${index}`} 
                                                fill={color} 
                                                fillOpacity={isHighlighted ? 1 : 0.3}
                                                className="cursor-pointer transition-all duration-300"
                                            />
                                        );
                                    })}
                                </Bar>
                                {!selectedCatId && (
                                    <Line type="stepAfter" dataKey="ingresos" name="Ingresos" stroke="#10b981" strokeWidth={3} dot={false} isAnimationActive={true} />
                                )}
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* DONUT */}
                <Card className="lg:col-span-4 p-8 rounded-[3rem] border-slate-100 shadow-sm flex flex-col items-center relative">
                    <div className="w-full flex justify-between items-start mb-6">
                        <div className="flex flex-col">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">
                                {isDrillDown ? "Zoom Subcategorías" : "Mix de Categorías"}
                            </h4>
                            {isDrillDown && <span className="text-[10px] font-black text-indigo-600 truncate max-w-[120px]">
                                {data.categories.find((c: any) => c.id === selectedCatId)?.name}
                            </span>}
                        </div>
                        {isDrillDown && (
                            <Button variant="ghost" size="sm" onClick={() => { setIsDrillDown(false); setSelectedCatId(null); }} className="h-6 px-2 text-[9px] font-black uppercase bg-slate-100 rounded-lg hover:bg-slate-200">
                                <ArrowLeft size={10} className="mr-1"/> Volver
                            </Button>
                        )}
                    </div>
                    
                    <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={isDrillDown ? (displayData.subCategoryDistribution[selectedCatId!] || []) : displayData.categoryDistribution}
                                    innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none"
                                    isAnimationActive={true}
                                    onClick={(entry: any) => {
                                        const dataPayload = entry.payload;
                                        if (!isDrillDown && dataPayload?.id) {
                                            setSelectedCatId(dataPayload.id);
                                            setIsDrillDown(true);
                                        }
                                    }}
                                    className="outline-none cursor-pointer"
                                >
                                    {(isDrillDown ? (displayData.subCategoryDistribution[selectedCatId!] || []) : displayData.categoryDistribution).map((entry: any, index: number) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={entry.color} 
                                            fillOpacity={selectedCatId === null || selectedCatId === entry.id ? 1 : 0.5} 
                                        />
                                    ))}
                                </Pie>
                                <Tooltip formatter={formatCurrency} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="mt-6 w-full space-y-1.5 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                        {(isDrillDown ? (displayData.subCategoryDistribution[selectedCatId!] || []) : displayData.categoryDistribution).map((cat: any) => (
                            <div 
                                key={cat.name} 
                                className="flex items-center justify-between group cursor-pointer p-1 rounded-lg hover:bg-slate-50 transition-colors"
                                onClick={() => {
                                    if (!isDrillDown) {
                                        setSelectedCatId(cat.id);
                                        setIsDrillDown(true);
                                    }
                                }}
                            >
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                                    <span className={cn(
                                        "text-[9px] font-black uppercase transition-colors truncate max-w-[100px]", 
                                        selectedCatId === cat.id ? "text-indigo-600" : "text-slate-500 group-hover:text-slate-800"
                                    )}>
                                        {cat.name}
                                    </span>
                                </div>
                                <span className="text-[9px] font-black text-slate-700 tabular-nums">{formatCurrency(cat.value)}</span>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
}