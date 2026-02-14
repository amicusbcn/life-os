'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { addLocation, deleteLocation, reorderLocations } from '../actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Box, Component, GripVertical, ChevronRight, Loader2 } from 'lucide-react';
import { SortableItem } from './SortableItem'; 

// DND KIT
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useProperty } from '../context/PropertyContext';
import { toast } from "sonner";

// --- UTILIDAD: CONVERTIR LISTA PLANA A ÁRBOL ---
function buildTree(flatItems: any[]) {
    if (!flatItems) return [];

    const rootItems: any[] = [];
    const lookup: Record<string, any> = {};

    // 1. Inicializar mapa y asegurar que todos tengan array de hijos
    flatItems.forEach(item => {
        lookup[item.id] = { ...item, children: [] };
    });

    // 2. Conectar cada item con su padre
    flatItems.forEach(item => {
        if (item.parent_id && lookup[item.parent_id]) {
            // Si tiene padre, nos metemos en su array children
            lookup[item.parent_id].children.push(lookup[item.id]);
        } else {
            // Si no tiene padre (o el padre no está), es un item raíz
            rootItems.push(lookup[item.id]);
        }
    });

    // 3. (Opcional) Ordenar recursivamente si usas sort_order
    const sortFn = (a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0);
    const recursiveSort = (nodes: any[]) => {
        nodes.sort(sortFn);
        nodes.forEach(node => {
            if (node.children.length > 0) recursiveSort(node.children);
        });
    };
    
    recursiveSort(rootItems);

    return rootItems;
}

// --- SUB-COMPONENTE: NODO RECURSIVO ---
interface NodeProps {
    item: any;
    isEditable: boolean;
    propertyId: string;
    onAddChild: (parentId: string, name: string, type: string) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}

function LocationNode({ item, isEditable, propertyId, onAddChild, onDelete }: NodeProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState('');
    const [newType, setNewType] = useState('room');
    const [loading, setLoading] = useState(false);

    const handleAddClick = async () => {
        if(!newName) return;
        setLoading(true);
        await onAddChild(item.id, newName, newType);
        setLoading(false);
        setNewName('');
        setIsAdding(false);
    };

    return (
        <SortableItem id={item.id} className="mb-2">
            <AccordionItem value={item.id} className="border rounded-lg bg-white shadow-sm">
                <div className="flex items-center px-2 group">
                    <AccordionTrigger className="hover:no-underline py-3 px-0 flex-1">
                        <div className="flex items-center gap-2">
                            {item.type === 'zone' || item.type === 'floor' 
                                ? <Box className="w-4 h-4 text-indigo-600"/> 
                                : <Component className="w-4 h-4 text-slate-500"/>
                            }
                            <span className="font-semibold text-sm text-slate-700">{item.name}</span>
                            <span className="ml-2 text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 uppercase tracking-wide border border-slate-200">
                                {item.type === 'bedroom' ? 'Dormitorio' : 
                                item.type === 'kitchen' ? 'Cocina' : 
                                item.type === 'bathroom' ? 'Baño' : 
                                item.type === 'living' ? 'Salón' :
                                item.type === 'outdoor' ? 'Exterior' :
                                item.type === 'element' ? 'Elemento' :
                                item.type === 'room' ? 'Habitación' :
                                item.type === 'zone' || item.type === 'floor' ? 'Zona' :
                                item.type}
                            </span>
                        </div>
                    </AccordionTrigger>

                    {isEditable && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity mr-2">
                             <Button 
                                variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-indigo-600"
                                onClick={(e) => { e.stopPropagation(); setIsAdding(!isAdding); }}
                            >
                                <Plus className="w-4 h-4"/>
                            </Button>
                            <Button 
                                variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-500"
                                onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                            >
                                <Trash2 className="w-4 h-4"/>
                            </Button>
                        </div>
                    )}
                </div>

                <AccordionContent className=" pb-3 border-t bg-slate-50/50 pt-3">
                    {/* FORMULARIO AÑADIR HIJO */}
                    {isAdding && (
                        <div className="flex gap-2 mb-3 items-center animate-in fade-in slide-in-from-top-1">
                            <ChevronRight className="w-4 h-4 text-slate-300"/>
                            <Select value={newType} onValueChange={setNewType}>
                                <SelectTrigger className="w-[110px] h-8 text-xs bg-white"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="zone">Sub-Zona</SelectItem>
                                    <SelectItem value="room">Habitación</SelectItem>
                                    <SelectItem value="element">Elemento</SelectItem>
                                </SelectContent>
                            </Select>
                            <Input 
                                className="h-8 text-sm flex-1 bg-white" 
                                placeholder="Nombre..."
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddClick()}
                            />
                            <Button size="sm" className="h-8" disabled={loading} onClick={handleAddClick}>
                                {loading ? <Loader2 className="w-3 h-3 animate-spin"/> : 'Añadir'}
                            </Button>
                        </div>
                    )}

                    {/* RECURSIVIDAD: Renderizar hijos */}
                    {item.children && item.children.length > 0 ? (
                        <div className="">
                            <SortableContext items={item.children} strategy={verticalListSortingStrategy}>
                                {item.children.map((child: any) => (
                                    <LocationNode 
                                        key={child.id} 
                                        item={child} 
                                        isEditable={isEditable} 
                                        propertyId={propertyId}
                                        onAddChild={onAddChild}
                                        onDelete={onDelete}
                                    />
                                ))}
                            </SortableContext>
                        </div>
                    ) : (
                        !isAdding && <p className="text-xs text-slate-400 italic pl-4">Vacío</p>
                    )}
                </AccordionContent>
            </AccordionItem>
        </SortableItem>
    );
}

