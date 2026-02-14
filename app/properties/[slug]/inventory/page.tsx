// app/properties/[slug]/inventory/page.tsx
import { notFound, redirect } from 'next/navigation';
import { InventoryClientView } from '@/app/inventory/components/InventoryClientView';
import { 
    getInventoryCategories, 
    getUserProperties, 
    getInventoryContextData, 
    getAvailableProfiles 
} from '@/app/inventory/data';
import { getUserData } from '@/utils/security';
import { getPropertyBySlug } from '../../data';
import { createClient } from '@/utils/supabase/server';

export default async function PropertyInventoryPage({ 
    params 
}: { 
    params: Promise<{ slug: string }> // Cambiado de id a slug
}) {
    const { slug } = await params;
    
    const supabase = await createClient();
    
    // 1. Seguridad Global
    const { profile, accessibleModules } = await getUserData('properties');
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return redirect('/login');

    // 2. Carga de Datos
    const property = await getPropertyBySlug(slug);
    if (!property) notFound();
    
    // 3. Cargamos los datos usando el slug (que es el ID de la propiedad en tu DB)
    const [categories, availableProperties, contextData, profiles] = await Promise.all([
        getInventoryCategories(),
        getUserProperties(),
        getInventoryContextData(property?.slug || ""), // Pasamos el slug
        getAvailableProfiles(property?.id || "")
    ]);
  
    
    if (!contextData) return notFound();

    return (
        <InventoryClientView 
            // Configuración de contexto
            title={`Inventario de ${contextData.name}`}
            currentContext={property?.slug || ""}
            propertyId={property?.id || ""}
            
            // Datos
            categories={categories}
            locations={contextData.locations}
            items={contextData.items}
            
            // Gestión y Seguridad
            availableProperties={availableProperties}
            availableProfiles={profiles}
            profile={profile}
            accessibleModules={accessibleModules}
            backLink={{
                href: `/properties/${slug}`,
                label: "Dashboard Propiedad"
            }}
            
        />
    );
}