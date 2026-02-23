// utils/location-utils.ts
import { createClient } from '@/utils/supabase/client'; // <--- CLIENTE DE BROWSER

export async function getTaskLocationPath(task: any) {
    if (!task) return "Sin ubicación";
    
    const supabase = createClient();
    let path: string[] = [];

    // 2. Determinar ID de inicio y tabla
    // Usamos los nombres de columna que confirmamos antes en tu SQL
    const isPersonal = task.is_personal;
    const startId = isPersonal ? task.location_id : task.location_id; 
    const table = isPersonal ? 'inventory_locations' : 'property_locations';

    if (!startId) {
        if (task.inventory_items?.name) path.push(task.inventory_items.name);
        return path.join(" / ");
    }

    // 3. Función recursiva para sacar el árbol
    async function fetchParent(id: string) {
        const { data } = await supabase
            .from(table)
            .select('name, parent_id')
            .eq('id', id)
            .single();

        if (data) {
            // Añadimos al inicio (después del contexto)
            path.push(data.name);
            if (data.parent_id) {
                await fetchParent(data.parent_id);
            }
        }
    }

    await fetchParent(startId);
    path.reverse()
    return path.join(" / ");
}