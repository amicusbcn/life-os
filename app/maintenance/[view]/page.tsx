// app/maintenance/page.tsx
import { getMaintenanceTasks, getAllInventoryItemsBase, getAllPropertiesBase, getAllLocations, getMaintenanceCategories } from '../data';
import { getUserData } from '@/utils/security';
import { MaintenanceClientView } from '../components/MaintenanceClientView';

export default async function MaintenanceViewPage({ params }: { params: { view: string } }) {
    const { view } = await params; 
    const { profile, userRole, isAdminGlobal, modulePermission, accessibleModules } = await getUserData('maintenance');
    const viewFilters: Record<string, any> = {
        active: { is_archived: false, is_recurring: false },
        archived: { is_archived: true },
        preventive: { is_recurring: true, is_archived: false },
        me: { assigned_to: profile.id, is_archived: false }
    };
    // Carga de datos en paralelo
    const [tasks, properties, items, locations,categories] = await Promise.all([
        getMaintenanceTasks(viewFilters[view ]), 
        getAllPropertiesBase(),
        getAllInventoryItemsBase(),
        getAllLocations(),
        getMaintenanceCategories()
    ]);

    return (
        <MaintenanceClientView 
            initialTasks={tasks}
            categories={categories}
            properties={properties}
            locations={locations}
            inventoryItems={items}
            profile={profile}
            accessibleModules={accessibleModules}
            userRole={userRole}
            isAdminGlobal={isAdminGlobal}
            modulePermission={modulePermission}
            view={view}
            users={[]} // Podrías cargar todos los perfiles si eres admin
        />
    );
}