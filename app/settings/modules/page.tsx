// app/settings/modules/page.tsx
import { validateModuleAccess, getUserData } from '@/utils/security';
import { UnifiedAppSidebar } from '@/components/layout/UnifiedAppSidebar';
import { SettingsMenu } from '../components/SettingsMenu';
import { createClient } from '@/utils/supabase/server';
import { ModuleCard } from './components/ModuleCard';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { Plus, Folder } from 'lucide-react';
import { AppModule } from '@/types/users'; // Asegúrate de que el tipo incluya 'folder'

export default async function ModulesPage() {
    // 1. Seguridad y metadatos del Sidebar
    await validateModuleAccess('settings');
    const { profile, accessibleModules } = await getUserData('settings');

    // 2. Cargar módulos
    const supabase = await createClient();
    const { data: allModules } = await supabase
        .from('app_modules')
        .select('*')
        .order('folder', { ascending: true }) // Agrupamos primero por carpeta
        .order('order', { ascending: true }); // Y luego por el orden definido

    // 3. Lógica de agrupación por carpeta
    const modulesByFolder = (allModules as AppModule[] || []).reduce((acc, mod) => {
        const folderName = mod.folder || 'Sin Categoría';
        if (!acc[folderName]) acc[folderName] = [];
        acc[folderName].push(mod);
        return acc;
    }, {} as Record<string, AppModule[]>);

    return (
        <UnifiedAppSidebar
            title="Módulos del Sistema"
            profile={profile}
            modules={accessibleModules}
            moduleMenu={<SettingsMenu currentPanel="modules"/>}
        >
            <main className="p-4 md:p-8 space-y-12 w-full">
                <header>
                    <h1 className="text-2xl md:text-4xl font-black tracking-tight text-slate-900">
                        Configuración de Módulos
                    </h1>
                    <p className="text-sm text-slate-500 font-medium">
                        Activa o desactiva las funcionalidades globales de Life OS.
                    </p>
                </header>

                {/* Renderizado de Carpetas */}
                {Object.entries(modulesByFolder).map(([folderName, modules]) => (
                    <section key={folderName} className="space-y-6">
                        <div className="flex items-center gap-3 border-b border-slate-100 pb-2">
                            <div className="p-1.5 bg-slate-100 rounded-md">
                                <Folder className="w-4 h-4 text-slate-500 fill-slate-500" />
                            </div>
                            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">
                                {folderName}
                            </h2>
                            <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                                {modules.length}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6">
                            {modules.map((mod) => (
                                <ModuleCard key={mod.id} module={mod} />
                            ))}
                        </div>
                    </section>
                ))}
            </main>
        </UnifiedAppSidebar>
    );
}