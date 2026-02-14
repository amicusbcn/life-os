'use client';

import { useState } from 'react';
import { useProperty } from '../context/PropertyContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateProperty, createProperty } from '../actions';
import { toast } from "sonner";
import { Loader2, Wifi, Shield, Lock } from 'lucide-react'; // Iconos nuevos

interface Props {
    onSuccess?: () => void;
}

export function PropertyForm({ onSuccess }: Props) {
    const context = tryUseProperty(); 
    const property = context?.property;
    const [loading, setLoading] = useState(false);
    const isEditing = !!property;

    const handleSubmit = async (formData: FormData) => {
        setLoading(true);
        try {
            if (isEditing) {
                await updateProperty(property.id, formData);
                toast.success("Propiedad actualizada");
            } else {
                await createProperty(formData);
                toast.success("Propiedad creada correctamente");
                if (onSuccess) onSuccess();
            }
        } catch (error) {
            toast.error("Error al guardar");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Helpers seguros para leer los JSONs (por si vienen null)
    const wifi = property?.wifi_info || {};
    const insurance = property?.insurance_info || {};
    const security = property?.security_info || {};

    return (
        <form action={handleSubmit} className="space-y-8">
            
            {/* --- SECCIÓN 1: DATOS BÁSICOS --- */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium text-slate-900 border-b pb-2">Datos Básicos</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="name">Nombre de la Casa</Label>
                        <Input id="name" name="name" placeholder="Ej: Apartamento Playa" required defaultValue={property?.name || ''} />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="address">Dirección</Label>
                        <Input id="address" name="address" placeholder="Calle..." defaultValue={property?.address || ''} />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="description">Notas internas</Label>
                        <Textarea id="description" name="description" rows={3} defaultValue={property?.description || ''} />
                    </div>
                </div>
            </div>

            {/* --- SECCIÓN 2: CONECTIVIDAD (WIFI) --- */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 border-b pb-2 text-indigo-600">
                    <Wifi className="w-5 h-5" />
                    <h3 className="text-lg font-medium text-slate-900">WiFi e Internet</h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="wifi_ssid">Nombre de red (SSID)</Label>
                        <Input id="wifi_ssid" name="wifi_ssid" placeholder="MiCasa_5G" defaultValue={wifi.ssid || ''} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="wifi_password">Contraseña WiFi</Label>
                        <Input id="wifi_password" name="wifi_password" placeholder="clave1234" defaultValue={wifi.password || ''} />
                    </div>
                </div>
            </div>

            {/* --- SECCIÓN 3: SEGURIDAD (ALARMA) --- */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 border-b pb-2 text-rose-600">
                    <Lock className="w-5 h-5" />
                    <h3 className="text-lg font-medium text-slate-900">Seguridad y Alarma</h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                        <Label htmlFor="alarm_company">Empresa Alarma</Label>
                        <Input id="alarm_company" name="alarm_company" placeholder="Securitas..." defaultValue={security.company_name || ''} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="alarm_phone">Teléfono Central</Label>
                        <Input id="alarm_phone" name="alarm_phone" placeholder="900..." defaultValue={security.company_phone || ''} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="alarm_code">Código Desactivación</Label>
                        <Input id="alarm_code" name="alarm_code" placeholder="1234" className="font-mono bg-slate-50" defaultValue={security.alarm_code || ''} />
                    </div>
                </div>
            </div>

            {/* --- SECCIÓN 4: SEGURO --- */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 border-b pb-2 text-emerald-600">
                    <Shield className="w-5 h-5" />
                    <h3 className="text-lg font-medium text-slate-900">Seguro de Hogar</h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                        <Label htmlFor="insurance_provider">Aseguradora</Label>
                        <Input id="insurance_provider" name="insurance_provider" placeholder="Mapfre..." defaultValue={insurance.company || ''} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="insurance_policy">Nº Póliza</Label>
                        <Input id="insurance_policy" name="insurance_policy" placeholder="POL-123456" defaultValue={insurance.policy || ''} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="insurance_phone">Teléfono Asistencia</Label>
                        <Input id="insurance_phone" name="insurance_phone" placeholder="91..." defaultValue={insurance.phone || ''} />
                    </div>
                </div>
            </div>

            {/* BOTÓN */}
            <div className="pt-4 border-t">
                <Button type="submit" disabled={loading} className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEditing ? 'Guardar Todos los Datos' : 'Registrar Propiedad'}
                </Button>
            </div>
        </form>
    );
}

function tryUseProperty() {
    try { return useProperty(); } catch { return null; }
}