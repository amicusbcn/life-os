import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getUserData } from '@/utils/security';
import { PropertyProvider } from '../context/PropertyContext'; // Importamos el contexto
import { 
    getProperties, getPropertyBySlug, getPropertyLocations, 
    getPropertyMembers, getPropertyContacts, getPropertyAlerts 
} from '../data';

// Importamos el Wrapper que contiene el Sidebar y la lógica de vistas
import { PropertyDetailView } from '../components/PropertyDetailView';

interface PageProps {
    params: { slug: string };
}

export default async function PropertyDetailPage({ params }: PageProps) {
    const { slug } = await params;
    const supabase = await createClient();
    
    // 1. Seguridad Global y Datos de Usuario
    const { profile, accessibleModules } = await getUserData('properties');
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return redirect('/login');

    // 2. Datos de la Propiedad (Server Side)
    const property = await getPropertyBySlug(slug);
    if (!property) notFound();

    // 3. Carga paralela del resto de datos
    const [zones, members, contacts, alerts, allProperties] = await Promise.all([
        getPropertyLocations(property.id),
        getPropertyMembers(property.id),
        getPropertyContacts(property.id),
        getPropertyAlerts(property.id),
        getProperties()
    ]);

    // 4. Renderizado
    return (
        // AQUÍ ESTABA EL FALLO: Hay que pasarle los datos al Provider
        <PropertyProvider 
            property={property}      // <--- OBLIGATORIO
            members={members}        // <--- OBLIGATORIO
            currentUserId={user.id}  // <--- OBLIGATORIO (para saber quién eres)
        >
            <PropertyDetailView 
                property={property}
                zones={zones}
                contacts={contacts}
                alerts={alerts}
                allProperties={allProperties}
                profile={profile}
                accessibleModules={accessibleModules}
            />
        </PropertyProvider>
    );
}