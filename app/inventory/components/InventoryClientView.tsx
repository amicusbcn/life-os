'use client';

import { useState, useEffect } from 'react';
import { UnifiedAppSidebar } from '@/components/layout/UnifiedAppSidebar';
import { InventoryMenu } from './InventoryMenu';
import { InventoryListView } from './InventoryListView';
import { InventoryFilters } from './InventoryFilters'; // El componente que creamos abajo
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { InventoryForm } from './InventoryForm';
import { InventoryCategory, InventoryLocation, InventoryItem } from '@/types/inventory';

interface Props {
    title: string;
    currentContext: string;
    propertyId?: string;
    categories: InventoryCategory[];
    locations: InventoryLocation[];
    availableProperties: any[];
    items: InventoryItem[];
    profile: any;
    accessibleModules: any[];
    availableProfiles: any[];
    backLink?: { href: string; label: string };
}

export function InventoryClientView({ 
    title, currentContext, propertyId,
    categories, locations, availableProperties, items,
    profile, accessibleModules, availableProfiles, backLink
}: Props) {
    const [searchTerm, setSearchTerm] = useState("");
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [activeLocation, setActiveLocation] = useState<string | null>(null);
    const [isNewItemOpen, setIsNewItemOpen] = useState(false);

    // Escuchador para el evento del Sidebar
    useEffect(() => {
        const handleOpenNew = () => setIsNewItemOpen(true);
        window.addEventListener('open-new-item', handleOpenNew);
        return () => window.removeEventListener('open-new-item', handleOpenNew);
    }, []);

    // --- LÓGICA DE FILTRADO UNIFICADA ---
    const filteredItems = items.filter(item => {
        // 1. Filtro de Texto (Nombre, Marca, Modelo)
        const matchesSearch = !searchTerm || 
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.model?.toLowerCase().includes(searchTerm.toLowerCase());
        
        // 2. Filtro de Categoría
        const matchesCategory = !activeCategory || item.category_id === activeCategory;

        // 3. Filtro de Ubicación (Jerárquico)
        let matchesLocation = true;
        if (activeLocation) {
            // Buscamos todos los IDs de las ubicaciones que son hijas de la seleccionada
            const childLocationIds = locations
                .filter(l => l.parent_id === activeLocation)
                .map(l => l.id);
            
            // Un item es válido si está en la ubicación activa O en cualquiera de sus hijas
            const validLocationIds = [activeLocation, ...childLocationIds];
            const itemLocId = item.property_location_id || item.location_id;
            
            matchesLocation = itemLocId ? validLocationIds.includes(itemLocId) : false;
        }

        return matchesSearch && matchesCategory && matchesLocation;
    });

    const isPropertyContext = !!propertyId;

    return (
        <UnifiedAppSidebar
            title={title}
            profile={profile}
            modules={accessibleModules}
            moduleMenu={
                <div className="flex flex-col gap-4">
                    <InventoryMenu 
                        mode="operative"
                        categories={categories}
                        locations={locations}
                        propertyId={propertyId}
                        currentContext={currentContext}
                        properties={availableProperties}
                        isPropertyContext={isPropertyContext}
                        userRole={profile?.role}
                        backLink={backLink}
                    />
                </div>
            }
            moduleSettings={
                <InventoryMenu 
                    mode="settings"
                    categories={categories}
                    locations={locations}
                    userRole={profile?.role}
                />
            }
        >
            <div className="max-w-5xl mx-auto p-4 md:p-8">
                {/* BARRA SUPERIOR DE FILTROS */}
                <InventoryFilters 
                    search={searchTerm} 
                    onSearchChange={setSearchTerm}
                    categories={categories} 
                    activeCategory={activeCategory} 
                    onCategoryChange={setActiveCategory}
                    locations={locations} 
                    activeLocation={activeLocation} 
                    onLocationChange={setActiveLocation}
                />

                {/* LISTADO DE ÍTEMS */}
                <InventoryListView 
                    items={filteredItems} 
                    categories={categories}
                    locations={locations}
                    currentPropertyId={propertyId}
                />

                {/* MODAL GLOBAL DE NUEVO ÍTEM */}
                <Sheet open={isNewItemOpen} onOpenChange={setIsNewItemOpen}>
                    <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
                        <SheetHeader className="mb-6">
                            <SheetTitle>Añadir Nuevo Ítem</SheetTitle>
                        </SheetHeader>
                        <InventoryForm 
                            categories={categories} 
                            locations={locations} 
                            propertyId={propertyId}
                            onSuccess={() => {
                                setIsNewItemOpen(false);
                                // Opcional: router.refresh() si no usas optimistic UI
                            }} 
                        />
                    </SheetContent>
                </Sheet>
            </div>
        </UnifiedAppSidebar>
    );
}