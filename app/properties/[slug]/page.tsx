import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getAccessControl, getUserData } from '@/utils/security';
import { PropertyProvider } from '../context/PropertyContext'; // Importamos el contexto
import { 
    getProperties, getPropertyBySlug, getPropertyLocations, 
    getPropertyMembers, getPropertyContacts, getPropertyAlerts, 
    getPropertyDocuments
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
    const { profile, accessibleModules,security } = await getAccessControl('properties');

    // 2. Datos de la Propiedad (Server Side)
    const property = await getPropertyBySlug(slug);
    if (!property) notFound();
    
    // 3. Carga paralela del resto de datos
    const [zones, members, contacts, alerts,documents, allProperties] = await Promise.all([
        getPropertyLocations(property.id),
        getPropertyMembers(property.id),
        getPropertyContacts(property.id),
        getPropertyAlerts(property.id),
        getPropertyDocuments(property.id),
        getProperties(profile.id)
    ]);

    // 4. Renderizado
    return (
        // AQUÍ ESTABA EL FALLO: Hay que pasarle los datos al Provider
        <PropertyProvider 
            property={property}      
            members={members}        
            currentUserId={profile.id}  
        >
            <PropertyDetailView 
                property={property}
                zones={zones}
                contacts={contacts}
                alerts={alerts}
                documents={documents}
                allProperties={allProperties}
                profile={profile}
                accessibleModules={accessibleModules}
            />
        </PropertyProvider>
    );
}