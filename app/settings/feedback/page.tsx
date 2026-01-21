// app/settings/feedback/page.tsx (SERVER COMPONENT)

// Eliminamos: 'use client'; 

import { createClient } from '@/utils/supabase/server'; // OK en Server Component
import { redirect } from 'next/navigation';
import { getFeedbackProposals } from '@/app/core/actions'; 
import { UserMenuProps } from '@/types/common';
import { UnifiedAppHeader } from '@/app/core/components/UnifiedAppHeader';
import { SettingsMenu } from '../components/SettingsMenu';
import { FeedbackTableView } from '../components/FeedbackTableView';
export default async function FeedbackAdminPage() {
		const supabase = await createClient();
		const { data: { user } } = await supabase.auth.getUser();

		if (!user) redirect('/login');
		
		// Protección de Rol (Lógica Server-Side)
		const { data: profile } = await supabase
				.from('profiles')
				.select('role')
				.eq('id', user.id)
				.single();
				
		const userRole = profile?.role || 'user';
		if (userRole !== 'admin') {
				redirect('/'); // Redirigir si no es admin
		}

		// Fetching de Datos (SERVER-SIDE)
		const proposals = await getFeedbackProposals();
		
		const headerProps: UserMenuProps = {
				userEmail: user.email || '',
				userRole: userRole,
		};

		return (
				<div className="min-h-screen bg-slate-100 font-sans">
						<UnifiedAppHeader
								title="Gestión de Sugerencias"
								backHref="/"
								userEmail={headerProps.userEmail}
								userRole={headerProps.userRole}
								maxWClass='max-w-7xl'
								moduleMenu={<SettingsMenu />}
						/>
						
						{/* 2. RENDERIZAR EL CLIENT COMPONENT CON DATOS */}
						<FeedbackTableView 
							proposals={proposals}       // Mapeamos 'proposals' a 'feedbacks'
							isAdmin={userRole === 'admin'} // Pasamos el booleano obligatorio
						/>
				</div>
		);
}