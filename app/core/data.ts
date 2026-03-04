// app/maintenance/data.ts (o donde tengas el fetcher)

import { Holiday } from "@/types/calendar";
import { createClient } from "@/utils/supabase/client";

import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, format } from 'date-fns';

export async function getHolidays(year: number, month: number, locality: string, userId: string) {
    const supabase = await createClient();
    
    // 1. Rango de la rejilla (Grid) para ver las "colas" del mes anterior/siguiente
    const monthDate = new Date(year, month, 1);
    const gridStart = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 });
    const gridEnd = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 });

    const startStr = format(gridStart, 'yyyy-MM-dd');
    const endStr = format(gridEnd, 'yyyy-MM-dd');

    // 2. Construcción de la Query con Triple Filtro de Ámbito
    const { data, error } = await supabase
        .from('app_holidays')
        .select('*')
        // FILTRO A: Fecha (Anual o dentro del rango de la rejilla)
        .or(`is_annual.eq.true,and(holiday_date.gte.${startStr},holiday_date.lte.${endStr})`)
        // FILTRO B: Ámbito (Nacional OR Local de mi ciudad OR Personal mío)
        .or(`scope.eq.national,and(scope.eq.local,locality.eq.${locality.toLowerCase()}),and(scope.eq.personal,user_id.eq.${userId})`)
        .order('holiday_date', { ascending: true });

    if (error) {
        console.error("Error fetching holidays:", error);
        return [];
    }

    return data;
}