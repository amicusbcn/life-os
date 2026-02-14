'use client';

import { useProperty } from '../context/PropertyContext';
import { PropertyAlert } from '@/types/properties';
import { Home, MapPin, Wallet, CalendarDays, Package, Settings } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import Link from 'next/link';

// Importamos el nuevo componente
import { PropertyCommandCenter } from './PropertyCommandCenter';

interface Props {
    alerts: PropertyAlert[];
}

export function PropertyDashboard({ alerts = [] }: Props) {
    const { property, can } = useProperty();
    const quickModules = [
        { label: 'Gastos', icon: Wallet, href: '?section=modules', active: property.active_modules?.finance },
        { label: 'Turnos', icon: CalendarDays, href: '?section=modules', active: property.active_modules?.bookings },
        { label: 'Inventario', icon: Package, href: `/properties/${property.slug}/inventory`, active: property.active_modules?.inventory },
        { label: 'Ajustes', icon: Settings, href: `/properties/${property.slug}/settings`, active: can('edit_house') },
    ];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* === COLUMNA IZQUIERDA (INFO GENERAL) === */}
            <div className="lg:col-span-2 space-y-6">
                
                {/* HERO CARD (Igual que antes) */}
                <Card className="relative overflow-hidden bg-slate-900 text-white border-none shadow-lg">
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-indigo-600 rounded-full opacity-20 blur-3xl pointer-events-none"></div>
                    <CardContent className="p-6 sm:p-8">
                        <div className="flex flex-col sm:flex-row gap-6">
                            <div className="flex-shrink-0">
                                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/10">
                                    <Home className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-300" />
                                </div>
                            </div>
                            <div className="flex-1 space-y-2">
                                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{property.name}</h2>
                                <div className="flex items-center text-slate-300 text-sm">
                                    <MapPin className="w-4 h-4 mr-1.5 text-indigo-400" />
                                    {property.address || "Sin dirección registrada"}
                                </div>
                                <p className="text-slate-400 text-sm max-w-xl leading-relaxed pt-1 line-clamp-2">
                                    {property.description || "Panel de control de la propiedad."}
                                </p>
                            </div>
                        </div>

                        {/* ACCESOS RÁPIDOS */}
                        <div className="mt-8 pt-6 border-t border-white/10">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Módulos</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {quickModules.map((mod) => (
                                    <Link key={mod.label} href={mod.href} className={!mod.active ? 'pointer-events-none' : ''}>
                                        <div className={`
                                            group flex flex-col items-center justify-center p-3 rounded-xl border transition-all
                                            ${mod.active 
                                                ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-indigo-500/50 cursor-pointer' 
                                                : 'bg-transparent border-transparent opacity-30 cursor-not-allowed'}
                                        `}>
                                            <mod.icon className={`w-5 h-5 mb-2 ${mod.active ? 'text-indigo-300 group-hover:text-indigo-200' : 'text-slate-500'}`} />
                                            <span className="text-xs font-medium text-slate-200">{mod.label}</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* PLACEHOLDER ACTIVIDAD */}
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center bg-slate-50/50 min-h-[200px]">
                    <CalendarDays className="w-10 h-10 text-slate-300 mb-3" />
                    <h3 className="text-sm font-semibold text-slate-900">Actividad Reciente</h3>
                    <p className="text-sm text-slate-500 mt-1">
                        Próximamente: Historial de tareas y eventos.
                    </p>
                </div>
            </div>

            {/* === COLUMNA DERECHA (CENTRO DE MANDO) === */}
            <div className="lg:col-span-1 h-full min-h-[400px]">
                {/* ¡AQUÍ ESTÁ LA MAGIA! UN SOLO COMPONENTE */}
                <PropertyCommandCenter alerts={alerts} />
            </div>

        </div>
    );
}