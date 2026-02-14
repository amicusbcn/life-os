import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getUserData } from '@/utils/security';
import { UnifiedAppSidebar } from '@/components/layout/UnifiedAppSidebar';
import { PropertyProvider } from '../../context/PropertyContext';
import { 
    getPropertyBySlug, getPropertyLocations, 
    getPropertyMembers, getPropertyAlerts, 
} from '../../data';

import { PropertySettingsMenu } from '../../components/PropertySettingsMenu';
import { PropertySettingsContent } from '../../components/PropertySettingsContent';

interface PageProps {
    params: { slug: string };
    searchParams: { section?: string }; // Leemos ?section=...
}

export default async function SettingsPage({ params, searchParams }: PageProps) {
    const { slug } = await params;
    const { section = 'general' } = await searchParams; // Default a 'general'
    
    const supabase = await createClient();
    
    // 1. Seguridad Global
    const { profile, accessibleModules } = await getUserData('properties');
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return redirect('/login');

    // 2. Carga de Datos
    const property = await getPropertyBySlug(slug);
    if (!property) notFound();

    // Cargamos lo necesario para configuración
    const [zones, members, alerts] = await Promise.all([
        getPropertyLocations(property.id),
        getPropertyMembers(property.id),
        getPropertyAlerts(property.id)
    ]);

    // 3. Verificación de Permisos (Server Side Protection)
    // Solo admins/owners pueden entrar aquí
    const currentUser = members.find(m => m.user_id === user.id);
    const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'owner';

    if (!canEdit) {
        // Si intenta entrar alguien sin permiso, lo echamos al dashboard
        return redirect(`/properties/${slug}`);
    }

    return (
        <PropertyProvider 
            property={property} 
            members={members} 
            currentUserId={user.id}
        >
            <UnifiedAppSidebar
                title={`Ajustes: ${property.name}`}
                profile={profile}
                modules={accessibleModules}
                // El botón atrás te devuelve al Dashboard de la casa
                backLink={[`/properties/${slug}`, "Volver al Dashboard"]}
                
                // MENÚ DE NAVEGACIÓN
                moduleMenu={<PropertySettingsMenu slug={slug} />}
            >
                {/* CONTENIDO CENTRAL */}
                <div className="max-w-4xl mx-auto p-6 md:p-10">
                    <PropertySettingsContent 
                        section={section}
                        zones={zones}
                        alerts={alerts}
                    />
                </div>
                
            </UnifiedAppSidebar>
        </PropertyProvider>
    );
}