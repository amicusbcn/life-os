'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    Info, Wrench, Package, Edit3, Trash2, Box, 
    ExternalLink, Plus, History, ArrowLeft 
} from 'lucide-react';
import { InventoryForm } from './InventoryForm'; 
import { ScrollArea } from "@/components/ui/scroll-area";
import { addInventoryLink, deleteInventoryItem } from '../actions'; 
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ItemTransferDialog } from './ItemTransferDialog';
import { MaintenanceList } from './MaintenanceList';
import { LoansList } from './LoanList';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { MaintenanceTask } from '@/types/maintenance';
import {  PropertyLocation, PropertySummary } from '@/types/properties';
import { InventoryCategory, InventoryItem } from '@/types/inventory';

interface Props {
    item: InventoryItem;               
    categories: InventoryCategory[];
    locations: any[];
    properties: PropertySummary[];
    tasks: MaintenanceTask[]; 
    availableProfiles: any[];
    isAdmin?: boolean;       
}

export function InventoryItemDetailView({ 
    item, 
    categories, 
    locations, 
    properties, 
    tasks,
    availableProfiles,
    isAdmin = true 
}: Props) {
    const [isEditing, setIsEditing] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        if (confirm("¿Estás seguro de que quieres eliminar este objeto?")) {
            const res = await deleteInventoryItem(item.id, item.photo_path??null);
            if (res.success) {
                toast.success("Objeto eliminado");
                router.push('/inventory/all'); // Redirigir tras borrar
            }
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* CABECERA PRINCIPAL */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-6">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 shrink-0 border shadow-sm">
                        <Package className="w-8 h-8" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                             <Badge variant="outline" className="text-[10px] uppercase font-black tracking-widest border-slate-200">
                                {categories.find(c => c.id === item.category_id)?.name || 'Sin Categoría'}
                             </Badge>
                             <span className="text-slate-300">•</span>
                             <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">
                                SN: {item.serial_number || 'N/A'}
                             </span>
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 leading-tight tracking-tighter uppercase italic">
                            {item.name}
                        </h1>
                        <p className="text-slate-500 font-medium">
                            {item.brand} {item.model}
                        </p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <ItemTransferDialog 
                        item={item} 
                        properties={properties} 
                        onTransferSuccess={() => router.refresh()} 
                    />
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)} className="gap-2 font-bold uppercase text-[10px]">
                        <Edit3 className="w-3.5 h-3.5" /> {isEditing ? 'Cancelar' : 'Editar'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleDelete} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="details" className="w-full">
                <TabsList className="w-full justify-start bg-transparent border-b rounded-none h-auto p-0 mb-8 space-x-8">
                    <TabsTrigger value="details" className="tab-trigger-custom">
                        <Info className="w-4 h-4 mr-2" /> Información
                    </TabsTrigger>
                    <TabsTrigger value="maintenance" className="tab-trigger-custom">
                        <Wrench className="w-4 h-4 mr-2" /> Mantenimiento
                    </TabsTrigger>
                    <TabsTrigger value="loans" className="tab-trigger-custom">
                        <History className="w-4 h-4 mr-2" /> Historial Préstamos
                    </TabsTrigger>
                </TabsList>

                {/* CONTENIDO: DETALLES */}
                <TabsContent value="details" className="focus-visible:ring-0">
                    {isEditing ? (
                        <div className="max-w-2xl bg-slate-50 p-6 rounded-2xl border">
                            <InventoryForm 
                                item={item} 
                                categories={categories} 
                                locations={locations} 
                                onSuccess={() => setIsEditing(false)} 
                            />
                        </div>
                    ) : (
                        <InventoryItemReadOnly item={item} />
                    )}
                </TabsContent>

                {/* CONTENIDO: MANTENIMIENTO */}
                <TabsContent value="maintenance">
                    <div className="max-w-3xl">
                        <MaintenanceList 
                            itemId={item.id} 
                            tasks={tasks}
                        />
                    </div>
                </TabsContent>

                {/* CONTENIDO: PRÉSTAMOS */}
                <TabsContent value="loans">
                    <div className="max-w-3xl">
                        <LoansList 
                            id={item.id}
                            loans={item.inventory_loans || []}
                            onMutation={() => router.refresh()} 
                        />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

// Subcomponente de Lectura (Misma lógica que tenías pero más espaciado)
function InventoryItemReadOnly({ item }: { item: any }) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-1 space-y-6">
                <div className="aspect-square bg-slate-50 rounded-3xl border shadow-inner flex items-center justify-center overflow-hidden">
                    {item.photo_path ? (
                        <img 
                            src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/inventory/${item.photo_path}`} 
                            className="w-full h-full object-contain p-6"
                            alt={item.name}
                        />
                    ) : (
                        <Box className="w-20 h-20 text-slate-200" />
                    )}
                </div>
                
                <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                    <p className="text-[10px] font-black uppercase text-indigo-400 mb-2">Ubicación Actual</p>
                    <p className="font-bold text-indigo-900 flex items-center gap-2">
                        <Box className="w-4 h-4" /> {item.property_locations?.name || 'Sin asignar'}
                    </p>
                </div>
            </div>

            <div className="lg:col-span-2 space-y-10">
                <div className="grid grid-cols-2 gap-y-8 gap-x-12">
                    <DataField label="Fabricante" value={item.brand} />
                    <DataField label="Modelo" value={item.model} />
                    <DataField label="Precio" value={item.price ? `${item.price} €` : null} />
                    <DataField label="Compra" value={item.purchase_date ? new Date(item.purchase_date).toLocaleDateString() : null} />
                    <DataField 
                        label="Garantía" 
                        value={item.warranty_end_date ? new Date(item.warranty_end_date).toLocaleDateString() : null}
                        color={new Date(item.warranty_end_date) < new Date() ? 'text-red-500 font-bold' : ''}
                    />
                </div>

                <div className="pt-8 border-t space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Enlaces y Documentos</h4>
                    <div className="flex flex-wrap gap-2">
                        {item.external_links?.map((link: any, idx: number) => (
                            <a key={idx} href={link.url} target="_blank" className="bg-white border px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-sm">
                                <ExternalLink className="w-3.5 h-3.5 text-blue-500" /> {link.title}
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function DataField({ label, value, color }: any) {
    return (
        <div className="space-y-1">
            <p className="text-[10px] uppercase font-black tracking-widest text-slate-300">{label}</p>
            <p className={`text-sm font-bold ${color || 'text-slate-700'}`}>
                {value || <span className="text-slate-300 italic font-normal text-xs uppercase">No indicado</span>}
            </p>
        </div>
    );
}