// app/users/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin'; // Importamos desde el fichero renombrado
import { User } from '@supabase/supabase-js';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { UserActions } from './user-actions'; // Componente Cliente para las acciones
import { UserMenu } from '../../UserMenu';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AdminUserProfile } from '@/types/common';
// Definimos el tipo para el perfil de usuario para ayudar a TypeScript
type Profile = {
  id: string;
  email: string | null;
  role: string | null;
  // Un usuario puede tener varios grupos, así que esperamos un array.
  profiles_groups: {
    app_groups: { id: number; group: string };
  }[];
};

export default async function AdminUsersPage() {
  const supabase = await createClient();

  // 1. Proteger la ruta y obtener datos del admin
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (adminProfile?.role !== 'admin') {
    return redirect('/');
  }

  // Usamos un cliente con privilegios de administrador para esta llamada
  const supabaseAdmin = await createAdminClient();

  // 2. Obtener todos los datos necesarios
  // Obtenemos los grupos disponibles para pasarlos al componente de acciones
  const { data: availableGroupsData } = await supabaseAdmin.from('app_groups').select('id, group');
  const availableGroups = availableGroupsData || [];
  
  // --- NUEVA ESTRATEGIA DE CARGA DE DATOS ---
  // 1. Obtenemos todos los perfiles (solo id y rol)
  const { data: profilesData, error: profilesError } = await supabaseAdmin.from('profiles').select('id, role');
  // 2. Obtenemos todas las relaciones de grupo
  const { data: groupRelations, error: groupsError } = await supabaseAdmin.from('profiles_groups').select('id_user, app_groups(id, group)');
  // 3. Obtenemos todos los usuarios de auth
  const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();

  if (profilesError || authError || groupsError) {
    console.error('Error fetching profiles:', profilesError);
    console.error('Error fetching groups:', groupsError);
    console.error('Error fetching auth users:', authError);
    // Aquí podrías mostrar un mensaje de error en la UI
    return <div>Error al cargar los usuarios.</div>;
  }

  // 3. Unir los datos. Creamos un mapa para buscar perfiles por ID fácilmente.
  const profilesMap = new Map(profilesData?.map(p => [p.id, p]));
  const groupsMap = new Map<string, any[]>();
  groupRelations?.forEach(relation => {
    if (!groupsMap.has(relation.id_user)) {
      groupsMap.set(relation.id_user, []);
    }
    groupsMap.get(relation.id_user)!.push(relation);
  });

  // Unimos la información de auth.users con la de profiles
  const profiles: Profile[] = (authUsers?.users || [])
    .map((authUser: User) => { // Añadimos el tipo 'User' para authUser
      const profileData = profilesMap.get(authUser.id) || { role: 'user' };
      const userGroups = groupsMap.get(authUser.id) || [];
      return {
        id: authUser.id,
        email: authUser.email || null,
        role: profileData.role,
        profiles_groups: userGroups,
      };
    })
    .sort((a: Profile, b: Profile) => (a.email || '').localeCompare(b.email || '')); // Añadimos el tipo 'Profile' a los params del sort

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* HEADER */}
      <header className="bg-white border-b px-4 sm:px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-slate-500 hover:text-slate-800 transition-colors">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-xl font-bold text-slate-800">Life OS - Usuarios</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500 hidden sm:inline">Hola, {user.email}</span>
          <UserMenu userEmail={user.email || ''} userRole={adminProfile?.role || null} />
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-5xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-6 text-slate-700">Gestión de Usuarios</h2>
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Grupo</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles?.map((profile: Profile) => (
                <TableRow key={profile.id}>
                  <TableCell className="font-medium truncate">{profile.email}</TableCell>
                  <TableCell>
                    {profile.role === 'admin' ? <Badge>Admin</Badge> : <Badge variant="secondary">Usuario</Badge>}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {profile.profiles_groups.length > 0 ? (
                        profile.profiles_groups.map((ug: any) => (
                          ug.app_groups && (
                            <UserActions
                              key={ug.app_groups.id}
                              userProfile={profile}
                              groupToRemove={ug.app_groups}
                            />
                          )
                        ))
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <UserActions 
                      userProfile={profile} 
                      availableGroups={availableGroups.filter(ag => !profile.profiles_groups.some((pg: any) => pg.app_groups?.id === ag.id))}
                      isCurrentUser={user.id === profile.id}
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