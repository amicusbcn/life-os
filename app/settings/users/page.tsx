// app/settings/users/page.tsx (Mover y Refactorizar)

import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin'; 
import { User } from '@supabase/supabase-js';
import {
	Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { UserActions } from './user-actions'; 
import { UserProfileAdminView,UserGroupRelation } from '@/types/settings'; // <-- USAMOS EL TIPO CENTRALIZADO
import { UnifiedAppHeader } from '@/app/core/components/UnifiedAppHeader'; // <-- HEADER UNIFICADO
import { UserMenuProps } from '@/types/common'; // <-- Tipos del Header
import { SettingsMenu } from '../components/SettingsMenu'; 

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

	const userRole = adminProfile?.role || null;
	
	if (userRole !== 'admin') {
		return redirect('/'); // Redirige a la home si no es admin
	}
	
	// Usamos un cliente con privilegios de administrador para esta llamada
	const supabaseAdmin = await createAdminClient();

	// 2. Obtener todos los datos necesarios (Lógica de fetch se mantiene igual)
	const { data: availableGroupsData } = await supabaseAdmin.from('app_groups').select('id, group');
	const availableGroups = availableGroupsData || [];
	
	const { data: profilesData, error: profilesError } = await supabaseAdmin.from('profiles').select('id, role');
	const { data: groupRelations, error: groupsError } = await supabaseAdmin.from('profiles_groups').select('id_user, app_groups(id, group)');
	const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();

	if (profilesError || authError || groupsError) {
		console.error('Error fetching users:', profilesError, groupsError, authError);
		return <div>Error al cargar los usuarios.</div>;
	}

	// 3. Unir los datos (Lógica de unión se mantiene igual)
	const profilesMap = new Map(profilesData?.map(p => [p.id, p]));
	const groupsMap = new Map<string, any[]>();
	groupRelations?.forEach(relation => {
		if (!groupsMap.has(relation.id_user)) {
			groupsMap.set(relation.id_user, []);
		}
		groupsMap.get(relation.id_user)!.push(relation);
	});

	// Unimos la información y usamos el tipo UserProfileAdminView
	const profiles: UserProfileAdminView[] = (authUsers?.users || [])
		.map((authUser: User) => {
			const profileData = profilesMap.get(authUser.id) || { role: 'user' };
			const userGroups = groupsMap.get(authUser.id) || [];
			return {
				id: authUser.id,
				email: authUser.email || null,
				role: profileData.role,
				profiles_groups: userGroups as UserGroupRelation[], // Asegurar el tipo
			};
		})
		.sort((a: UserProfileAdminView, b: UserProfileAdminView) => (a.email || '').localeCompare(b.email || ''));

	// Datos del Header
	const headerProps: UserMenuProps = {
		userEmail: user.email || '',
		userRole: userRole,
    // La ruta actual la obtiene el header en el cliente
	};
	
	return (
		<div className="min-h-screen bg-slate-50 font-sans">
			{/* 1. HEADER UNIFICADO */}
			<UnifiedAppHeader
				title="Gestión de Usuarios"
				backHref="/" // Vuelve a la Home Page
				userEmail={headerProps.userEmail}
				userRole={headerProps.userRole}
				maxWClass="max-w-2xl"
        moduleMenu={<SettingsMenu />}
			/>

			{/* CONTENIDO PRINCIPAL */}
			<main className="max-w-5xl mx-auto p-6">
				<h2 className="text-2xl font-bold mb-6 text-slate-700">Lista de Usuarios</h2>
				<div className="rounded-md border bg-white">
					<Table>
						{/* TableHeader se mantiene igual */}
						<TableBody>
							{profiles?.map((profile: UserProfileAdminView) => ( // Usamos el nuevo tipo
								<TableRow key={profile.id}>
									<TableCell className="font-medium truncate">{profile.email}</TableCell>
									<TableCell>
										{profile.role === 'admin' ? <Badge>Admin</Badge> : <Badge variant="secondary">Usuario</Badge>}
									</TableCell>
									<TableCell>
										<div className="flex flex-wrap gap-1">
											{profile.profiles_groups.length > 0 ? (
												profile.profiles_groups.map((ug: UserGroupRelation) => ( // Usamos el nuevo tipo
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
											availableGroups={availableGroups.filter(ag => !profile.profiles_groups.some((pg) => pg.app_groups?.id === ag.id))}
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