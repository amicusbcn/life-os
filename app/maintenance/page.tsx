// app/maintenance/page.tsx
import { getMaintenanceTasks, getAllInventoryItemsBase, getAllPropertiesBase, getAllLocations } from './data';
import { getUserData } from '@/utils/security';
import { MaintenanceClientView } from './components/MaintenanceClientView';

export default async function GlobalMaintenancePage() {
    // Usamos tu sistema de seguridad centralizado
    const { profile, userRole, isAdminGlobal, modulePermission, accessibleModules } = await getUserData('maintenance');

    // Carga de datos en paralelo
    const [tasks, properties, items, locations] = await Promise.all([
        getMaintenanceTasks(),
        getAllPropertiesBase(),
        getAllInventoryItemsBase(),
        getAllLocations()
    ]);

    return (
        <MaintenanceClientView 
            initialTasks={tasks}
            properties={properties}
            locations={locations}      // Ya viene como PropertyBase[]
            inventoryItems={items}       // Ya viene como InventoryItemBase[]
            profile={profile}
            accessibleModules={accessibleModules}
            userRole={userRole}
            isAdminGlobal={isAdminGlobal}
            modulePermission={modulePermission}
            // Para el selector de responsables, podrías usar una lista de todos los perfiles
            // o los miembros de las propiedades accesibles.
            users={[]} // Podrías cargar todos los perfiles si eres admin
        />
    );
}