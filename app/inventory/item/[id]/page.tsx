// app/inventory/item/[id]/page.tsx
import { getUserData } from "@/utils/security"; // Tu función de validación
import { getInventoryItemDetails,getInventoryCategories } from "../../data";
import { getUserProperties} from "@/app/inventory/data";
import { getPropertyLocations } from "@/app/properties/data";
import { getMaintenanceTasks } from "@/app/maintenance/data";
import { InventoryItemDetailView } from "../../components/InventoryDetailView";
import { UnifiedAppSidebar } from "@/components/layout/UnifiedAppSidebar";
import { InventoryMenu } from "../../components/InventoryMenu";
import { notFound } from "next/navigation";
import { getSortedLocations } from "@/utils/inventory-logic";

export default async function ItemFullPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    
    // 1. Validación de seguridad
    const { profile, accessibleModules, canEdit } = await getUserData('inventory');

    // 2. Primero cargamos el ítem, porque necesitamos su property_id para lo demás
    const [item, tasks,categories] = await Promise.all([
        getInventoryItemDetails(id),
        getMaintenanceTasks({ inventoryItemId: id }),
        getInventoryCategories()
    ]);
    if (!item) notFound();

    // 3. Ahora que tenemos el item, cargamos el resto en paralelo
    const [properties,  locations] = await Promise.all([
        getUserProperties(),
        getPropertyLocations(item.property_id) 
    ]);
    const property= properties.find(p => p.id === item.property_id);
    // Preparamos el objeto backLink que espera tu InventoryMenu
    const backNavigation = {
        href: item.property_id ? `/inventory/${property?.slug}` : '/inventory/all',
        label: "Volver al Inventario"
    };

    return (
        <UnifiedAppSidebar
            title={item.name}
            profile={profile}
            modules={accessibleModules}
            moduleMenu={
                <div className="flex flex-col gap-4">
                    <InventoryMenu 
                        mode="operative"
                        categories={categories}
                        locations={locations}
                        userRole={profile?.role}
                        // Corregido: pasamos el objeto esperado
                        backLink={backNavigation} 
                        isPropertyContext={!!item.property_id}
                    />
                </div>
            }
        >
            <div className="p-8">
                <InventoryItemDetailView 
                    item={item}
                    categories={categories}
                    locations={locations}
                    properties={properties}
                    availableProfiles={[]} 
                    isAdmin={canEdit}
                    tasks={tasks} 
                />
            </div>
        </UnifiedAppSidebar>
    );
}