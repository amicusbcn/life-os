// app/maintenance/page.tsx
import { getMaintenanceTasks, getAllInventoryItemsBase, getAllPropertiesBase, getAllLocations } from '../data';
import { getUserData } from '@/utils/security';
import { MaintenanceClientView } from '../components/MaintenanceClientView';

export default async function GlobalMaintenancePage() {
    // Usamos tu sistema de seguridad centralizado
    const { profile, userRole, isAdminGlobal, modulePermission, accessibleModules } = await getUserData('maintenance');

    // Carga de datos en paralelo
    const [tasks, properties, items, locations] = await Promise.all([
        getMaintenanceTasks({isArchived:true}),
        getAllPropertiesBase(),
        getAllInventoryItemsBase(),
        getAllLocations()
    ]);

    return (
        <MaintenanceClientView 
            initialTasks={tasks}
            properties={properties}
            locations={locations}
            inventoryItems={items} 
            profile={profile}
            accessibleModules={accessibleModules}
            userRole={userRole}
            isAdminGlobal={isAdminGlobal}
            modulePermission={modulePermission}
            users={[]} 
            history={true}
        />
    );
}