// app/menu-planner/page.tsx
import { createClient } from '@/utils/supabase/server';
import { UnifiedAppHeader } from '@/app/core/components/UnifiedAppHeader'; 
import MenuPlannerMenu from './components/MenuPlannerMenu';
import MenuPlannerWeeklyTable from './components/MenuPlannerWeeklyTable'; 
import { format, startOfWeek, endOfWeek } from 'date-fns'; 
// 🚨 Importamos las funciones necesarias de data.ts
import { getWeeklySchedule, getAllRecipes, getAllRecipeCategories } from '@/app/menu-planner/data'; 

export default async function MenuPlannerPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    let userRole = 'guest';

    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
        userRole = profile?.role || 'user'; 
    }
    
    // 2. CÁLCULO DEL RANGO DE FECHAS
    const today = new Date();
    const start = startOfWeek(today, { weekStartsOn: 1 }); 
    const end = endOfWeek(today, { weekStartsOn: 1 });

    const startDateKey = format(start, 'yyyy-MM-dd');
    const endDateKey = format(end, 'yyyy-MM-dd');

    // 🚨 3. CARGA PARALELA DE TODOS LOS DATOS
    const [scheduleResult, recipesResult, categoriesResult] = await Promise.all([
        getWeeklySchedule(startDateKey, endDateKey),
        getAllRecipes(), // 🚨 Nueva llamada para recetas
        getAllRecipeCategories(), // 🚨 Nueva llamada para categorías
    ]);

    // 4. Procesar y mapear resultados de la planificación
    const initialSchedule: any = {}; // Usamos 'any' para simplificar el mapeo a objeto keyed por fecha
    if (!('error' in scheduleResult)) {
        scheduleResult.forEach((schedule: any) => {
            initialSchedule[schedule.schedule_date] = schedule;
        });
    }

    // 5. Procesar resultados de datos estáticos
    const allRecipes = ('error' in recipesResult) ? [] : recipesResult;
    const allCategories = ('error' in categoriesResult) ? [] : categoriesResult;

    return (
        <div className="min-h-screen bg-slate-100 font-sans pb-24">
            <UnifiedAppHeader
                title="Menú Semanal"
                backHref="/"
                userEmail={user?.email || ''} 
                userRole={userRole}
                maxWClass='max-w-xl'
                moduleMenu={<MenuPlannerMenu />} 
            />
            {/* 🚨 Pasar todos los datos a la tabla */}
            <MenuPlannerWeeklyTable 
                initialSchedule={initialSchedule}
                allRecipes={allRecipes}
                allCategories={allCategories}
            />
        </div>
    );
}