// --- MANAGER PRINCIPAL ---
interface Props { propertyId: string; zones: any[]; }

export function LocationManager({ propertyId, zones: rawData }: Props) {
    const { can } = useProperty();
    const isEditable = can('edit_structure');
    const router = useRouter();
    
    // 1. Convertimos la Data Plana a Árbol cada vez que cambie rawData
    const treeData = useMemo(() => buildTree(rawData || []), [rawData]);

    const [newRootName, setNewRootName] = useState('');
    const [loadingRoot, setLoadingRoot] = useState(false);

    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

    // --- ACCIONES ---

    const handleAddRoot = async () => {
        if(!newRootName) return;
        setLoadingRoot(true);
        try {
            await addLocation(propertyId, null, newRootName, 'zone');
            setNewRootName('');
            router.refresh(); // <--- CLAVE: Refrescar la página para ver el cambio
            toast.success("Zona creada");
        } catch(e) {
            toast.error("Error al crear");
        } finally {
            setLoadingRoot(false);
        }
    };

    const handleAddChild = async (parentId: string, name: string, type: string) => {
        try {
            await addLocation(propertyId, parentId, name, type);
            router.refresh(); // <--- CLAVE
            toast.success("Añadido");
        } catch(e) {
            toast.error("Error al añadir");
        }
    };

    const handleDelete = async (id: string) => {
        if(!confirm("¿Borrar ubicación y todo su contenido?")) return;
        try {
            await deleteLocation(id, propertyId);
            router.refresh(); // <--- CLAVE
            toast.success("Eliminado");
        } catch(e) {
            toast.error("Error al borrar");
        }
    };

    // Lógica DND simplificada para nivel raíz (para evitar complejidad recursiva extrema en este paso)
    // Si necesitas ordenar hijos, el sortableContext anidado ya ayuda, pero la actualización al servidor 
    // requiere saber en qué "nivel" estamos.
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        
        // Solo reordenamos visualmente el nivel raíz por simplicidad de la demo
        // (Para reordenar hijos profundos necesitaríamos un handler recursivo más complejo que actualice el array plano)
        // Aquí asumimos reordenamiento de hermanos en el mismo nivel visual.
        
        // NOTA: Para producción completa recursiva, necesitarías aplanar el árbol modificado y enviarlo.
        // Por ahora, refrescamos para mantener consistencia.
        toast.info("Reordenamiento pendiente de implementación recursiva completa");
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <p className="text-sm text-slate-500 max-w-md">
                    Define las zonas (plantas, áreas) y sus contenidos. Puedes crear tantos niveles como necesites.
                </p>
            </div>

            {/* CREAR ROOT */}
            {isEditable && (
                <div className="flex gap-2 items-center bg-slate-50 p-3 rounded border border-dashed border-slate-300">
                    <Input 
                        value={newRootName} 
                        onChange={e => setNewRootName(e.target.value)} 
                        placeholder="Nombre de nueva Zona Principal (ej: Planta Baja)..." 
                        className="bg-white"
                        onKeyDown={e => e.key === 'Enter' && handleAddRoot()}
                    />
                    <Button onClick={handleAddRoot} disabled={!newRootName || loadingRoot}>
                        {loadingRoot ? <Loader2 className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4 mr-2"/>}
                        Crear Zona
                    </Button>
                </div>
            )}

            {/* ÁRBOL */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={treeData} strategy={verticalListSortingStrategy}>
                    <Accordion type="multiple" className="w-full space-y-2">
                        {treeData.map((node: any) => (
                            <LocationNode 
                                key={node.id} 
                                item={node} 
                                isEditable={isEditable} 
                                propertyId={propertyId}
                                onAddChild={handleAddChild}
                                onDelete={handleDelete}
                            />
                        ))}
                    </Accordion>
                </SortableContext>
            </DndContext>

            {treeData.length === 0 && (
                <div className="text-center py-10 text-slate-400 border-2 border-dashed rounded-xl">
                    <Box className="w-10 h-10 mx-auto mb-2 opacity-20"/>
                    <p>No hay estructura definida aún.</p>
                </div>
            )}
        </div>
    );
}