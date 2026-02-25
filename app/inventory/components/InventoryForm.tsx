'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Save, Plus } from 'lucide-react';
import { uploadFile } from '@/utils/uploads';
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
    
    const [locationId, setLocationId] = useState(item?.property_location_id || item?.location_id || "");

    const isEditing = !!item?.id;

    const handleSubmit = async (formData: FormData) => {
        setLoading(true);
        try {
            if (propertyId) formData.append('propertyId', propertyId);
            if (isEditing) formData.append('id', item.id);
            
            // 📸 GESTIÓN DE LA FOTO
            const photoFile = formData.get('photo') as File;
            
            // Solo subimos si hay un archivo y tiene nombre (evita subidas vacías)
            if (photoFile && photoFile.size > 0) {
                // Subimos al bucket 'inventory' (ajusta el nombre del bucket si es otro)
                const photoPath = await uploadFile(photoFile, { 
                    bucket: 'inventory', 
                    folder: propertyId || 'personal' 
                });
                
                // Reemplazamos el archivo por el string del path en el formDat

                // Forzamos que se guarde solo el path si por error viene la URL completa
                const cleanPath = photoPath.includes('public/inventory/') 
                    ? photoPath.split('public/inventory/')[1] 
                    : photoPath;

                formData.set('photo_path', cleanPath);
            }

            // ✨ INYECTAMOS LA UBICACIÓN
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
            console.error("Error en handleSubmit:", error);
            toast.error("Ocurrió un error al subir la imagen o guardar los datos");
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