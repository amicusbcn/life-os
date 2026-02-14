import { createClient } from '@/utils/supabase/server';
import { InventoryCategory, InventoryLocation } from '@/types/inventory';

// Importamos AMBAS funciones de properties
import { 
    getPropertyBySlug, 
    getPropertyLocations, // <--- ¡AQUÍ ESTÁ!
    getPropertyMembers
} from '../properties/data';

// 1. Obtener Categorías
export async function getInventoryCategories() {
    const supabase = await createClient();
    const { data } = await supabase
        .from('inventory_categories')
        .select('*')
        .order('name');
    
    return (data || []) as InventoryCategory[];
}

// 2. Obtener Propiedades del Usuario
export async function getUserProperties() {
    const supabase = await createClient();
    const { data } = await supabase
        .from('properties')
        .select('id, name, slug')
        .order('name');
        
    return data || [];
}

// 3. Obtener Datos según Contexto
export async function getInventoryContextData(context: string) {
    const supabase = await createClient();

    // --- CASO A: PERSONAL ---
    if (context === 'personal') {
        const [locationsRes, itemsRes] = await Promise.all([
            // Ubicaciones personales (Estas sí van por nombre)
            supabase.from('inventory_locations').select('*').order('name'),
            
            // Items personales
            supabase.from('inventory_items')
                .select(`
                    *,
                    inventory_categories ( name, icon ),
                    inventory_locations ( name )
                `)
                .is('property_id', null)
                .order('created_at', { ascending: false })
        ]);

        return {
            type: 'personal',
            name: 'Mi Inventario',
            propertyId: null,
            locations: (locationsRes.data || []) as InventoryLocation[],
            items: itemsRes.data || []
        };
    }

    // --- CASO B: PROPIEDAD ---
    const property = await getPropertyBySlug(context);

    if (!property) return null;

    const [locations, itemsRes] = await Promise.all([
        // 1. REUTILIZAMOS TU FUNCIÓN (Orden correcto por sort_order)
        getPropertyLocations(property.id),
        
        // 2. Items de la propiedad
        supabase.from('inventory_items')
            .select(`
                *,
                inventory_categories ( name, icon ),
                property_locations ( name )
            `)
            .eq('property_id', property.id)
            .order('created_at', { ascending: false })
    ]);

    return {
        type: 'property',
        name: property.name,
        propertyId: property.id,
        // TypeScript puede quejarse aquí si los tipos no son idénticos, 
        // pero como ambos tienen id y name, funcionará en la UI.
        locations: locations || [], 
        items: itemsRes.data || []
    };
}

export async function getInventoryItemDetails(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('inventory_items')
    .select(`
      *,
      category:inventory_categories(id, name, icon),
      inventory_maintenance_tasks (*,profiles:responsible_user_id (id, full_name, avatar_url) ,
      inventory_loans (*)

    )
  `).eq('id', id)
  .single();

  if (error) throw error;
  // Ordenamos los préstamos por fecha para que el más reciente sea el primero
  if (data.inventory_loans) {
    data.inventory_loans.sort((a: any, b: any) => 
        new Date(b.loan_date).getTime() - new Date(a.loan_date).getTime()
    );
  } 
  return data;
}

export async function getAvailableProfiles(propertyId?: string) {
    const supabase = await createClient();
    
    // CASO A: Estamos en una propiedad
    if (propertyId) {
        const members = await getPropertyMembers(propertyId);
        // Mapeamos al formato simple que espera el componente (id, full_name)
        return members.map(m => ({
            id: m.id,
            full_name: m.name,
            avatar_url: m.avatar_url
        }));
    }

    // CASO B: Es inventario personal
    // Devolvemos solo al usuario actual (o podrías ampliarlo a "Contactos" en el futuro)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', user.id)
        .single();

    return profile ? [profile] : [];
}