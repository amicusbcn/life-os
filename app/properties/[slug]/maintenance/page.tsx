import { getUserData } from "@/utils/security";
import { getPropertyBySlug, getPropertyLocations } from "../../data";
import { MaintenanceClientView } from "@/app/maintenance/components/MaintenanceClientView";
import { notFound } from "next/navigation";
import { getPropertyMembers } from "@/app/booking/data";
import { getMaintenanceCategories, getMaintenanceTasks } from "@/app/maintenance/data";
import { getInventoryItemsByProperty } from "@/app/inventory/data";
// app/properties/[slug]/maintenance/page.tsx
export default async function PropertyMaintenancePage({ 
    params 
}: { 
    params: Promise<{ slug: string }> // ← Ahora se define como una Promesa
}) {
    // 1. Desenvolver los params con await
    const { slug } = await params;
    const { profile, userRole, isAdminGlobal, modulePermission, accessibleModules } = await getUserData('maintenance');
    
    // 1. Obtener la propiedad por el slug
    const property = await getPropertyBySlug(slug); 
    if (!property) notFound();
    
    // 2. Obtener tareas filtradas por property_id
    const [
        tasks,
        locations,
        members,
        inventoryItems,
        categories
    ] = await Promise.all([
        getMaintenanceTasks({ propertyId: property.id }), // Tareas de esta casa
        getPropertyLocations(property.id),          // Estancias de esta casa
        getPropertyMembers(property.id),            // Gente de esta casa
        getInventoryItemsByProperty(property.id),        // Objetos de esta casa
        getMaintenanceCategories()
    ]);

    return (
        <MaintenanceClientView 
        initialTasks={tasks}
        currentProperty={property}
        properties={[property]}
        locations={locations}
        inventoryItems={inventoryItems}
        categories={categories}
        profile={profile}
        users={members}
        userRole={profile.role}
        isAdminGlobal={profile.role === 'admin' || profile.role === 'superadmin'} 
        accessibleModules={accessibleModules} 
    />
    );
}