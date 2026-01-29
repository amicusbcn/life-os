// app/settings/page.tsx
import { getUserData } from '@/utils/security';
import { UnifiedAppSidebar } from '@/components/layout/UnifiedAppSidebar';
import { SettingsMenu } from './components/SettingsMenu';
import { Users, ShieldCheck, Megaphone } from "lucide-react";
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function SettingsLandingPage() {
    const { profile, accessibleModules } = await getUserData('settings');

    return (
        <UnifiedAppSidebar
            title="Panel de Control Maestro"
            profile={profile}
            modules={accessibleModules}
            backLink="/"
            moduleMenu={<SettingsMenu />}
        >
            <main className="p-6 space-y-8">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Consola de Administración</h2>
                    <p className="text-slate-500 mt-1">Bienvenido a la torre de control de Life OS. Gestiona el núcleo del sistema.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Acceso Rápido a Usuarios */}
                    <Link href="/settings/users">
                        <Card className="hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer group">
                            <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                                <div className="p-2 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors">
                                    <Users className="w-6 h-6 text-indigo-600" />
                                </div>
                                <CardTitle className="text-lg">Usuarios</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-slate-500 text-balance">
                                    Gestiona cuentas, invita a nuevos miembros y ajusta permisos modulares.
                                </p>
                            </CardContent>
                        </Card>
                    </Link>

                    {/* Acceso Rápido a Módulos */}
                    <Link href="/settings/modules">
                        <Card className="hover:border-emerald-200 hover:shadow-md transition-all cursor-pointer group">
                            <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                                <div className="p-2 bg-emerald-50 rounded-lg group-hover:bg-emerald-100 transition-colors">
                                    <ShieldCheck className="w-6 h-6 text-emerald-600" />
                                </div>
                                <CardTitle className="text-lg">Módulos</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-slate-500 text-balance">
                                    Activa o desactiva funcionalidades globales y configura roles por defecto.
                                </p>
                            </CardContent>
                        </Card>
                    </Link>

                    {/* Acceso Rápido a Difusión */}
                    <Card className="hover:border-amber-200 hover:shadow-md transition-all cursor-pointer group">
                        <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                            <div className="p-2 bg-amber-50 rounded-lg group-hover:bg-amber-100 transition-colors">
                                <Megaphone className="w-6 h-6 text-amber-600" />
                            </div>
                            <CardTitle className="text-lg">Difusión</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-slate-500 text-balance">
                                Envía notificaciones importantes a todos los usuarios del sistema.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </UnifiedAppSidebar>
    );
}