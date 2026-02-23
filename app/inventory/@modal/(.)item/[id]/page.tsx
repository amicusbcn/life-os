// app/inventory/[context]/@modal/(.)item/[id]/page.tsx
import { getInventoryItemDetails,getInventoryCategories } from "@/app/inventory/data";
import { getUserProperties} from "@/app/inventory/data";
import { getPropertyLocations } from "@/app/properties/data";
import { getMaintenanceTasks } from "@/app/maintenance/data";
import { InventoryItemDetailView } from "@/app/inventory/components/InventoryDetailView";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { getUserData } from "@/utils/security"; 
import { notFound } from "next/navigation";

export default async function ItemInterceptionPage({ 
    params 
}: { 
    params: Promise<{ id: string }> 
}) {
    const { id } = await params;
    
    // 1. Validación de seguridad rápida
    const { canEdit } = await getUserData('inventory');

    // 2. Cargamos el item primero
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

    return (
        <Sheet defaultOpen>
            {/* El SheetContent envuelve nuestra vista de detalle */}
            <SheetContent className="w-full sm:max-w-[800px] p-0 overflow-y-auto border-l shadow-2xl">
                {/* Título invisible para accesibilidad (exigido por Radix/Shadcn) */}
                <div className="sr-only">
                    <SheetTitle>Detalle de {item.name}</SheetTitle>
                </div>

                <div className="p-8">
                    <InventoryItemDetailView 
                        item={item}
                        categories={categories}
                        locations={locations}
                        properties={properties}
                        availableProfiles={[]} // Cargar si necesitas asignar responsables desde el Sheet
                        isAdmin={canEdit}
                        tasks={tasks}
                    />
                </div>
            </SheetContent>
        </Sheet>
    );
}