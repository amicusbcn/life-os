// app/maintenance/[view]/page.tsx
import { getMaintenanceTasks, getAllInventoryItemsBase, getAllPropertiesBase, getAllLocations, getMaintenanceCategories } from '@/app/maintenance/data';
import { getAccessControl, getUserData } from '@/utils/security';
import { MaintenanceClientView } from '@/app/maintenance/components/MaintenanceClientView';
import { getPropertyBySlug } from '@/app/properties/data';
interface PageProps {
  params: Promise<{ slug:string,view:string }>;
  searchParams: Promise<{mode:'grid'|'list'}>;
}


export default async function MaintenanceViewPage({ params, searchParams}:  PageProps) {
    const { slug, view } = await params; 
    const { mode } = await searchParams;
    const {profile,accessibleModules, security} = await getAccessControl('maintenance');
    const property = await getPropertyBySlug(slug);
    
    if (!property) {
        throw new Error("Propiedad no encontrada");
    }
    const viewFilters: Record<string, any> = {
        active:     { is_archived: false, is_recurring: false, property_id: property.id },
        archived:   { is_archived: true, property_id: property.id },
        preventive: { is_recurring: true, is_archived: false, property_id: property.id },
        me:         { assigned_to: profile.id, is_archived: false, property_id: property.id }
    };
    // Carga de datos en paralelo
    const [tasks, properties, items, locations,categories] = await Promise.all([
        getMaintenanceTasks(viewFilters[view ]), 
        getAllPropertiesBase(),
        getAllInventoryItemsBase(),
        getAllLocations(),
        getMaintenanceCategories()
    ]);
    const currentFilters = viewFilters[view] || viewFilters.active;
    return (
        <MaintenanceClientView 
            initialTasks={tasks}
            categories={categories}
            properties={properties}
            locations={locations}
            inventoryItems={items}
            profile={profile}
            security={security}
            accessibleModules={accessibleModules}
            view={view}
            src={slug}
            users={[]}
            currentProperty={{ id: property.id, slug: property.slug, name: property.name }}
            defaultMode={mode}
        />
    );
}