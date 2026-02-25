'use client';

import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronLeft, MapPin, Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export function ProgressiveLocationSelector({ locations, value, onChange }: any) {
    const [open, setOpen] = useState(false);
    const [currentParentId, setCurrentParentId] = useState<string | null>(null);

    // Encontrar el objeto seleccionado actualmente para mostrar su nombre en el botón
    const selectedLocation = useMemo(() => 
        locations.find((l: any) => l.id === value), 
    [locations, value]);

    // Opciones del nivel actual
    const currentOptions = useMemo(() => 
        locations.filter((loc: any) => loc.parent_id === currentParentId),
    [locations, currentParentId]);

    // Padre actual (para el botón de volver)
    const currentParent = useMemo(() => 
        locations.find((l: any) => l.id === currentParentId),
    [locations, currentParentId]);

    const handleSelect = (loc: any, e: React.MouseEvent) => {
        e.stopPropagation(); // Evitar que el clic cierre el popover si queremos navegar
        
        const hasChildren = locations.some((l: any) => l.parent_id === loc.id);
        
        onChange(loc.id);

        if (hasChildren) {
            setCurrentParentId(loc.id);
        } else {
            setOpen(false); // Si es el último nivel, cerramos
        }
    };

    const handleBack = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (currentParent) {
            setCurrentParentId(currentParent.parent_id);
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between rounded-2xl border-slate-200 bg-white font-normal h-12 px-4 hover:bg-slate-50 transition-all shadow-sm"
                >
                    <div className="flex items-center gap-2 truncate">
                        <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className={selectedLocation ? "text-slate-900" : "text-slate-500"}>
                            {selectedLocation ? selectedLocation.name : "Seleccionar ubicación..."}
                        </span>
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-xl shadow-xl border-slate-200" align="start">
                {/* Cabecera de Navegación interna */}
                <div className="flex items-center gap-2 p-2 bg-slate-50 border-b">
                    {currentParentId !== null ? (
                        <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            onClick={handleBack}
                            className="h-7 px-2 text-blue-600 hover:text-blue-700 text-xs font-bold"
                        >
                            <ChevronLeft className="h-3 w-3 mr-1" />
                            Atrás
                        </Button>
                    ) : (
                        <span className="px-2 py-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Zonas principales
                        </span>
                    )}
                    {currentParent && (
                        <span className="text-[11px] font-medium text-slate-500 truncate">
                            / {currentParent.name}
                        </span>
                    )}
                </div>

                <ScrollArea className="h-[240px]">
                    <div className="p-1">
                        {currentOptions.map((loc: any) => {
                            const isSelected = value === loc.id;
                            const hasChildren = locations.some((l: any) => l.parent_id === loc.id);

                            return (
                                <div
                                    key={loc.id}
                                    onClick={(e) => handleSelect(loc, e as any)}
                                    className={`w-full flex items-center justify-between p-2.5 rounded-lg text-sm cursor-pointer transition-colors ${
                                        isSelected 
                                        ? 'bg-blue-50 text-blue-700 font-medium' 
                                        : 'hover:bg-slate-100 text-slate-600'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-blue-500' : 'bg-transparent'}`} />
                                        <span className="truncate">{loc.name}</span>
                                    </div>
                                    {hasChildren && (
                                        <ChevronRight className="h-4 w-4 text-slate-300" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
                
                {/* Footer opcional para confirmar selección en niveles intermedios */}
                {currentParentId && (
                    <div className="p-2 border-t bg-slate-50/50">
                        <Button 
                            className="w-full h-8 text-xs bg-slate-900 text-white"
                            onClick={() => setOpen(false)}
                        >
                            Confirmar selección
                        </Button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}