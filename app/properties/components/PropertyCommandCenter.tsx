'use client';

import { useState } from 'react';
import { useProperty } from '../context/PropertyContext';
import { PropertyAlert } from '@/types/properties';
import { 
    Wifi, Shield, FileText, Bell, 
    Copy, Eye, EyeOff, Phone, QrCode 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import QRCode from "react-qr-code";

// 1. IMPORTAMOS TU COMPONENTE EXISTENTE
import { DashboardAlerts } from './DashboardAlerts';

interface Props {
    alerts: PropertyAlert[];
}

export function PropertyCommandCenter({ alerts }: Props) {
    const { property } = useProperty();
    const [showAlarmCode, setShowAlarmCode] = useState(false);

    const wifi = property.wifi_info || {};
    const security = property.security_info || {};
    const insurance = property.insurance_info || {};

    const wifiQrString = `WIFI:T:WPA;S:${wifi.ssid};P:${wifi.password};;`;

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Copiado al portapapeles");
    };

    return (
        <Card className="h-full border-none shadow-md bg-white overflow-hidden flex flex-col">
            <Tabs defaultValue={alerts.length > 0 ? "alerts" : "wifi"} className="w-full flex flex-col h-full">
                
                {/* --- BARRA DE PESTAÑAS --- */}
                <div className="px-4 pt-0">
                    <TabsList className="w-full grid grid-cols-4 bg-slate-200/50 p-1 mb-0">
                        <TabsTrigger value="alerts" className="data-[state=active]:bg-white data-[state=active]:text-orange-600 relative">
                            <Bell className="w-4 h-4" />
                            {alerts.length > 0 && (
                                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-orange-500 ring-2 ring-white" />
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="wifi" className="data-[state=active]:bg-white data-[state=active]:text-blue-600">
                            <Wifi className="w-4 h-4" />
                        </TabsTrigger>
                        <TabsTrigger value="security" className="data-[state=active]:bg-white data-[state=active]:text-rose-600">
                            <Shield className="w-4 h-4" />
                        </TabsTrigger>
                        <TabsTrigger value="insurance" className="data-[state=active]:bg-white data-[state=active]:text-emerald-600">
                            <FileText className="w-4 h-4" />
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* --- CONTENIDO --- */}
                <div className="flex-1 p-0 bg-white">
                    
                    {/* 1. TAB AVISOS (INTEGRADO CON TU COMPONENTE) */}
                    <TabsContent value="alerts" className="m-0 h-full">
                        <div className="p-4 h-full overflow-y-auto max-h-[300px]">
                            <div className="mb-2 flex items-center justify-between">
                                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tablón de Avisos</h3>
                            </div>

                            {/* LÓGICA DE ESTADO VACÍO */}
                            {/* Tu componente devuelve null si isReadOnly es true y no hay alertas. 
                                Por eso manejamos el estado vacío aquí para que quede bonito en el widget. */}
                            {alerts.length === 0 ? (
                                <div className="text-center py-12 text-slate-400">
                                    <Bell className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                    <p className="text-sm font-medium">Todo en orden</p>
                                    <p className="text-xs opacity-70">No hay avisos activos</p>
                                </div>
                            ) : (
                                /* AQUÍ USAMOS TU COMPONENTE */
                                <DashboardAlerts alerts={alerts} isReadOnly={true} />
                            )}
                        </div>
                    </TabsContent>

                    {/* 2. TAB WIFI */}
                    <TabsContent value="wifi" className="m-0 h-full">
                        <div className="p-6 flex flex-col items-center justify-center text-center space-y-4 h-full">
                            {!wifi.ssid ? (
                                <div className="text-slate-400 text-sm">No hay WiFi configurado.</div>
                            ) : (
                                <>
                                    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 mb-2">
                                        <Wifi className="w-6 h-6" />
                                    </div>
                                    <div className="w-full space-y-1">
                                        <p className="text-xs text-slate-400 uppercase font-medium">Red (SSID)</p>
                                        <p className="text-lg font-bold text-slate-900 select-all">{wifi.ssid}</p>
                                    </div>
                                    <div className="w-full space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-100 relative group">
                                        <p className="text-xs text-slate-400 uppercase font-medium">Contraseña</p>
                                        <p className="font-mono text-base text-slate-700">{wifi.password}</p>
                                        <Button 
                                            variant="ghost" size="icon" 
                                            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => copyToClipboard(wifi.password || '')}
                                        >
                                            <Copy className="w-4 h-4 text-slate-400" />
                                        </Button>
                                    </div>
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" className="w-full gap-2 text-blue-600 border-blue-100 hover:bg-blue-50">
                                                <QrCode className="w-4 h-4" /> Ver Código QR
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-xs flex flex-col items-center justify-center p-8">
                                            <div className="p-4 bg-white rounded-xl shadow-inner border mb-4">
                                                <QRCode value={wifiQrString} size={180} />
                                            </div>
                                            <p className="font-bold text-lg">{wifi.ssid}</p>
                                        </DialogContent>
                                    </Dialog>
                                </>
                            )}
                        </div>
                    </TabsContent>

                    {/* 3. TAB SEGURIDAD */}
                    <TabsContent value="security" className="m-0 h-full">
                        <div className="p-6 space-y-5 h-full">
                            <div className="flex items-center gap-3 text-rose-600 mb-2">
                                <Shield className="w-5 h-5" />
                                <span className="font-semibold text-slate-900">Sistema de Alarma</span>
                            </div>
                            {!security.company_name ? (
                                <p className="text-slate-400 text-sm">No hay alarma configurada.</p>
                            ) : (
                                <>
                                    <div className="space-y-1">
                                        <p className="text-xs text-slate-400 uppercase">Empresa</p>
                                        <p className="font-medium text-slate-900">{security.company_name}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-slate-400 uppercase">Código Desactivación</p>
                                        <div className="flex items-center gap-2">
                                            <div className={`flex-1 p-2 rounded bg-rose-50 font-mono text-center font-bold tracking-widest ${showAlarmCode ? 'text-rose-700' : 'text-rose-300'}`}>
                                                {showAlarmCode ? security.alarm_code : '••••'}
                                            </div>
                                            <Button variant="outline" size="icon" onClick={() => setShowAlarmCode(!showAlarmCode)}>
                                                {showAlarmCode ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                                            </Button>
                                        </div>
                                    </div>
                                    {security.company_phone && (
                                        <Button variant="outline" className="w-full mt-4 gap-2 text-slate-600" asChild>
                                            <a href={`tel:${security.company_phone}`}>
                                                <Phone className="w-4 h-4" /> Llamar Central
                                            </a>
                                        </Button>
                                    )}
                                </>
                            )}
                        </div>
                    </TabsContent>

                    {/* 4. TAB SEGURO */}
                    <TabsContent value="insurance" className="m-0 h-full">
                        <div className="p-6 space-y-5 h-full">
                             <div className="flex items-center gap-3 text-emerald-600 mb-2">
                                <FileText className="w-5 h-5" />
                                <span className="font-semibold text-slate-900">Seguro de Hogar</span>
                            </div>
                            {!insurance.company ? (
                                <p className="text-slate-400 text-sm">No hay seguro registrado.</p>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <p className="text-xs text-slate-400 uppercase">Compañía</p>
                                            <p className="font-medium text-slate-900">{insurance.company}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-slate-400 uppercase">Teléfono</p>
                                            <a href={`tel:${insurance.phone}`} className="text-emerald-600 hover:underline text-sm block truncate">
                                                {insurance.phone || '-'}
                                            </a>
                                        </div>
                                    </div>
                                    <div className="space-y-1 pt-2">
                                        <p className="text-xs text-slate-400 uppercase">Número de Póliza</p>
                                        <div className="p-2 bg-slate-50 border rounded font-mono text-sm text-slate-700 flex justify-between items-center group">
                                            <span className="truncate">{insurance.policy}</span>
                                            <Copy 
                                                className="w-3 h-3 text-slate-300 cursor-pointer hover:text-emerald-600" 
                                                onClick={() => copyToClipboard(insurance.policy || '')}
                                            />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </TabsContent>

                </div>
            </Tabs>
        </Card>
    );
}