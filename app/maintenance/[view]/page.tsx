// app/maintenance/[view]/page.tsx
import { getMaintenanceTasks, getAllInventoryItemsBase, getAllPropertiesBase, getAllLocations, getMaintenanceCategories } from '../data';
import { getAccessControl} from '@/utils/security';
import { MaintenanceClientView } from '../components/MaintenanceClientView';
interface PageProps {
  params: Promise<{ view:string }>;
  searchParams: Promise<{mode:'grid'|'list'}>;
}

export default async function MaintenanceViewPage({ params,searchParams }: PageProps) {
    const { view } = await params; 
    const { mode } = await searchParams;
    const {profile,accessibleModules, security} = await getAccessControl('maintenance');
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
            security={security}
            defaultMode={mode}
            view={view}
            users={[]} // Podrías cargar todos los perfiles si eres admin
        />
    );
}