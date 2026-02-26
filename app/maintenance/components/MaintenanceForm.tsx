'use client';

import { useState, useRef, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Wrench, Camera, X, FileText } from 'lucide-react';

import { uploadFile } from '@/utils/uploads';
import { createMaintenanceTask } from '../actions';
import { ProgressiveLocationSelector } from '../../inventory/components/ProgressiveLocationSelector';
import { InventoryItemBase, InventoryLocation, Profile } from '@/types/inventory';
import { PropertyBase } from '@/types/properties';
import { Switch } from '@/components/ui/switch';

interface Props {
    propertyId?: string;      
    properties?: PropertyBase[];  
    userId?: string;           
    initialItemId?: string;
    initialItemName?: string;
    locations: any[]; // Array híbrido con flag is_personal
    inventoryItems: InventoryItemBase[];
    users?: Profile[];
    onSuccess?: () => void;
}

export function MaintenanceForm({ 
    propertyId: fixedPropertyId, 
    properties, 
    locations, 
    inventoryItems, 
    initialItemId, 
    initialItemName,
    onSuccess 
}: Props) {
    const [loading, setLoading] = useState(false);
    
    // --- 1. ESTADOS DE LOS TRES PASOS ---
    const [contextId, setContextId] = useState<string>(fixedPropertyId || "");
    const [locationId, setLocationId] = useState("");
    const [selectedItemId, setSelectedItemId] = useState(initialItemId || "");

    const isPersonal = contextId === 'personal';
    const [isRecurring, setIsRecurring] = useState(false);

    // --- 2. FILTRADO PARA EL PROGRESSIVE SELECTOR Y LOS ITEMS ---
    
    // Filtramos las ubicaciones que el ProgressiveSelector debe mostrar
    const filteredLocations = useMemo(() => {
        if (!contextId) return [];
        return locations.filter(loc => 
            isPersonal ? loc.is_personal : loc.property_id === contextId
        );
    }, [contextId, isPersonal, locations]);

    // Filtramos los items basándonos en el contexto Y la ubicación elegida en el progressive
    const availableItems = useMemo(() => {
        if (!contextId) return [];

        // 1. Filtramos por Ámbito (Propiedad vs Personal)
        const itemsInContext = inventoryItems.filter(item => {
            if (isPersonal) return !item.property_id;
            return item.property_id === contextId;
        });

        // 2. Si no hay ubicación, devolvemos todo el contexto
        if (!locationId || locationId === "none") return itemsInContext;

        // --- 3. LÓGICA DE HERENCIA ---
        // Buscamos todas las ubicaciones que son "hijas" de la seleccionada
        // (Incluyendo la propia ubicación seleccionada)
        const getChildIds = (parentId: string): string[] => {
            const children = locations
                .filter(loc => loc.parent_id === parentId)
                .map(loc => loc.id);
            
            // Buscamos nietos, bisnietos...
            const grandChildren = children.flatMap(id => getChildIds(id));
            
            return [parentId, ...children, ...grandChildren];
        };

        const allRelatedLocationIds = getChildIds(locationId);

        // 4. Filtramos ítems que estén en CUALQUIERA de esas ubicaciones
        return itemsInContext.filter(item => {
            const itemLocId = isPersonal ? item.location_id : item.property_location_id;
            return allRelatedLocationIds.includes(itemLocId||"");
        });
    }, [contextId, isPersonal, locationId, inventoryItems, locations]);
    
    // --- 3. GESTIÓN DE ARCHIVOS ---
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<{url: string, isPDF: boolean}[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        setSelectedFiles(prev => [...prev, ...files]);
        const newPreviews = files.map(file => ({
            url: URL.createObjectURL(file),
            isPDF: file.type === 'application/pdf'
        }));
        setPreviews(prev => [...prev, ...newPreviews]);
    };

    const removeFile = (index: number) => {
        URL.revokeObjectURL(previews[index].url);
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
        setPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (formData: FormData) => {
        const finalItemId = initialItemId || selectedItemId || ""; // Forzamos "" si no hay nada
        const finalContextId = contextId || fixedPropertyId || ""; // Forzamos "" si no hay nada

        if (!finalContextId && !finalItemId) {
            toast.error("Faltan datos del objeto o propiedad");
            return;
        }
        
        if (isPersonal && (!finalItemId || finalItemId === "none")) {
            toast.error("En tu inventario personal es obligatorio seleccionar el objeto.");
            return;
        }

        setLoading(true);
        try {
            const uploadedUrls: string[] = [];
            for (const file of selectedFiles) {
                const url = await uploadFile(file, { bucket: 'maintenance', folder: 'tasks' });
                uploadedUrls.push(url);
            }
            const recurring = formData.get('is_recurring') === 'true';
            if (recurring) {
                formData.set('type', 'preventivo');
            }
            if (finalItemId && finalItemId !== "none") {
                formData.append('itemId', finalItemId);
                formData.append('propertyId', isPersonal ? "" : finalContextId);
                // Limpiamos explícitamente las ubicaciones para que no haya conflictos
                formData.append('property_location_id', "");
                formData.append('inventory_location_id', "");
            }
            else if (locationId && locationId !== "none") {
                formData.append('itemId', "");
                formData.append('propertyId', finalContextId);
                if (isPersonal) {
                    formData.append('inventory_location_id', locationId);
                } else {
                    formData.append('property_location_id', locationId);
                }
            }
            
            formData.append('images', JSON.stringify(uploadedUrls)); 

            const response = await createMaintenanceTask(formData);
            if (response.success) {
                toast.success("Incidencia registrada correctamente");
                if (onSuccess) onSuccess();
            } else {
                toast.error(response.error || "Error al guardar");
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form action={handleSubmit} className="space-y-6 px-4">
            {/* --- BLOQUE DE SELECCIÓN CONTINUA (CONTEXTO > UBICACIÓN > ITEM) --- */}
            {!initialItemId ? (
                <div className="bg-slate-50 p-4 mt-12 rounded-3xl border border-slate-100 shadow-sm space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                        
                        {/* 1. ÁMBITO */}
                        <div className="space-y-1.5">
                            <Label className="text-[9px] font-black text-slate-400 uppercase tracking-tighter ml-1">1. Ámbito</Label>
                            {!fixedPropertyId ? (
                                <Select value={contextId} onValueChange={(v) => { setContextId(v); setLocationId(""); setSelectedItemId(""); }}>
                                    <SelectTrigger className="bg-white rounded-xl h-10 border-slate-200 text-xs shadow-sm py-6 w-full">
                                        <SelectValue placeholder="¿Dónde?" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="personal">👤 Personal</SelectItem>
                                        {properties?.map(p => (
                                            <SelectItem key={p.id} value={p.id}>🏢 {p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <div className="h-10 flex items-center px-3 bg-slate-100 rounded-xl text-[10px] font-bold text-slate-500 border border-slate-200">
                                    ID PROPIEDAD
                                </div>
                            )}
                        </div>

                        {/* 2. UBICACIÓN */}
                        <div className={`space-y-1.5 transition-all ${!contextId ? 'opacity-30 pointer-events-none grayscale' : ''}`}>
                            <Label className="text-[9px] font-black text-slate-400 uppercase tracking-tighter ml-1">2. Estancia</Label>
                            <ProgressiveLocationSelector 
                                locations={filteredLocations} 
                                value={locationId}
                                compact={true} // Podrías añadir esta prop a tu selector para reducir su altura
                                onChange={(val:any) => {
                                    setLocationId(val);
                                    setSelectedItemId("");
                                }}
                            />
                        </div>

                        {/* 3. OBJETO */}
                        <div className={`space-y-1.5 transition-all ${!contextId ? 'opacity-30 pointer-events-none' : ''}`}>
                            <Label className="text-[9px] font-black text-slate-400 uppercase tracking-tighter ml-1">3. Objeto</Label>
                            <Select value={selectedItemId} onValueChange={setSelectedItemId} disabled={availableItems.length === 0}>
                                <SelectTrigger className={`bg-white py-6 w-full rounded-xl h-10 border-slate-200 text-xs shadow-sm ${
                                    locationId && availableItems.length > 0 ? 'ring-2 ring-blue-50 border-blue-200' : ''
                                }`}>
                                    <SelectValue placeholder="Objeto..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {!isPersonal && <SelectItem value="none">General</SelectItem>}
                                    {availableItems.length > 0 ? (
                                        availableItems.map(item => (
                                            <SelectItem key={item.id} value={item.id} className="text-xs">{item.name}</SelectItem>
                                        ))
                                    ) : (
                                        <SelectItem value="none" disabled className="text-xs">Vacío</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            ): (
                /* MODO FICHA: Solo mostramos un pequeño badge informativo para confirmar el contexto */
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shrink-0">
                        <Wrench className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Nueva tarea para:</p>
                        <p className="text-sm font-bold text-blue-900">
                            {initialItemName}
                        </p>
                    </div>
                </div>
            )}

            {/* --- DATOS GENERALES --- */}
            <div className="space-y-4 px-1">
                <div className="space-y-2">
                    <Label className="font-bold text-slate-800 ml-1">¿Qué sucede? *</Label>
                    <Input name="title" placeholder="Ej: La caldera hace ruido" required className="rounded-2xl h-12 bg-white" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Tipo</Label>
                        <Select name="type" defaultValue="averia">
                            <SelectTrigger className="rounded-2xl h-12 bg-white"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="averia">Avería</SelectItem>
                                <SelectItem value="preventivo">Mantenimiento</SelectItem>
                                <SelectItem value="mejora">Mejora</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Prioridad</Label>
                        <Select name="priority" defaultValue="2">
                            <SelectTrigger className="rounded-2xl h-12 bg-white"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">🚨 Urgente</SelectItem>
                                <SelectItem value="2">📅 Normal</SelectItem>
                                <SelectItem value="3">☕ Baja</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Descripción</Label>
                    <Textarea name="description" placeholder="Detalles adicionales sobre el problema..." className="min-h-[100px] rounded-2xl bg-white resize-none" />
                </div>
            </div>
            {/* --- RECURRENCIA --- */}
            <div className={`p-5 rounded-3xl border transition-all duration-300 ${isRecurring ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">Mantenimiento Periódico</Label>
                        <p className="text-[10px] text-slate-500 italic">¿Quieres programar esta tarea de forma recurrente?</p>
                    </div>
                    <Switch 
                        checked={isRecurring} 
                        onCheckedChange={setIsRecurring} 
                    />
                    {/* Input oculto para el FormData */}
                    <input type="hidden" name="is_recurring" value={String(isRecurring)} />
                </div>

                {isRecurring && (
                    <div className="grid grid-cols-2 gap-4 mt-5 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-orange-600 ml-1">Frecuencia</Label>
                            <div className="relative">
                                <Input 
                                    name="frequency_months" 
                                    type="number" 
                                    min="1"
                                    defaultValue={6}
                                    className="rounded-2xl h-12 bg-white border-orange-200 pl-4 pr-12 focus-visible:ring-orange-500"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-orange-400">MESES</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-orange-600 ml-1">Siguiente fecha</Label>
                            <Input 
                                name="next_occurrence" 
                                type="date" 
                                defaultValue={new Date().toISOString().split('T')[0]}
                                className="rounded-2xl h-12 bg-white border-orange-200 focus-visible:ring-orange-500"
                            />
                        </div>
                    </div>
                )}
            </div>
            {/* --- MULTIMEDIA --- */}
            <div className="space-y-3 px-1">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Evidencias (Fotos / PDF)</Label>
                <div className="flex flex-wrap gap-2">
                    {previews.map((preview, index) => (
                        <div key={index} className="relative h-20 w-20 rounded-2xl overflow-hidden border bg-white group shadow-sm">
                            {preview.isPDF ? <div className="flex items-center justify-center h-full"><FileText className="text-slate-300" /></div> : <img src={preview.url} className="object-cover h-full w-full" />}
                            <button type="button" onClick={() => removeFile(index)} className="absolute top-0 right-0 bg-red-500 text-white p-1.5 rounded-bl-xl opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
                        </div>
                    ))}
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="h-20 w-20 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:bg-white hover:border-blue-300 hover:text-blue-500 transition-all">
                        <Camera size={20} />
                        <span className="text-[10px] mt-1 font-bold">AÑADIR</span>
                    </button>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple accept="image/*,application/pdf" className="hidden" />
            </div>

            <Button type="submit" disabled={loading} className="w-full bg-slate-900 text-white h-14 rounded-2xl shadow-xl font-bold text-lg hover:bg-black transition-all">
                {loading ? <Loader2 className="animate-spin mr-2" /> : <Wrench className="mr-2 h-5 w-5" />}
                Registrar Incidencia
            </Button>
        </form>
    );
}