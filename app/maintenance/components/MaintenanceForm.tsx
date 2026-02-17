'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Wrench, AlertTriangle, Lightbulb } from 'lucide-react';

import { createMaintenanceTask } from '../actions';
import { ProgressiveLocationSelector } from '../../inventory/components/ProgressiveLocationSelector';
import { InventoryItem, InventoryLocation } from '@/types/inventory';

interface Props {
    propertyId: string;
    locations: InventoryLocation[];
    inventoryItems: InventoryItem[]; // Para vincular a objetos
    users: any[]; // Usuarios de la casa para asignar
    initialItemId?: string; // Por si viene desde el Sheet de un objeto
    onSuccess?: () => void;
}

export function MaintenanceForm({ 
    propertyId, 
    locations, 
    inventoryItems, 
    users, 
    initialItemId, 
    onSuccess 
}: Props) {
    const [loading, setLoading] = useState(false);
    const [locationId, setLocationId] = useState("");
    const [selectedItemId, setSelectedItemId] = useState(initialItemId || "");

    const handleSubmit = async (formData: FormData) => {
        setLoading(true);
        try {
            // Inyectamos datos que no son inputs nativos simples
            formData.append('propertyId', propertyId);
            formData.append('locationId', locationId);
            formData.append('itemId', selectedItemId);

            const response = await createMaintenanceTask(formData);
            
            if (response.success) {
                toast.success("Tarea registrada correctamente");
                if (onSuccess) onSuccess();
            } else {
                toast.error(response.error || "Error al crear la tarea");
            }
        } catch (error) {
            toast.error("Error inesperado");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form action={handleSubmit} className="space-y-6">
            {/* 1. TÍTULO Y TIPO */}
            <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="space-y-2">
                    <Label htmlFor="title" className="font-bold">¿Qué ocurre? *</Label>
                    <Input id="title" name="title" placeholder="Ej: Grifo cocina gotea" required className="bg-white rounded-xl" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Tipo de Tarea</Label>
                        <Select name="type" defaultValue="averia">
                            <SelectTrigger className="bg-white rounded-xl">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="averia">
                                    <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500"/> Avería</div>
                                </SelectItem>
                                <SelectItem value="preventivo">
                                    <div className="flex items-center gap-2"><Wrench className="h-4 w-4 text-blue-500"/> Mantenimiento</div>
                                </SelectItem>
                                <SelectItem value="mejora">
                                    <div className="flex items-center gap-2"><Lightbulb className="h-4 w-4 text-yellow-500"/> Mejora</div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Prioridad</Label>
                        <Select name="priority" defaultValue="2">
                            <SelectTrigger className="bg-white rounded-xl"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">🚨 Urgente</SelectItem>
                                <SelectItem value="2">📅 Normal</SelectItem>
                                <SelectItem value="3">☕ Baja</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* 2. VINCULACIÓN (OBJETO O UBICACIÓN) */}
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label className="text-xs font-black text-slate-400 uppercase tracking-widest">Vincular a Objeto (Opcional)</Label>
                    <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                        <SelectTrigger className="rounded-xl">
                            <SelectValue placeholder="Ningún objeto seleccionado" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Ninguno</SelectItem>
                            {inventoryItems.map(item => (
                                <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs font-black text-slate-400 uppercase tracking-widest">Ubicación</Label>
                    <ProgressiveLocationSelector 
                        locations={locations} 
                        value={locationId}
                        onChange={setLocationId}
                    />
                </div>
            </div>

            {/* 3. ASIGNACIÓN Y DETALLES */}
            <div className="space-y-4 border-t pt-4">
                <div className="space-y-2">
                    <Label>Responsable / Asignado a</Label>
                    <Select name="assignedTo">
                        <SelectTrigger className="rounded-xl"><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                        <SelectContent>
                            {users.map(u => (
                                <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Descripción / Notas iniciales</Label>
                    <Textarea 
                        name="description" 
                        placeholder="Explica un poco más el problema..." 
                        className="min-h-[100px] rounded-xl"
                    />
                </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full bg-slate-900 hover:bg-slate-800 text-white h-12 rounded-xl shadow-lg">
                {loading ? <Loader2 className="animate-spin mr-2" /> : <Wrench className="mr-2 h-4 w-4" />}
                Registrar Tarea
            </Button>
        </form>
    );
}