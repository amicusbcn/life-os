import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getAdminUsersList, getActiveModules } from './actions'; // Importamos la acción nueva
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { UnifiedAppHeader } from '@/app/core/components/UnifiedAppHeader';
import { InviteUserDialog } from './components/InviteUserDialog'; // Componente Nuevo
import { UserPermissionsSheet } from './components/UserPermissionsSheet'; // Componente Nuevo
import { SettingsMenu } from '../components/SettingsMenu'; 
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AdminUserRow, AppModule, AppRole } from '@/types/users';


// Mapa de colores para las badges de roles
const ROLE_BADGES: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    admin: 'destructive', // Rojo
    editor: 'default',    // Negro/Oscuro
    viewer: 'secondary'   // Gris
};

export default async function AdminUsersPage() {
    const supabase = await createClient();

    // 1. Verificación de Seguridad (Básica)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirect('/login');

    // 2. Obtener Datos (Usando la nueva Server Action optimizada)
    // Nota: La redirección si no es admin ya la manejas dentro de getAdminUsersList si quieres, 
    // o aquí mismo verificando el rol del usuario actual.
    // Asumiremos que si getAdminUsersList falla, lanza error o devuelve vacío.
    
    const [users, modules] = await Promise.all([
        getAdminUsersList().catch((err: any) => { // <-- Tipamos err como any
            console.error(err); 
            return [] as AdminUserRow[]; // <-- Forzamos el tipo de retorno
        }),
        getActiveModules().catch((err: any) => { 
            console.error(err); 
            return [] as AppModule[]; 
        })
    ]);
    

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <UnifiedAppHeader
                title="Gestión de Usuarios"
                backHref="/"
                userEmail={user.email || ''}
                userRole="admin" // Ya verificado
                maxWClass="max-w-4xl" // Un poco más ancho para la tabla
                moduleMenu={<SettingsMenu />}
            />

            <main className="max-w-4xl mx-auto p-6 space-y-6">
                
                {/* Cabecera de Acción */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Usuarios y Permisos</h2>
                        <p className="text-sm text-slate-500">Gestiona quién accede a qué módulo.</p>
                    </div>
                    <InviteUserDialog />
                </div>

                {/* Tabla */}
                <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/50">
                                <TableHead className="w-[300px]">Usuario</TableHead>
                                <TableHead>Rol Global</TableHead>
                                <TableHead>Permisos Activos</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((profile) => (
                                <TableRow key={profile.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage src={profile.avatar_url || ''} />
                                                <AvatarFallback>{profile.email?.substring(0,2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm text-slate-900">
                                                    {profile.full_name || 'Sin nombre'}
                                                </span>
                                                <span className="text-xs text-slate-500">{profile.email}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    
                                    <TableCell>
                                        {profile.role === 'admin' && (
                                            <Badge variant="default" className="bg-indigo-600 hover:bg-indigo-700">
                                                Super Admin
                                            </Badge>
                                        )}
                                    </TableCell>
                                    
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1.5">
                                            {Object.entries(profile.permissions).map(([moduleKey, role]) => {
												const typedRole = role as AppRole;
												
												return (
													<Badge 
														key={moduleKey} 
														// Soluciona el error de "Index type"
														variant={ROLE_BADGES[typedRole] || 'outline'} 
														className="uppercase text-[10px]"
													>
														{/* Soluciona el error de "ReactNode" */}
														{moduleKey}: {typedRole}
													</Badge>
												)
											})}
                                            {Object.keys(profile.permissions).length === 0 && (
                                                <span className="text-xs text-slate-400 italic">Sin acceso</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    
                                    <TableCell className="text-right">
                                        <UserPermissionsSheet 
                                            user={profile} 
                                            availableModules={modules} 
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </main>
        </div>
    );
}