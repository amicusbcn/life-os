'use client';

import { useState } from 'react';
import { UnifiedAppSidebar } from '@/components/layout/UnifiedAppSidebar';
import { InventoryMenu } from './InventoryMenu';
import { InventoryListView } from './InventoryListView';

interface Props {
    profile: any;
    accessibleModules: any[];
    categories: any[];
    locations: any[];
    items: any[];
}

export function InventoryClientPage({ 
    profile, accessibleModules, categories, locations, items 
}: Props) {
    
    // ESTADO LOCAL DE FILTRADO
    const [activeCategory, setActiveCategory] = useState<string | null>(null);

    // FILTRAR ÍTEMS
    const filteredItems = activeCategory 
        ? items.filter((i: any) => i.category_id === activeCategory)
        : items;

    return (
        <UnifiedAppSidebar
            title="Inventario Personal"
            profile={profile}
            modules={accessibleModules}
            moduleMenu={
                <InventoryMenu 
                    mode="operative"
                    categories={categories}
                    locations={locations}
                    // Props de filtrado
                    activeCategory={activeCategory}
                    onCategoryChange={setActiveCategory}
                    // Sin backLink porque estamos en la raíz
                />
            }
            moduleSettings={
                <InventoryMenu 
                    mode="settings"
                    categories={categories}
                    locations={locations}
                />
            }
        >
            <div className="max-w-3xl mx-auto p-4 md:p-8">
                <InventoryListView 
                    items={filteredItems} 
                    categories={categories}
                    locations={locations}
                />
            </div>
        </UnifiedAppSidebar>
    );
}