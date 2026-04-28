'use client'

import React, { useState, useMemo } from 'react';
import { 
    ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, 
    Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
    ChevronLeft, ChevronRight, ArrowLeft, FilterX, Target
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

// --- MOTOR DE PROCESAMIENTO ---
const processData = (transactions: any[], categories: any[], year: number, selectedMonth: number | null, selectedDay: number | null, selectedSubCatName: string | null) => {
    const TRANSFER_CAT_ID = "10310a6a-5d3b-4e95-a19f-bfef8cd2dd1a";
    
    // 1. Filtrado para KPIs y Donut (Mes + Día + Subcategoría si existe)
    const filteredTxs = transactions.filter(t => {
        const d = new Date(t.date);
        const matchMonth = selectedMonth === null || d.getMonth() === selectedMonth;
        const matchDay = selectedDay === null || d.getDate() === selectedDay;
        
        // Filtro por subcategoría específica si se ha seleccionado en el Donut
        if (selectedSubCatName) {
            const cat = categories.find(c => c.id === t.category_id);
            const subName = cat?.parent_id ? cat.name : `${cat?.name} (Gral.)`;
            return matchMonth && matchDay && subName === selectedSubCatName;
        }

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

    // Llenamos la evolución usando las transacciones filtradas por categoría/subcategoría 
    // para que las barras respondan al Donut
    filteredTxs.forEach(t => {
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

    const totalSpent = expensesForDonut.reduce((acc, t) => acc + Math.abs(t.amount), 0);
    const totalIncome = incomeForDonut.reduce((acc, t) => acc + t.amount, 0);

    // --- LÓGICA DE CATEGORÍAS (Donut) ---
    const parentMap: Record<string, any> = {};
    const subMap: Record<string, any[]> = {};

    // Para el Donut usamos las txs del mes/día pero sin el filtro de la propia subcategoría 
    // (si no, el donut solo tendría una porción)
    const txsForDonutDisplay = transactions.filter(t => {
        const d = new Date(t.date);
        return (selectedMonth === null || d.getMonth() === selectedMonth) && (selectedDay === null || d.getDate() === selectedDay);
    }).filter(t => t.amount < 0 && t.category_id !== TRANSFER_CAT_ID);

    txsForDonutDisplay.forEach(t => {
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
    const [selectedSubCatName, setSelectedSubCatName] = useState<string | null>(null);
    const [isDrillDown, setIsDrillDown] = useState(false);

    const changeYear = (delta: number) => {
        const query = new URLSearchParams(searchParams.toString());
        query.set('year', (year + delta).toString());
        router.push(`?${query.toString()}`);
    };

    
    const getMonthName = (index: number) => {
        // Creamos una fecha ficticia usando el año actual y el índice del mes (0-11)
        const date = new Date(year, index, 1);
        return new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(date);
    };
    
    const displayData = useMemo(() => {
        let txs = [...(data.rawTransactions || [])];
        // Filtro previo por categoría padre si existe
        if (selectedCatId !== null) {
            txs = txs.filter(t => {
                const cat = data.categories.find((c: any) => c.id === t.category_id);
                return t.category_id === selectedCatId || cat?.parent_id === selectedCatId;
            });
        }
        return processData(txs, data.categories, year, selectedMonth, selectedDay, selectedSubCatName);
    }, [selectedMonth, selectedDay, selectedCatId, selectedSubCatName, data, year]);

    const formatCurrency = (v: any) => `${Number(v || 0).toLocaleString('es-ES')} €`;

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-20">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black italic tracking-tighter text-slate-800 uppercase leading-none">
                        {selectedDay !== null ? `Día ${selectedDay} de ${displayData.monthlyEvolution[0]?.name || ''}` : 
                         selectedMonth !== null ? `Detalle ${displayData.monthlyEvolution[0]?.name || ''}` : `Análisis Anual ${year}`}
                    </h2>
                    <div className="flex gap-2 mt-3">
                        {selectedSubCatName && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-black rounded uppercase border border-amber-200">
                                {selectedSubCatName}
                            </span>
                        )}
                        {selectedMonth !== null && (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-black rounded uppercase border border-slate-200">
                                Vista {selectedDay ? 'Diaria' : 'Mensual'}
                            </span>
                        )}
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    {(selectedMonth !== null || selectedCatId !== null || selectedDay !== null || selectedSubCatName !== null) && (
                        <Button 
                            variant="ghost" 
                            onClick={() => { setSelectedMonth(null); setSelectedDay(null); setSelectedCatId(null); setSelectedSubCatName(null); setIsDrillDown(false); }}
                            className="h-10 px-4 rounded-2xl text-[10px] font-black uppercase text-rose-500 hover:bg-rose-50 gap-2 border border-transparent hover:border-rose-200 shadow-sm"
                        >
                            <FilterX size={14} /> Reset
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
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-1">Gasto</p>
                    <h3 className="text-3xl font-black italic tracking-tighter">{formatCurrency(displayData.totalSpent)}</h3>
                </Card>
                <Card className="p-6 bg-white rounded-[2.5rem] border-slate-100 shadow-xl">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Ingreso</p>
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
                {/* GRÁFICO DE BARRAS CON TITULO Y BOTON VOLVER */}
                <Card className="lg:col-span-8 p-8 rounded-[3rem] border-slate-100 shadow-sm relative">
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">
                            {selectedMonth === null ? "Evolución Anual" : `Detalle Diario`}
                        </h4>
                        {/* SUBTÍTULO DINÁMICO BARRAS */}
                        <p className="text-[11px] font-bold text-slate-600 mt-1 uppercase flex flex-wrap gap-1 items-center">
                            <span>{selectedMonth !== null ? getMonthName(selectedMonth) : `Todo el ${year}`}</span>
                            {(selectedCatId || selectedSubCatName) && (
                                <>
                                    <span className="opacity-30 mx-1">/</span>
                                    <span className="text-indigo-500">
                                        {selectedSubCatName || data.categories.find((c: any) => c.id === selectedCatId)?.name}
                                    </span>
                                </>
                            )}
                        </p>
                        {selectedMonth !== null && (
                            <Button variant="ghost" size="sm" onClick={() => { setSelectedMonth(null); setSelectedDay(null); }} className="h-6 px-2 text-[9px] font-black uppercase bg-slate-100 rounded-lg hover:bg-slate-200">
                                <ArrowLeft size={10} className="mr-1"/> Volver al Año
                            </Button>
                        )}
                    </div>
                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart 
                                data={displayData.monthlyEvolution}
                                onClick={(state: any) => {
                                    const index = state?.activeTooltipIndex !== undefined ? Number(state.activeTooltipIndex) : null;
                                    if (index === null) return;
                                    if (selectedMonth === null) setSelectedMonth(index);
                                    else setSelectedDay(selectedDay === index + 1 ? null : index + 1);
                                }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: '900', fill: '#94a3b8'}} />
                                <YAxis hide />
                                <Tooltip formatter={formatCurrency} cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '1rem', border:'none', boxShadow:'0 10px 25px -3px rgba(0,0,0,0.1)'}} />
                                <Bar dataKey="gastos" name="Gastos" barSize={selectedMonth !== null ? 12 : 35} radius={[6, 6, 0, 0]}>
                                    {displayData.monthlyEvolution.map((entry: any, index: number) => {
                                        let isHighlighted = selectedDay === null || (index + 1) === selectedDay;
                                        let color = (selectedMonth !== null && (index + 1) === selectedDay) ? "#f43f5e" : "#818cf8";
                                        return <Cell key={`cell-${index}`} fill={color} fillOpacity={isHighlighted ? 1 : 0.2} className="cursor-pointer transition-all duration-300" />;
                                    })}
                                </Bar>
                                {!selectedCatId && !selectedSubCatName && (
                                    <Line type="stepAfter" dataKey="ingresos" stroke="#10b981" strokeWidth={3} dot={false} />
                                )}
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* DONUT CON HIGHLIGHT */}
                <Card className="lg:col-span-4 p-8 rounded-[3rem] border-slate-100 shadow-sm flex flex-col items-center">
                    <div className="w-full flex justify-between items-start mb-6">
                        <div className="flex flex-col">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">
                                {isDrillDown ? "Subcategorías" : "Categorías Principales"}
                            </h4>
                            {/* SUBTÍTULO DINÁMICO DONUT */}
                            <p className="text-[11px] font-bold text-indigo-600 mt-1 uppercase flex flex-wrap gap-1 items-center">
                                <span>{isDrillDown ? data.categories.find((c: any) => c.id === selectedCatId)?.name : "General"}</span>
                                <span className="opacity-30 mx-1 text-slate-400">/</span>
                                <span className="text-slate-600">
                                    {selectedDay 
                                        ? `${selectedDay} de ${getMonthName(selectedMonth!)}` 
                                        : selectedMonth !== null 
                                            ? getMonthName(selectedMonth) 
                                            : `Anual ${year}`}
                                </span>
                            </p>
                        </div>
                        {isDrillDown && (
                            <Button variant="ghost" size="sm" onClick={() => { setIsDrillDown(false); setSelectedCatId(null); setSelectedSubCatName(null); }} className="h-6 px-2 text-[9px] font-black uppercase bg-slate-100 rounded-lg hover:bg-slate-200">
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
                                    onClick={(entry: any) => {
                                        if (!isDrillDown) {
                                            setSelectedCatId(entry.payload.id);
                                            setIsDrillDown(true);
                                        } else {
                                            const subName = entry.payload.name;
                                            setSelectedSubCatName(selectedSubCatName === subName ? null : subName);
                                        }
                                    }}
                                    className="outline-none cursor-pointer"
                                >
                                    {(isDrillDown ? (displayData.subCategoryDistribution[selectedCatId!] || []) : displayData.categoryDistribution).map((entry: any, index: number) => {
                                        const isSelected = isDrillDown ? selectedSubCatName === entry.name : selectedCatId === entry.id;
                                        return <Cell 
                                            key={`cell-${index}`} 
                                            fill={entry.color} 
                                            stroke={isSelected ? "#000" : "none"}
                                            strokeWidth={2}
                                            fillOpacity={(!selectedSubCatName && !selectedCatId) || isSelected ? 1 : 0.3} 
                                        />;
                                    })}
                                </Pie>
                                <Tooltip formatter={formatCurrency} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="mt-6 w-full space-y-1.5 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                        {(isDrillDown ? (displayData.subCategoryDistribution[selectedCatId!] || []) : displayData.categoryDistribution).map((cat: any) => {
                            const isSelected = isDrillDown ? selectedSubCatName === cat.name : selectedCatId === cat.id;
                            return (
                                <div 
                                    key={cat.name} 
                                    className={cn(
                                        "flex items-center justify-between cursor-pointer p-1.5 rounded-xl transition-all",
                                        isSelected ? "bg-slate-100 shadow-sm" : "hover:bg-slate-50"
                                    )}
                                    onClick={() => {
                                        if (!isDrillDown) {
                                            setSelectedCatId(cat.id);
                                            setIsDrillDown(true);
                                        } else {
                                            setSelectedSubCatName(selectedSubCatName === cat.name ? null : cat.name);
                                        }
                                    }}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                                        <span className={cn("text-[9px] font-black uppercase truncate max-w-[110px]", isSelected ? "text-slate-900" : "text-slate-500")}>
                                            {cat.name}
                                        </span>
                                    </div>
                                    <span className="text-[9px] font-black text-slate-700 tabular-nums">{formatCurrency(cat.value)}</span>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            </div>
        </div>
    );
}