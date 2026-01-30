// app/settings/notifications/page.tsx
import { validateModuleAccess, getUserData } from '@/utils/security';
import { UnifiedAppSidebar } from '@/components/layout/UnifiedAppSidebar';
import { SettingsMenu } from '../components/SettingsMenu';
import { NotificationForm } from './components/NotificationForm';
import { Megaphone } from 'lucide-react';

export default async function BroadcastPage() {
  // 1. Seguridad: Solo admins acceden a la configuración global
  await validateModuleAccess('settings');
  const { profile, accessibleModules } = await getUserData('settings');

  return (
    <UnifiedAppSidebar
      title="Difusión de Sistema"
      profile={profile}
      modules={accessibleModules}
      moduleMenu={<SettingsMenu currentPanel="notifications" />}
    >
      <main className="p-4 md:p-8 space-y-8 max-w-2xl mx-auto">
        <header className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-700">
              <Megaphone className="w-6 h-6" />
            </div>
            <h1 className="text-2xl md:text-4xl font-black tracking-tight text-slate-900">
              Nueva Difusión
            </h1>
          </div>
          <p className="text-sm text-slate-500 font-medium ml-12">
            Envía avisos críticos o informativos a todos los usuarios de la plataforma.
          </p>
        </header>

        {/* Formulario de cliente */}
        <NotificationForm />
      </main>
    </UnifiedAppSidebar>
  );
}