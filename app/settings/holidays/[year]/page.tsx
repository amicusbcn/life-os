// app/settings/holidays/[year]/page.tsx
import { validateModuleAccess, getUserData } from '@/utils/security';
import { UnifiedAppSidebar } from '@/components/layout/UnifiedAppSidebar';
import { SettingsMenu } from '../../components/SettingsMenu';
import { RegionalManager } from '../components/RegionalManager';
import { getHolidaysList, getLocalities } from '../data';
import { notFound } from 'next/navigation';

export default async function RegionalSettingsPage({ 
    params 
}: { 
    params: Promise<{ year: string }> 
}) {
    // 1. Resolvemos el año de la URL
    const { year } = await params;
    const yearInt = parseInt(year);

    if (isNaN(yearInt)) return notFound();

    // 2. Seguridad
    await validateModuleAccess('settings');
    const { profile, accessibleModules } = await getUserData('settings');

    // 3. Carga de datos inyectando el año
    const [localities, holidays] = await Promise.all([
        getLocalities().catch(() => []),
        getHolidaysList(yearInt).catch(() => [])
    ]);

    return (
        <UnifiedAppSidebar
            title="Configuración Regional"
            profile={profile}
            modules={accessibleModules}
            localities={localities}
            moduleMenu={<SettingsMenu currentPanel='regional' />}
        >
            <main>
                <RegionalManager 
                    initialLocalities={localities} 
                    initialHolidays={holidays}
                    currentYear={yearInt} 
                    user={profile}
                />
            </main>
        </UnifiedAppSidebar>
    );
}