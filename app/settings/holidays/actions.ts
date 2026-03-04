// app/settings/holidays/actions.ts
'use server'; // O 'use server' si lo separas, pero para formularios de Next suele ser 'use server'
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createHoliday(formData: any) {
    const supabase = await createClient();

    const { date, name, scope, locality, is_annual, user_id } = formData;

    const { data, error } = await supabase
        .from('app_holidays')
        .insert([{
            holiday_date: date,
            name: name,
            scope: scope,
            locality: scope === 'local' &&locality? locality.toLowerCase() : null,
            is_annual: is_annual,
            user_id: scope === 'personal' ? user_id : null
        }]);

    if (error) {
        console.error("Error creating holiday:", error);
        throw new Error(error.message);
    }

    // Revalidamos para que el RegionalManager vea los cambios
    revalidatePath('/settings/holidays');
    return { success: true };
}

export async function deleteHoliday(id: string) {
    const supabase = await createClient();
    const { error } = await supabase.from('app_holidays').delete().eq('id', id);

    if (error) throw new Error(error.message);

    revalidatePath('/settings/holidays');
    return { success: true };
}