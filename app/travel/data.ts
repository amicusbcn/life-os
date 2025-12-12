// app/travel/data.ts
import { createClient } from '@/utils/supabase/server';
import { TravelMileageTemplate } from '@/types/travel';

/**
 * Obtiene todas las plantillas de kilometraje creadas por el usuario actual.
 */
export async function getMileageTemplates(): Promise<TravelMileageTemplate[]> {
    const supabase = await createClient();
    
    // RLS (Row Level Security) debería asegurar que solo se vean las del usuario.
    const { data, error } = await supabase
        .from('travel_mileage_templates')
        .select('*')
        .order('name', { ascending: true });

    if (error) {
        console.error("Error fetching mileage templates:", error);
        return [];
    }

    return data as TravelMileageTemplate[];
}