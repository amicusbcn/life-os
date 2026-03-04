// app/settings/holidays/data.ts
'use server'
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

// 1. Obtener lista única de localidades existentes (para el filtro)
export async function getLocalities() {
    const supabase = await createClient();
    
    // Llamamos a la función SQL
    const { data, error } = await supabase.rpc('get_unique_localities');
    
    // Debug para confirmar: verás que es un array de objetos
    console.log("Datos brutos RPC:", data); 

    if (error) {
        console.error("Error fetching unique localities:", error);
        return [];
    }

    // 1. Extraemos el valor de la columna 'locality_name' de cada objeto
    // 2. Así devolvemos ['Bilbao', 'Barcelona'] en lugar de [{locality_name: 'Bilbao'}, ...]
    return data.map((item: any) => item.locality_name);
}

// 2. Obtener festivos para la consola de gestión
export async function getHolidaysList(year: number) {
    const supabase = await createClient();
    
    // Traemos:
    // - Anuales (de cualquier año)
    // - Puntuales del año seleccionado
    // - Nota: Como eres Admin Global, aquí ves TODO (Nacionales y Locales)
    // - Los 'personal' quizá querrás filtrarlos solo para ti o ver los de todos.
    const { data, error } = await supabase
        .from('app_holidays')
        .select('*')
        .or(`is_annual.eq.true,and(is_annual.eq.false,holiday_date.gte.${year}-01-01,holiday_date.lte.${year}-12-31)`)
        .order('holiday_date', { ascending: true });

    if (error) return [];
    return data;
}

export async function updateHoliday(id: string, formData: any) {
    const supabase = await createClient();

    const { date, name, scope, locality, is_annual, user_id } = formData;

    const { error } = await supabase
        .from('app_holidays')
        .update({
            holiday_date: date,
            name: name,
            scope: scope,
            locality: scope === 'local' ? locality.toLowerCase() : null,
            is_annual: is_annual,
            user_id: scope === 'personal' ? user_id : null
        })
        .eq('id', id);

    if (error) throw new Error(error.message);

    revalidatePath('/settings/holidays');
    return { success: true };
}