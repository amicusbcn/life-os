'use client';

import Link from 'next/link';
import { useProperty } from '../context/PropertyContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PropertyAlert } from '@/types/properties';
import { 
    MapPin, Wifi, ShieldCheck, Home, 
    Wallet, CalendarDays, Package, Settings, ExternalLink 
} from 'lucide-react';
import { DashboardAlerts } from './DashboardAlerts';
import { Button } from '@/components/ui/button';

interface Props {
    alerts: PropertyAlert[];
}

export function PropertyDashboard({ alerts = [] }: Props) {
    const { property, can } = useProperty();

    // Módulos disponibles (Podríamos filtrar según property.active_modules si quisieras)
    const quickModules = [
        { label: 'Finanzas', icon: Wallet, href: '?section=modules', active: property.active_modules?.finance },
        { label: 'Reservas', icon: CalendarDays, href: '?section=modules', active: property.active_modules?.bookings },
        { label: 'Inventario', icon: Package, href: '?section=modules', active: property.active_modules?.inventory },
        { label: 'Ajustes', icon: Settings, href: `/properties/${property.slug}/settings`, active: can('edit_house') },
    ];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* === COLUMNA IZQUIERDA (PRINCIPAL) === */}
            <div className="lg:col-span-2 space-y-6">
                
                {/* 1. HERO CARD */}
                <Card className="relative overflow-hidden bg-slate-900 text-white border-none shadow-lg">
                    {/* Fondo decorativo (opcional) */}
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-indigo-600 rounded-full opacity-20 blur-3xl pointer-events-none"></div>
                    
                    <CardContent className="p-6 sm:p-8">
                        <div className="flex flex-col sm:flex-row gap-6">
                            
                            {/* Icono / Foto */}
                            <div className="flex-shrink-0">
                                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/10">
                                    <Home className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-300" />
                                </div>
                            </div>

                            {/* Info Texto */}
                            <div className="flex-1 space-y-2">
                                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{property.name}</h2>
                                
                                <div className="flex items-center text-slate-300 text-sm">
                                    <MapPin className="w-4 h-4 mr-1.5 text-indigo-400" />
                                    {property.address || "Sin dirección registrada"}
                                </div>
                                
                                <p className="text-slate-400 text-sm max-w-xl leading-relaxed pt-1">
                                    {property.description || "Gestiona todos los aspectos de tu propiedad desde este panel de control unificado."}
                                </p>
                            </div>
                        </div>

                        {/* ACCESOS RÁPIDOS (Módulos) */}
                        <div className="mt-8 pt-6 border-t border-white/10">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Acceso Rápido</h3>
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

                {/* 2. ACTIVITY PLACEHOLDER (Futuro widget de tareas/calendario) */}
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center bg-slate-50/50">
                    <CalendarDays className="w-10 h-10 text-slate-300 mb-3" />
                    <h3 className="text-sm font-semibold text-slate-900">Actividad Reciente</h3>
                    <p className="text-sm text-slate-500 max-w-sm mt-1">
                        Aquí verás las próximas entradas, tareas de limpieza pendientes y movimientos financieros.
                    </p>
                    <Button variant="link" className="mt-2 text-indigo-600">
                        Configurar Widgets <ExternalLink className="w-3 h-3 ml-1" />
                    </Button>
                </div>
            </div>

            {/* === COLUMNA DERECHA (LATERAL) === */}
            <div className="space-y-6">
                
                {/* 1. AVISOS (Ahora a la derecha) */}
                {/* Solo pintamos el contenedor si hay alertas o si es Admin (para ver el empty state en dashboard si quieres, aunque DashboardAlerts en readOnly suele ocultarse si está vacío) */}
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    <div className="p-4 border-b bg-slate-50/50 flex justify-between items-center">
                        <h3 className="font-semibold text-sm flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                              {alerts.length > 0 && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>}
                              <span className={`relative inline-flex rounded-full h-2 w-2 ${alerts.length > 0 ? 'bg-orange-500' : 'bg-slate-300'}`}></span>
                            </span>
                            Tablón de Avisos
                        </h3>
                        <span className="text-xs text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">{alerts.length}</span>
                    </div>
                    <div className="p-4">
                        {alerts.length > 0 ? (
                            <DashboardAlerts alerts={alerts} isReadOnly={true} />
                        ) : (
                            <p className="text-xs text-slate-400 text-center py-4 italic">No hay avisos activos.</p>
                        )}
                    </div>
                </div>

                {/* 2. ESTADO / WIFI */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-slate-500">Estado del Sistema</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-md">
                                    <Wifi className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-slate-500">Red WiFi</p>
                                    <p className="text-sm font-bold text-slate-800">Casa_Wifi_5G</p>
                                </div>
                            </div>
                            <div className="h-2 w-2 bg-green-500 rounded-full" title="Online"></div>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-md">
                                    <ShieldCheck className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-slate-500">Seguridad</p>
                                    <p className="text-sm font-bold text-slate-800">Todo OK</p>
                                </div>
                            </div>
                            <div className="text-xs font-bold text-emerald-600">ACTIVO</div>
                        </div>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}