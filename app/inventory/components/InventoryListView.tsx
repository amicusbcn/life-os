'use client';

import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MapPin, Box, Tag, PackageOpen } from "lucide-react";
import { InventoryForm } from './InventoryForm'; 
import { InventoryItem, InventoryCategory, InventoryLocation } from '@/types/inventory';
import { InventoryItemSheet } from './InventoryItemSheet';
import { Property } from '@/types/properties';
import { getAvailableProfiles } from '../data';

interface Props {
    items: any[]; // Usamos any aquí temporalmente porque el join de Supabase devuelve estructuras complejas
    categories: InventoryCategory[];
    locations: InventoryLocation[]; // O UnifiedLocation
    currentPropertyId?: string;
    availableProperties?:Property[];
    availableProfiles?:any[];
}

export function InventoryListView({ items, categories, locations, currentPropertyId,availableProperties,availableProfiles }: Props) {
    console.log("LOG 2 [ListView]:", availableProperties);
    const [editingItem, setEditingItem] = useState<any | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    // Helper para manejar URLs de imágenes (Supabase Storage)
    const getImageUrl = (path: string) => {
        if (!path) return null;
        if (path.startsWith('http')) return path; // Por si acaso guardaste URL completa
        // Ajusta 'inventory-images' al nombre real de tu bucket
        return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/inventory/${path}`;
    };

    // Helper para saber el nombre de la ubicación (Sea personal o de propiedad)
    const getLocationName = (item: any) => {
        const loc = item.property_locations || item.inventory_locations;
        if (!loc) return null;
        
        // Si tienes el parent cargado en la query:
        if (loc.parent?.name) {
            return `${loc.parent.name} → ${loc.name}`;
        }
        return loc.name;
    };

    if (!items?.length) {
        return (
            <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-xl bg-slate-50/50">
                <PackageOpen className="w-10 h-10 text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium">No hay ítems aquí todavía.</p>
                <p className="text-xs text-slate-400">Añade el primero desde el menú lateral.</p>
            </div>
        );
    }

    return (
        <>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => {
                    const locationName = getLocationName(item);
                    
                    return (
                        <Card 
                            key={item.id} 
                            className="overflow-hidden hover:shadow-md transition-all cursor-pointer group border-slate-200"
                            onClick={() => {
                                setEditingItem(item);
                                setIsSheetOpen(true);
                            }}
                        >
                            <CardContent className="p-0 flex h-28 sm:h-32">
                                {/* FOTO */}
                                <div className="w-28 sm:w-32 bg-slate-100 flex-shrink-0 flex items-center justify-center overflow-hidden border-r border-slate-100 relative">
                                    {item.photo_path ? (
                                        <img 
                                            src={getImageUrl(item.photo_path) || ''} 
                                            alt={item.name} 
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <Box className="text-slate-300 h-8 w-8" />
                                    )}
                                    {/* Categoría Badge flotante (opcional) */}
                                    {item.inventory_categories && (
                                        <div className="absolute top-1 left-1">
                                            <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm text-[10px] px-1.5 h-5 shadow-sm border-0">
                                                {item.inventory_categories.name}
                                            </Badge>
                                        </div>
                                    )}
                                </div>
                                
                                {/* INFO */}
                                <div className="p-3 flex flex-col justify-between flex-grow min-w-0">
                                    <div>
                                        <h3 className="font-semibold text-slate-800 truncate pr-2" title={item.name}>
                                            {item.name}
                                        </h3>
                                        {item.model && (
                                            <p className="text-xs text-slate-500 truncate mt-0.5">{item.model}</p>
                                        )}
                                    </div>
                                    
                                    <div className="flex flex-col gap-1 mt-2">
                                        {/* Ubicación */}
                                        {locationName ? (
                                            <div className="flex items-center text-xs text-slate-500 bg-slate-50 w-fit px-1.5 py-0.5 rounded border border-slate-100">
                                                <MapPin className="h-3 w-3 mr-1 text-slate-400" />
                                                <span className="truncate max-w-[120px]">{locationName}</span>
                                            </div>
                                        ) : (
                                            <div className="h-5" /> // Espaciador si no hay ubicación
                                        )}
                                        
                                        {/* Precio (si existe) */}
                                        {item.price && (
                                            <span className="text-xs font-medium text-slate-900">
                                                {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(item.price)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* SHEET DE EDICIÓN */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              {/* AUMENTAMOS EL ANCHO AQUÍ: sm:max-w-2xl (aprox 670px) o 3xl */}
              <SheetContent className="w-full sm:max-w-2xl flex flex-col"> 
                  
                  {/* Usamos el nuevo componente organizado */}
                  {editingItem && (
                      <InventoryItemSheet 
                          basicItem={editingItem}
                          categories={categories}
                          locations={locations}
                          propertyId={currentPropertyId}
                          onClose={() => setIsSheetOpen(false)}
                          properties={availableProperties || []}
                          availableProfiles={availableProfiles || []}
                      />
                  )}
              </SheetContent>
          </Sheet>
        </>
    );
}