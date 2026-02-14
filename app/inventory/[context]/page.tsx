import { notFound } from 'next/navigation';
import { getUserData } from '@/utils/security';
import { InventoryClientView } from '../components/InventoryClientView';

// IMPORTAMOS LA DATA LAYER
import { 
    getInventoryCategories, 
    getUserProperties, 
    getInventoryContextData, 
    getAvailableProfiles
} from '../data';

export default async function InventoryContextPage({ params }: { params: { context: string } }) {
    const { context } = await params;
    
    // 1. Auth y Permisos
    const { profile, accessibleModules } = await getUserData('inventory');

    // 2. Carga Inicial de Contexto (Necesitamos el propertyId para los perfiles)
    // Primero obtenemos el contexto para saber si hay propertyId
    const contextData = await getInventoryContextData(context);

    if (!contextData) {
        return notFound();
    }

    // 3. Carga Paralela del resto de datos
    // Ahora que tenemos contextData.propertyId de forma segura, lanzamos el resto
    const [categories, availableProperties, profiles] = await Promise.all([
        getInventoryCategories(),
        getUserProperties(),
        getAvailableProfiles(contextData.propertyId || undefined) // <--- Ahora con AWAIT (dentro del all)
    ]);

    return (
        <InventoryClientView 
            // Contexto
            title={contextData.name}
            currentContext={context}
            propertyId={contextData.propertyId || undefined}
            
            // Datos Maestros
            categories={categories}
            locations={contextData.locations} // Pueden ser personales o de propiedad
            availableProperties={availableProperties}
            
            // Datos Principales
            items={contextData.items}
            
            // Layout
            profile={profile}
            accessibleModules={accessibleModules}
            availableProfiles={profiles}
        />
    );
}