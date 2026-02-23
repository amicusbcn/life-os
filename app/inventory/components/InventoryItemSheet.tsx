'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Info, Wrench, UserMinus, Loader2, Package, Edit3, Trash2, Box, ExternalLink, Plus } from 'lucide-react';
import { InventoryForm } from './InventoryForm'; 
// Asumimos que crearás estos dos para listar los datos que faltan
// import { MaintenanceList } from './MaintenanceList'; 
// import { LoansList } from './LoansList'; 
import { ScrollArea } from "@/components/ui/scroll-area";
import { addInventoryLink, deleteInventoryItem, getInventoryItemDetails } from '../actions'; 
import { toast } from 'sonner';
import { useProperty } from '@/app/properties/context/PropertyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ItemTransferDialog } from './ItemTransferDialog';
import { Property } from '@/types/properties';
import { MaintenanceList } from './MaintenanceList';
import { LoansList } from './LoanList';

interface Props {
    basicItem: any; // Datos rápidos que ya vienen de la lista
    categories: any[];
    locations: any[];
    propertyId?: string;
    onClose: () => void;
    properties: Property[];
    availableProfiles: any[];
}

export function InventoryItemSheet({ basicItem, categories, locations, propertyId, onClose, properties,availableProfiles }: Props) {
    console.log("LOG 3 [ItemSheet]:", properties);
    const [isEditing, setIsEditing] = useState(false);
    const [fullItem, setFullItem] = useState<any>(null); 
    const [loading, setLoading] = useState(true);
    
    // Obtener todas las propiedades para el diálogo de traspaso (vienen de la vista principal)
    // Para simplificar, asumimos que las pasamos por props o las recuperamos
    // Pero por ahora, el componente las necesitará.

    let propertyContext: any = null;
    try { propertyContext = useProperty(); } catch (e) { propertyContext = null; }
    
    const canManage = !propertyId || (propertyContext?.can && propertyContext.can('edit_house'));

    useEffect(() => {
        loadDetails();
    }, [basicItem.id]);

    const itemToDisplay = fullItem || basicItem;

    const handleDelete = async () => {
        if (confirm("¿Estás seguro de que quieres eliminar este objeto?")) {
            const res = await deleteInventoryItem(basicItem.id, basicItem.photo_path);
            if (res.success) {
                toast.success("Objeto eliminado");
                onClose();
            }
        }
    };

    const loadDetails = async () => {
        setLoading(true);
        try {
            const data = await getInventoryItemDetails(basicItem.id);
            setFullItem(data);
        } catch (error) {
            toast.error("Error al refrescar datos");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col pt-2 px-4">
            {/* 1. CABECERA LIMPIA (Solo info) */}
            <div className="flex items-center gap-4 mb-6 px-1">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 shrink-0">
                    <Package className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                    <h2 className="text-xl font-bold text-slate-900 leading-tight truncate">
                        {itemToDisplay.name}
                    </h2>
                    <p className="text-sm text-slate-500 truncate">
                        {itemToDisplay.brand} {itemToDisplay.model}
                    </p>
                </div>
            </div>

            <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="w-full justify-start border-b rounded-none px-0 bg-transparent h-auto mb-1">
                    <TabsTrigger value="details" className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 px-4 pb-2 font-semibold text-xs uppercase tracking-wider">
                        Detalles
                    </TabsTrigger>
                    <TabsTrigger value="maintenance" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 px-4 pb-2 font-semibold text-xs uppercase tracking-wider">
                        Mantenimiento
                    </TabsTrigger>
                    <TabsTrigger value="loans" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 px-4 pb-2 font-semibold text-xs uppercase tracking-wider">
                        Préstamos
                    </TabsTrigger>
                </TabsList>

                <ScrollArea className="flex-1 pr-4">
                    <TabsContent value="details" className="mt-0 space-y-6">
                        
                        {/* 2. BARRA DE ACCIONES DE GESTIÓN (Solo en modo lectura y si tiene permiso) */}
                        {canManage && (
                            <div className="flex items-center justify-between bg-slate-50 px-2 mb-0 rounded-lg border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400 uppercase ml-2">Gestión del ítem</span>
                                <div className="flex gap-2">
                                    {!isEditing ? (
                                        <>
                                            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="h-8 text-xs gap-2 hover:bg-white hover:shadow-sm">
                                                <Edit3 className="w-3.5 h-3.5" /> Editar
                                            </Button>
                                            
                                            {/* BOTÓN TRASPASO (Implementado) */}
                                            <ItemTransferDialog 
                                                item={itemToDisplay} 
                                                properties={properties}
                                                onTransferSuccess={onClose} 
                                            />

                                            <Button variant="ghost" size="sm" onClick={handleDelete} className="h-8 text-xs gap-2 text-red-600 hover:bg-red-50 hover:text-red-700">
                                                <Trash2 className="w-3.5 h-3.5" /> Eliminar
                                            </Button>
                                        </>
                                    ) : (
                                        <Button variant="secondary" size="sm" onClick={() => setIsEditing(false)} className="h-8 text-xs">
                                            Cancelar Edición
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}

                        {isEditing ? (
                            <InventoryForm 
                                item={itemToDisplay} 
                                categories={categories} 
                                locations={locations} 
                                propertyId={propertyId}
                                onSuccess={() => setIsEditing(false)} 
                            />
                        ) : (
                            <InventoryItemReadOnly item={itemToDisplay} />
                        )}
                    </TabsContent>

                    {/* TAB 2: MANTENIMIENTO */}
                    <TabsContent value="maintenance" className="mt-0">
                        {loading ? (
                            <div className="flex flex-col items-center py-10 text-slate-400">
                                <Loader2 className="animate-spin mb-2" />
                                <span className="text-sm">Cargando historial...</span>
                            </div>
                        ) : (
                            <MaintenanceList 
                                itemId={itemToDisplay.id} 
                            />
                        )}
                    </TabsContent>

                    {/* TAB 3: PRÉSTAMOS */}
                    <TabsContent value="loans" className="mt-0">
                        {loading ? (
                             <div className="flex flex-col items-center py-10 text-slate-400">
                                <Loader2 className="animate-spin mb-2" />
                                <span className="text-sm">Consultando historial...</span>
                             </div>
                        ) : (
                            <LoansList 
                                id={itemToDisplay.id}
                                loans={itemToDisplay.inventory_loans || []}
                                onMutation={loadDetails} // <-- Esta es la clave para que la Card cambie a "Devuelto" al instante
                            />
                        )}
                    </TabsContent>
                </ScrollArea>
            </Tabs>
        </div>
    );
}

function InventoryItemReadOnly({ item }: { item: any }) {
    const [isAddingLink, setIsAddingLink] = useState(false);
    const [newLink, setNewLink] = useState({ title: '', url: '' });

    const handleSaveLink = async () => {
        if (!newLink.title || !newLink.url) return;
        const res = await addInventoryLink(item.id, item.external_links, newLink);
        if (res.success) {
            setIsAddingLink(false);
            setNewLink({ title: '', url: '' });
            toast.success("Enlace añadido");
        }
    };
    
    // Helper para formatear fechas
    const formatDate = (date: string) => date ? new Date(date).toLocaleDateString('es-ES') : '-';

    return (
        <div className="space-y-6">
            {/* IMAGEN */}
            <div className="aspect-video w-full bg-slate-50 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-100 shadow-inner">
                {item.photo_path ? (
                    <img 
                        src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/inventory/${item.photo_path}`} 
                        className="w-full h-full object-contain p-4"
                    />
                ) : (
                    <Box className="w-12 h-12 text-slate-200" />
                )}
            </div>

            {/* GRID DE DATOS TÉCNICOS */}
            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                    <DataField label="Marca / Fabricante" value={item.brand} />
                    <DataField label="Modelo" value={item.model} />
                    <DataField label="Número de Serie" value={item.serial_number} mono />
                </div>
                <div className="space-y-4">
                    <DataField label="Precio de compra" value={item.price ? `${item.price} €` : null} />
                    <DataField label="Fecha de compra" value={formatDate(item.purchase_date)} />
                    <DataField 
                        label="Fin de Garantía" 
                        value={formatDate(item.warranty_end_date)} 
                        // Ponemos en rojo si ha caducado
                        color={new Date(item.warranty_end_date) < new Date() ? 'text-red-500' : 'text-slate-700'}
                    />
                </div>
            </div>

            <div className="pt-4 border-t">
                <div className="flex justify-between items-center mb-4">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Enlaces y Recursos</p>
                    <Button variant="ghost" size="xs" onClick={() => setIsAddingLink(true)} className="h-6 text-indigo-600">
                        <Plus className="w-3 h-3 mr-1" /> Añadir
                    </Button>
                </div>

                {/* Lista de Enlaces */}
                <div className="flex flex-wrap gap-2 mb-4">
                    {item.external_links?.map((link: any, idx: number) => (
                        <a key={idx} href={link.url} target="_blank" className="bg-slate-100 px-3 py-1 rounded-full text-xs flex items-center gap-2 hover:bg-slate-200">
                            <ExternalLink className="w-3 h-3" /> {link.title}
                        </a>
                    ))}
                </div>

                {/* Formulario rápido para nuevo enlace */}
                {isAddingLink && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-dashed border-slate-200 space-y-3">
                        <Input 
                            placeholder="Título (ej: Manual PDF)" 
                            value={newLink.title} 
                            onChange={e => setNewLink({...newLink, title: e.target.value})}
                            className="h-8 text-xs"
                        />
                        <Input 
                            placeholder="URL (https://...)" 
                            value={newLink.url} 
                            onChange={e => setNewLink({...newLink, url: e.target.value})}
                            className="h-8 text-xs"
                        />
                        <div className="flex gap-2">
                            <Button size="sm" className="h-7 text-xs flex-1" onClick={handleSaveLink}>Guardar</Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs flex-1" onClick={() => setIsAddingLink(false)}>Cancelar</Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function DataField({ label, value, mono, color }: any) {
    return (
        <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{label}</p>
            <p className={`text-sm font-medium ${color || 'text-slate-700'} ${mono ? 'font-mono text-xs' : ''}`}>
                {value || <span className="text-slate-300 italic">No especificado</span>}
            </p>
        </div>
    );
}