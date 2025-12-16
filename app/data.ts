// app/data.ts (Funciones de servidor para obtener datos)
'use server';

import { createClient } from '@/utils/supabase/server';
// 🚨 Nota: Asegúrate de tener los tipos definidos en tu carpeta /types
import { type LucideIcon } from 'lucide-react'; 

export interface ModuleConfig {
    module_key: string;
    route: string;
    icon_name: string;
    label_es: string;
}

/**
 * Obtiene la configuración de módulos de la aplicación desde la base de datos.
 */
export async function fetchModuleConfig(): Promise<ModuleConfig[]> {
    // Asumimos que createClient se importa correctamente
    const supabase = await createClient();
    
    // Aquí defines qué campos de tu tabla 'app_modules' necesitas
    const { data, error } = await supabase
        .from('app_modules')
        .select('module_key, route, icon_name, label_es')
        .eq('is_active', true) // Asumimos un filtro para solo módulos activos
        .order('module_key'); // Ordenar por clave o un campo de orden

    if (error) {
        console.error('Error fetching module config:', error);
        // Devolvemos un array vacío en caso de error para no romper la UI
        return [];
    }

    // El data devuelto es ModuleConfig[]
    return data;
}