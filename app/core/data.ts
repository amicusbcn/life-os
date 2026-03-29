// app/maintenance/data.ts (o donde tengas el fetcher)

import { Holiday } from "@/types/calendar";
import { createClient } from "@/utils/supabase/client";

import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, format } from 'date-fns';

// /app/core/data.ts (o donde tengas tus fetches)

export async function getHolidays(year: number, month: number, locality: string, userId: string) {
    const supabase = await createClient();
    if (isNaN(year) || isNaN(month)) {
        return []; // Opcional: devolver array vacío si la fecha es basura
    }
    const monthDate = new Date(year, month, 1);
    const gridStart = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 });
    const gridEnd = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 });
    const { data, error } = await supabase.rpc('get_calendar_holidays', {
        p_start_date: format(gridStart, 'yyyy-MM-dd'),
        p_end_date: format(gridEnd, 'yyyy-MM-dd'),
        p_locality: locality,
        p_user_id: userId
    });

    if (error) {
        console.error("❌ Error en RPC get_calendar_holidays:", error);
        return [];
    }

    return data;
}