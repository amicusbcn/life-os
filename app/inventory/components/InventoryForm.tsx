'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Save, Plus } from 'lucide-react';

// 1. IMPORTAR LAS NUEVAS ACCIONES
import { createInventoryItem, updateInventoryItem } from '../actions'; 
import { InventoryCategory, InventoryItem, InventoryLocation } from '@/types/inventory';
import { ProgressiveLocationSelector } from './ProgressiveLocationSelector';

interface Props {
    categories: InventoryCategory[];
    locations: InventoryLocation[];
    item?: InventoryItem; 
    onSuccess?: () => void;
    propertyId?: string;
}

export function InventoryForm({ categories, locations, item, onSuccess, propertyId }: Props) {
    const [loading, setLoading] = useState(false);
    
    // ✨ ESTADO PARA LA UBICACIÓN (Para el selector progresivo)
    const [locationId, setLocationId] = useState(item?.location_id || "");

    const isEditing = !!item?.id;

    const handleSubmit = async (formData: FormData) => {
        setLoading(true);
        try {
            if (propertyId) formData.append('propertyId', propertyId);
            if (isEditing) formData.append('id', item.id);
            
            // ✨ INYECTAMOS EL VALOR DEL SELECTOR PROGRESIVO
            // Como el selector no es un input nativo, lo metemos a mano aquí
            formData.append('locationId', locationId);

            const response = isEditing 
                ? await updateInventoryItem(formData)
                : await createInventoryItem(formData);
            
            if (response.success) {
                toast.success(isEditing ? "Cambios guardados" : "Ítem registrado correctamente");
                if (onSuccess) onSuccess();
            } else {
                toast.error(response.error || "Error al procesar la solicitud");
            }
        } catch (error) {
            console.error(error);
            toast.error("Ocurrió un error inesperado");
        } finally {
            setLoading(false);
        }
    };
    return (
        <form action={handleSubmit} className="space-y-6 pb-4 px-4">
        <div className="space-y-2">
            <Label htmlFor="name">Nombre del objeto</Label>
            <Input id="name" name="name" defaultValue={item?.name} required />
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label>Marca</Label>
                <Input name="brand" defaultValue={item?.brand} placeholder="Ej: Sony" />
            </div>
            <div className="space-y-2">
                <Label>Modelo</Label>
                <Input name="model" defaultValue={item?.model} placeholder="Ej: WH-1000XM4" />
            </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label>Categoría</Label>
                <Select name="categoryId" defaultValue={item?.category_id || "no-category"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="no-category">Sin categoría</SelectItem>
                        {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label className="text-sm font-bold">Ubicación Exacta</Label>
                <ProgressiveLocationSelector 
                        locations={locations} 
                        value={locationId}
                        onChange={(id: string) => setLocationId(id)}
                    />
            </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
                <Label>Precio (€)</Label>
                <Input name="price" type="number" step="0.01" defaultValue={item?.price} />
            </div>
            <div className="space-y-2">
                <Label>Fecha Compra</Label>
                <Input name="purchase_date" type="date" defaultValue={item?.purchase_date} />
            </div>
            <div className="space-y-2">
                <Label>Fin Garantía</Label>
                <Input name="warranty_end_date" type="date" defaultValue={item?.warranty_end_date} />
            </div>
        </div>

        <div className="space-y-2">
            <Label>Número de Serie</Label>
            <Input name="serial_number" defaultValue={item?.serial_number} placeholder="SN-123456..." />
        </div>

        <div className="space-y-2">
            <Label>Foto</Label>
            <Input name="photo" type="file" accept="image/*" />
        </div>

        <Button type="submit" disabled={loading} className="w-full">
            {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
            {item?.id ? 'Guardar Cambios' : 'Crear Ítem'}
        </Button>
    </form>
    );
}