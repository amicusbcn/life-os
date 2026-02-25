'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Box, PackageOpen } from "lucide-react";
import { InventoryCategory, InventoryLocation } from '@/types/inventory';
import Link from 'next/link'; // <--- Importante: Usamos Link ahora

interface Props {
    items: any[];
    categories: InventoryCategory[];
    locations: InventoryLocation[];
    currentPropertyId?: string;
}

export function InventoryListView({ items, categories, locations, currentPropertyId }: Props) {

    // Helper para manejar URLs de imágenes
    const getImageUrl = (path: string) => {
        if (!path) return null;
        return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/inventory/${path}`;
    };

    // Helper para la ubicación
    const getLocationName = (item: any) => {
        const loc = item.property_locations || item.inventory_locations;
        if (!loc) return null;
        if (loc.parent?.name) return `${loc.parent.name} → ${loc.name}`;
        return loc.name;
    };

    if (!items?.length) {
        return (
            <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-xl bg-slate-50/50">
                <PackageOpen className="w-10 h-10 text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium">No hay ítems aquí todavía.</p>
            </div>
        );
    }
    console.log("     -------     IDs de los items:", items.map(i => i.id));
    return (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
                const locationName = getLocationName(item);
                
                return (
                    /* CAMBIO CLAVE: Envolvemos la Card en un Link. 
                       La ruta debe coincidir con la que definimos en el interceptor: /inventory/item/[id]
                    */
                    <Link 
                        key={item.id} 
                        href={`/inventory/item/${item.id}`} 
                        scroll={false} // Evita que la página haga scroll al inicio al abrir el modal
                    >
                        <Card className="overflow-hidden hover:shadow-md transition-all cursor-pointer group border-slate-200 h-full">
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
                                    {item.inventory_categories && (
                                        <div className="absolute top-1 left-1">
                                            <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm text-[10px] px-1.5 h-5 shadow-sm border-0 uppercase font-bold">
                                                {item.inventory_categories.name}
                                            </Badge>
                                        </div>
                                    )}
                                </div>
                                
                                {/* INFO */}
                                <div className="p-3 flex flex-col justify-between flex-grow min-w-0">
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-slate-800 truncate pr-2 leading-tight uppercase italic text-sm" title={item.name}>
                                            {item.name}
                                        </h3>
                                        {item.brand && (
                                            <p className="text-[10px] text-slate-400 truncate mt-0.5 font-bold uppercase tracking-tighter">
                                                {item.brand} {item.model}
                                            </p>
                                        )}
                                    </div>
                                    
                                    <div className="flex flex-col gap-1 mt-2">
                                        {locationName && (
                                            <div className="flex items-center text-[10px] text-slate-500 bg-slate-50 w-fit px-1.5 py-0.5 rounded border border-slate-100 font-medium">
                                                <MapPin className="h-2.5 w-2.5 mr-1 text-slate-400" />
                                                <span className="truncate max-w-[100px]">{locationName}</span>
                                            </div>
                                        )}
                                        {item.price && (
                                            <span className="text-xs font-black text-slate-900 italic">
                                                {item.price} €
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                );
            })}
        </div>
    );
}