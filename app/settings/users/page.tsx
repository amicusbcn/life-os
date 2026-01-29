// app/settings/users/page.tsx
import { getAdminUsersList, getActiveModules } from './actions'; 
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AdminUserRow, AppModule, AppRole } from '@/types/users';
import { validateModuleAccess, getUserData } from '@/utils/security';
import { UnifiedAppSidebar } from '@/components/layout/UnifiedAppSidebar';
import { SettingsMenu } from '../components/SettingsMenu';
import { InviteUserDialog } from './components/InviteUserDialog';
import { UserPermissionsSheet } from './components/UserPermissionsSheet';
import { UserActionsMenu } from './components/userActionsMenu';
import { SidebarMenu, SidebarMenuItem } from '@/components/ui/sidebar';
import LoadIcon from '@/utils/LoadIcon';

const ROLE_STYLES: Record<AppRole, string> = {
    admin: "bg-red-50 text-red-700 border-red-100",
    editor: "bg-emerald-50 text-emerald-700 border-emerald-100",
    viewer: "bg-slate-100 text-slate-600 border-slate-200"
};

export default async function AdminUsersPage() {
    // 1. Doble validación: Acceso al módulo y datos para el Sidebar
    const auth = await validateModuleAccess('settings');
    const { profile, accessibleModules } = await getUserData('settings');

    // 2. Carga de datos usando tus Server Actions recuperados
    const [users, modules] = await Promise.all([
        getAdminUsersList().catch(() => [] as AdminUserRow[]),
        getActiveModules().catch(() => [] as AppModule[])
    ]);

    return (
        <UnifiedAppSidebar
            title="Gestión de Usuarios"
            profile={profile}
            modules={accessibleModules}
            backLink="/settings"
            moduleMenu={<SettingsMenu currentPanel='users' />}
        >
            <main className="p-4 md:p-8 space-y-6">
                <header>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">
                        Usuarios y Permisos
                    </h1>
                    <p className="text-sm text-slate-500">
                        Administración de cuentas y control de acceso modular.
                    </p>
                </header>

                <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
<div className="bg-white border-y md:border md:rounded-2xl md:shadow-sm overflow-hidden -mx-4 md:mx-0">
    {/* Cabecera solo para PC */}
    <div className="hidden md:grid grid-cols-[1.5fr_100px_2fr_100px] gap-4 bg-slate-50/50 border-b px-6 py-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Usuario</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">Estado</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Permisos</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Gestión</span>
    </div>

    <div className="divide-y divide-slate-100">
        {users.map((user) => (
            <div 
                key={user.id} 
                className="group relative px-6 py-4 md:p-3 transition-colors hover:bg-slate-50/30
                           grid grid-cols-1 md:grid-cols-[1.5fr_100px_2fr_100px] gap-2 md:gap-4 items-center"
            >
                {/* 1. USUARIO: Siempre arriba en móvil, primera columna en PC */}
                <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-9 w-9 border shadow-sm shrink-0">
                        <AvatarImage src={user.avatar_url || ''} />
                        <AvatarFallback className="bg-indigo-50 text-indigo-600 font-bold text-xs uppercase">
                            {user.email?.substring(0, 2)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 truncate text-sm">
                                {user.full_name || user.email}
                            </span>
                            {/* Punto de estado discreto solo para móvil */}
                            <div className={`md:hidden h-2 w-2 rounded-full ${
                                user.is_active === false ? 'bg-red-500' : ( user.status === 'pending' ? 'bg-amber-500' : 'bg-emerald-500')
                            }`} />
                        </div>
                        <span className="text-[11px] text-slate-400 truncate leading-none">
                            {user.email}
                        </span>
                    </div>
                </div>

                {/* 2. ESTADO: Oculto en móvil, centrado en PC */}
                <div className="hidden md:flex justify-center">
                    {user.is_active === false ? (
                        <Badge className="bg-red-50 text-red-600 border-red-100 px-2 py-0 text-[9px] font-bold shadow-none">BLOQUEADO</Badge>
                    ) : user.status === 'pending' ? (
                        <Badge className="bg-amber-50 text-amber-600 border-amber-100 px-2 py-0 text-[9px] font-bold shadow-none">PENDIENTE</Badge>
                    ) : (
                        <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 px-2 py-0 text-[9px] font-bold shadow-none">ACTIVO</Badge>
                    )}
                </div>

                {/* 3. PERMISOS: Iconos en móvil, Badges en PC */}
                <div className="flex flex-wrap gap-1.5 justify-end md:justify-start items-center pr-2 md:py-0 py-1">
                    {user.role === 'admin' ? (
                        <Badge className="bg-indigo-600 text-white border-none text-[9px] font-black tracking-widest px-2 py-0.5">
                            <span className="md:hidden">FULL ACCESS</span>
                            <span className="hidden md:inline">ADMINISTRADOR GLOBAL</span>
                        </Badge>
                    ) : (
                        Object.entries(user.permissions).map(([moduleKey, role]) => {
                            const moduleData = modules.find(m => m.key === moduleKey);
                            return (
                                <div key={moduleKey}>
                                    {/* MÓVIL: Solo icono */}
                                    <div className={`md:hidden p-1.5 rounded-lg border ${ROLE_STYLES[role as AppRole]} border-opacity-50`} title={moduleKey}>
                                        <LoadIcon name={moduleData?.icon || 'Package'} className="w-3.5 h-3.5" />
                                    </div>
                                    {/* PC: Badge completo */}
                                    <Badge 
                                        variant="outline" 
                                        className={`hidden md:flex text-[9px] px-2 py-0.5 items-center gap-1.5 border shadow-none font-medium whitespace-nowrap ${ROLE_STYLES[role as AppRole]}`}
                                    >
                                        <LoadIcon name={moduleData?.icon || 'Package'} className="w-2.5 h-2.5 opacity-60" />
                                        <span className="lowercase">{moduleKey}</span>
                                        <span className="opacity-30">|</span>
                                        <span className="font-bold opacity-80">{role.charAt(0).toUpperCase()}</span>
                                    </Badge>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* 4. ACCIONES: Esquina superior derecha en móvil, Derecha en PC */}
                <div className="absolute top-4 right-6 md:relative md:top-0 md:right-0 flex items-center justify-end gap-1">
                    <UserPermissionsSheet user={user} availableModules={modules} />
                    <UserActionsMenu userId={user.id} email={user.email} status={user.status} isActive={user.is_active} />
                </div>
            </div>
        ))}
    </div>
</div>
                </div>
            </main>
        </UnifiedAppSidebar>
    );
}