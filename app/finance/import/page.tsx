// app/finance/import/page.tsx (Server Component)
import { getUserData } from '@/utils/security';
import { getAccounts, getCategories } from '@/app/finance/data';
import ImportClientPage from './import-client'; // Importamos el cliente que crearemos abajo

export default async function ImportPage() {
    // 1. Seguridad
    const { profile, accessibleModules } = await getUserData('finance');

    // 2. Cargar datos necesarios para los selects de mapeo
    const [accounts, categories] = await Promise.all([
        getAccounts(),
        getCategories()
    ]);

    return (
        <ImportClientPage 
            accounts={accounts || []} 
            categories={categories || []}
            profile={profile}
            modules={accessibleModules}
        />
    );
}