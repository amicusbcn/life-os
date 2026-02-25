'use client';

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Wallet, CalendarDays, Package,Wrench } from 'lucide-react';
import { useProperty } from "../context/PropertyContext";
import { updatePropertyModules } from "../actions"; // Asegúrate de tener esta acción o importarla bien
import { PropertyModules } from "@/types/properties";
import { toast } from "sonner";

// Definición de Módulos disponibles
const MODULE_DEFINITIONS: { id: keyof PropertyModules; label: string; icon: any; description: string }[] = [
    { id: 'finance', label: 'Finanzas', description: 'Gastos, botes y presupuestos.', icon: Wallet },
    { id: 'bookings', label: 'Reservas', description: 'Calendario de ocupación.', icon: CalendarDays },
    { id: 'inventory', label: 'Inventario', description: 'Control de stock y suministros.', icon: Package },
    { id: 'maintenance', label: 'Mantenimiento', description: 'Control de mantenimiento y reparaciones.', icon: Wrench },
];

export function PropertyModulesSettings() {
    const { property } = useProperty(); // Usamos el contexto para saber el estado actual
    const [loading, setLoading] = useState(false);

    const handleToggleModule = async (moduleId: keyof PropertyModules, isActive: boolean) => {
        setLoading(true);
        // Optimistic UI update (opcional, aquí hacemos update directo)
        try {
            const currentModules = property.active_modules || { finance: false, bookings: false, inventory: false,maintenance: false };
            const updatedModules = { ...currentModules, [moduleId]: isActive };
            
            await updatePropertyModules(property.id, updatedModules);
            toast.success("Módulos actualizados");
        } catch (error) {
            toast.error("Error al guardar configuración");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid gap-4">
            {MODULE_DEFINITIONS.map((mod) => {
                const isEnabled = property.active_modules?.[mod.id] || false;
                const Icon = mod.icon;
                
                return (
                <Card key={mod.id}>
                    <CardContent className="flex items-center justify-between p-6">
                        <div className="flex gap-4 items-center">
                            <div className={`p-2 rounded-lg transition-colors ${isEnabled ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                <Icon className="w-6 h-6" />
                            </div>
                            <div>
                                <Label htmlFor={`switch-${mod.id}`} className="text-base font-medium cursor-pointer">
                                    {mod.label}
                                </Label>
                                <p className="text-sm text-slate-500">{mod.description}</p>
                            </div>
                        </div>
                        <Switch 
                            id={`switch-${mod.id}`}
                            checked={isEnabled}
                            disabled={loading}
                            onCheckedChange={(val) => handleToggleModule(mod.id, val)}
                        />
                    </CardContent>
                </Card>
                )
            })}
        </div>
    );
}