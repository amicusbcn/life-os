'use client';

import { useState } from 'react';
import { UnifiedAppSidebar } from '@/components/layout/UnifiedAppSidebar';
import { InventoryMenu } from './InventoryMenu';
import { InventoryContextSelector } from './InventoryContextSelector';
import { InventoryListView } from './InventoryListView'; // Asumo que tienes la lista creada, si no, te la paso abajo
import { InventoryCategory, InventoryLocation, InventoryItem } from '@/types/inventory';

interface Props {
    // Contexto
    title: string;
    currentContext: string; // 'personal' o slug
    propertyId?: string; // ID real si es propiedad
    
    // Datos Maestros
    categories: InventoryCategory[];
    locations: InventoryLocation[];
    availableProperties: any[];
    
    // Datos Principales
    items: InventoryItem[];
    
    // Layout Info
    profile: any;
    accessibleModules: any[];
    availableProfiles: any[];
    backLink?: {
        href: string;
        label: string;
    };
}

export function InventoryClientView({ 
    title, currentContext, propertyId,
    categories, locations, availableProperties, items,
    profile, accessibleModules, availableProfiles,backLink
}: Props) {
    console.log("LOG 1 [ClientView]:", availableProperties);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [activeLocation, setActiveLocation] = useState<string | null>(null);

    // --- LÓGICA DE FILTRADO ---
    const filteredItems = items.filter(item => {
        // 1. Filtro de Categoría
        const matchesCategory = !activeCategory || item.category_id === activeCategory;

        // 2. Filtro de Ubicación (Jerárquico)
        let matchesLocation = true;
        if (activeLocation) {
            // Buscamos los hijos de la ubicación activa para que el filtro sea "inclusivo"
            const childLocationIds = locations
                .filter(l => l.parent_id === activeLocation)
                .map(l => l.id);
            
            const validLocationIds = [activeLocation, ...childLocationIds];
            
            // IMPORTANTE: Un item puede tener su ID en cualquiera de estos dos campos
            const itemLocId = item.property_location_id || item.location_id;
            
            matchesLocation = itemLocId ? validLocationIds.includes(itemLocId) : false;
        }

        return matchesCategory && matchesLocation;
    });
    const isPropertyContext = !!propertyId;
    return (
        <UnifiedAppSidebar
            title={title}
            profile={profile}
            modules={accessibleModules}
            
            // MENU LATERAL (Le pasamos el control del estado)
            moduleMenu={
                <div className="flex flex-col gap-4">
                    {!isPropertyContext && (
                        <InventoryContextSelector 
                        currentContext={currentContext} 
                        properties={availableProperties} 
                        />
                    )}
                    
                    <div className="px-2 py-2 border-t border-slate-100" />

                    <InventoryMenu 
                        mode="operative"
                        categories={categories}
                        locations={locations}
                        propertyId={propertyId}
                        
                        // CONECTAMOS LOS FILTROS
                        activeCategory={activeCategory}
                        onCategoryChange={setActiveCategory}
                        activeLocation={activeLocation}
                        onLocationChange={setActiveLocation}
                        isPropertyContext={isPropertyContext} // ✨ Detecta si estamos en una propiedad
                        userRole={profile?.role}        // ✨ Pasa el rol para el botón "Nuevo"
                        backLink={backLink}
                    />
                </div>
            }
            
            // MENU SETTINGS
            moduleSettings={
                <InventoryMenu 
                    mode="settings"
                    categories={categories}
                    locations={locations}
                />
            }
        >
            {/* CONTENIDO PRINCIPAL (LISTA) */}
            <div className="max-w-5xl mx-auto p-4 md:p-8">
               <InventoryListView 
                    items={filteredItems} 
                    categories={categories}
                    locations={locations}
                    currentPropertyId={propertyId}
               />
            </div>
        </UnifiedAppSidebar>
    );
}