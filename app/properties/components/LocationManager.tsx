'use client';

import { useState, useEffect } from 'react';
import { ZoneWithRooms } from '@/types/properties';
import { addLocation, deleteLocation, reorderLocations } from '../actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Box, BedDouble } from 'lucide-react';
import { SortableItem } from './SortableItem';

// DND KIT
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useProperty } from '../context/PropertyContext';

interface Props { propertyId: string; zones: ZoneWithRooms[]; }

export function LocationManager({ propertyId, zones: initialZones }: Props) {
  const { can } = useProperty(); // <--- Permisos
  const isEditable = can('edit_structure');
  const [zones, setZones] = useState(initialZones);
  
  // Sincronizar si vienen datos nuevos del servidor
  useEffect(() => { setZones(initialZones) }, [initialZones]);

  const [newZoneName, setNewZoneName] = useState('');
  const [childInputs, setChildInputs] = useState<Record<string, { name: string, type: string }>>({});

  // Sensores para detectar el arrastre (Ratón y Teclado)
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  // --- HANDLERS ---

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // 1. Calculamos el nuevo orden en el array local
    setZones((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);
      
      // 2. Preparamos datos para guardar en servidor
      // Asignamos sort_order basado en el índice del array (0, 1, 2...)
      const updates = newItems.map((item, index) => ({
        id: item.id,
        sort_order: index
      }));

      // 3. Llamada al servidor (Fire & Forget visual)
      reorderLocations(updates, propertyId);
      
      return newItems;
    });
  };

  const handleAddZone = async () => {
    if(!newZoneName) return;
    await addLocation(propertyId, null, newZoneName, 'zone'); // Sin orden manual
    setNewZoneName('');
  };

  const handleAddChild = async (zoneId: string) => {
    const input = childInputs[zoneId];
    if(!input?.name) return;
    await addLocation(propertyId, zoneId, input.name, input.type || 'bedroom'); // Sin orden manual
    setChildInputs(prev => ({ ...prev, [zoneId]: { name: '', type: 'bedroom' } }));
  };

  // --- RENDER ---

  return (
    <div className="space-y-6">
      
      {/* 1. CREAR ZONA (Simple) */}
      {isEditable && (
        <div className="flex gap-2 items-end bg-slate-50 p-4 rounded-lg border">
            <div className="flex-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Nueva Zona</label>
                <Input 
                    value={newZoneName} 
                    onChange={e => setNewZoneName(e.target.value)} 
                    placeholder="Nombre (ej: Planta Baja)..." 
                    onKeyDown={e => e.key === 'Enter' && handleAddZone()}
                />
            </div>
            <Button onClick={handleAddZone} disabled={!newZoneName}><Plus className="w-4 h-4 mr-2"/> Crear</Button>
        </div>
      )}

      {/* 2. LISTA DRAG & DROP */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={zones} strategy={verticalListSortingStrategy}>
            
            <Accordion type="multiple" className="w-full space-y-2">
                {zones.map(zone => (
                    <SortableItem key={zone.id} id={zone.id} className="bg-white border rounded-lg">
                        
                        <AccordionItem value={zone.id} className="border-0">
                            <div className="flex items-center pr-2">
                                {/* Trigger del acordeón */}
                                <AccordionTrigger className="hover:no-underline py-3 px-2 flex-1">
                                    <div className="flex items-center gap-2">
                                        <Box className="w-5 h-5 text-blue-600"/>
                                        <span className="font-semibold">{zone.name}</span>
                                    </div>
                                </AccordionTrigger>
                                
                                {/* Botón Borrar */}
                                {isEditable && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500"
                                        onClick={(e) => {
                                            e.stopPropagation(); // Que no se abra el acordeón
                                            if(confirm("¿Borrar zona?")) deleteLocation(zone.id, propertyId);
                                        }}
                                    >
                                        <Trash2 className="w-4 h-4"/>
                                    </Button>
                                )}
                            </div>

                            <AccordionContent className="px-4 pb-4 border-t border-slate-100 bg-slate-50/50">
                                {/* LISTA DE HIJOS (Sin DND por ahora para simplificar, pero usa el mismo orden visual) */}
                                <div className="space-y-2 mt-2 mb-4">
                                    {zone.rooms.map(room => (
                                        <div key={room.id} className="flex justify-between items-center bg-white p-2 rounded border shadow-sm text-sm">
                                            <div className="flex items-center gap-2">
                                                <BedDouble className="w-4 h-4 text-slate-400"/>
                                                <span>{room.name}</span>
                                                <span className="text-[10px] bg-slate-100 px-1 rounded uppercase tracking-wide text-slate-500">{room.type}</span>
                                            </div>
                                            {isEditable && (
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteLocation(room.id, propertyId)}>
                                                    <Trash2 className="w-3 h-3 text-red-400"/>
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* AÑADIR HIJO */}
                                {isEditable && (
                                    <div className="flex gap-2">
                                        <Select 
                                            value={childInputs[zone.id]?.type || 'bedroom'} 
                                            onValueChange={(val) => setChildInputs(p => ({...p, [zone.id]: {...p[zone.id], type: val}}))}
                                        >
                                            <SelectTrigger className="w-[120px] h-9 bg-white"><SelectValue placeholder="Tipo" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="bedroom">Dormitorio</SelectItem>
                                                <SelectItem value="bathroom">Baño</SelectItem>
                                                <SelectItem value="living">Salón</SelectItem>
                                                <SelectItem value="kitchen">Cocina</SelectItem>
                                                <SelectItem value="outdoor">Exterior</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Input 
                                            className="h-9 flex-1 bg-white" 
                                            placeholder="Nombre..."
                                            value={childInputs[zone.id]?.name || ''}
                                            onChange={e => setChildInputs(p => ({...p, [zone.id]: {...p[zone.id], name: e.target.value}}))}
                                            onKeyDown={e => e.key === 'Enter' && handleAddChild(zone.id)}
                                        />
                                        <Button size="sm" variant="secondary" onClick={() => handleAddChild(zone.id)}><Plus className="w-4 h-4"/></Button>
                                    </div>
                                )}
                            </AccordionContent>
                        </AccordionItem>

                    </SortableItem>
                ))}
            </Accordion>

        </SortableContext>
      </DndContext>
    </div>
  );
}