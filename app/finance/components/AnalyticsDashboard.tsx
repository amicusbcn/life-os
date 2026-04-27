'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Card } from '@/components/ui/card';
import { TrendingDown, Calendar, PieChart as PieIcon } from 'lucide-react';

export function AnalyticsDashboard({ data, year }: any) {
    return (
        <div className="space-y-6">
            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-6 bg-slate-900 text-white rounded-[2rem] border-none shadow-xl">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-500/20 rounded-2xl">
                            <TrendingDown className="text-indigo-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Gasto Total {year}</p>
                            <h3 className="text-2xl font-black italic">
                                {data.totalSpent.toLocaleString('es-ES')} €
                            </h3>
                        </div>
                    </div>
                </Card>
                {/* Puedes añadir más cards aquí (Media mensual, etc) */}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* EVOLUCIÓN MENSUAL (70%) */}
                <Card className="lg:col-span-8 p-6 rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 mb-8">
                        <Calendar size={16} className="text-indigo-500" />
                        <h4 className="text-sm font-black uppercase italic tracking-tighter">Evolución de Gastos</h4>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.monthlyEvolution}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} />
                                <Tooltip 
                                    cursor={{fill: '#f8fafc'}}
                                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar 
                                    dataKey="total" 
                                    radius={[6, 6, 0, 0]} 
                                    fill="#6366f1"
                                    isAnimationActive={true}
                                    animationDuration={1500}
                                    animationEasing="ease-out"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* DISTRIBUCIÓN POR CATEGORÍA (30%) */}
                <Card className="lg:col-span-4 p-6 rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 mb-8">
                        <PieIcon size={16} className="text-indigo-500" />
                        <h4 className="text-sm font-black uppercase italic tracking-tighter">Distribución</h4>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data.categoryDistribution}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    isAnimationActive={true}
                                    animationDuration={1000}
                                >
                                    {data.categoryDistribution.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>
        </div>
    );
}