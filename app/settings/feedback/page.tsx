// app/settings/feedback/page.tsx (SERVER COMPONENT)
import { redirect } from 'next/navigation';
import { getFeedbackProposals } from '@/app/core/actions'; 
import { getUserData } from '@/utils/security'; // Usando el nuevo nombre getUserData
import { UnifiedAppSidebar } from '@/components/layout/UnifiedAppSidebar';
import { SettingsMenu } from '../components/SettingsMenu';
import { FeedbackTableView } from '../components/FeedbackTableView';

export default async function FeedbackAdminPage() {
    // 1. Obtenemos perfil, módulos y rol mediante la utilidad unificada
    const { profile, accessibleModules, userRole } = await getUserData();

    // 2. Protección de Rol: Solo administradores
    if (userRole !== 'admin') {
        redirect('/'); 
    }

    // 3. Fetching de Datos específicos del buzón
    const proposals = await getFeedbackProposals();

    return (
        <UnifiedAppSidebar
            title="Gestión de Sugerencias"
            profile={profile}
            modules={accessibleModules}
            // Inyectamos el menú de configuración (mismo que Perfil y Usuarios)
            moduleMenu={userRole === 'admin' ? <SettingsMenu currentPanel="feedback"/> : null}
            
        >
            {/* Contenedor ancho para la tabla de feedback */}
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Buzón de Sugerencias</h2>
                    <p className="text-sm text-slate-500">Revisa y gestiona las ideas enviadas por los usuarios de Life-OS.</p>
                </div>

                {/* Tabla de Feedback (Client Component) */}
                <FeedbackTableView 
                    proposals={proposals} 
                    isAdmin={true} 
                />
            </div>
        </UnifiedAppSidebar>
    );
}