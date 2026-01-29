// app/menu-planner/page.tsx
import { getUserData } from '@/utils/security';
import { UnifiedAppSidebar } from '@/components/layout/UnifiedAppSidebar';
import MenuPlannerMenu from './components/MenuPlannerMenu';
import MenuPlannerWeeklyTable from './components/MenuPlannerWeeklyTable'; 
import { format, startOfWeek, endOfWeek } from 'date-fns'; 
import { getWeeklySchedule, getAllRecipes, getAllRecipeCategories } from '@/app/menu-planner/data'; 
import { SidebarMenu } from '@/components/ui/sidebar';

export default async function MenuPlannerPage() {
    // 1. Seguridad y Perfil centralizado (validamos acceso al módulo 'menu-planner')
    const { profile, accessibleModules } = await getUserData('menu-planner');
    
    // 2. Cálculo del rango de fechas para la semana actual
    const today = new Date();
    const start = startOfWeek(today, { weekStartsOn: 1 }); 
    const end = endOfWeek(today, { weekStartsOn: 1 });

    const startDateKey = format(start, 'yyyy-MM-dd');
    const endDateKey = format(end, 'yyyy-MM-dd');

    // 3. Carga paralela de datos del módulo
    const [scheduleResult, recipesResult, categoriesResult] = await Promise.all([
        getWeeklySchedule(startDateKey, endDateKey),
        getAllRecipes(),
        getAllRecipeCategories(),
    ]);

    // 4. Procesar planificación (keyed por fecha)
    const initialSchedule: any = {};
    if (!('error' in scheduleResult)) {
        scheduleResult.forEach((schedule: any) => {
            initialSchedule[schedule.schedule_date] = schedule;
        });
    }

    const allRecipes = ('error' in recipesResult) ? [] : recipesResult;
    const allCategories = ('error' in categoriesResult) ? [] : categoriesResult;

        return (
        <UnifiedAppSidebar
            title="Planificador de Menús"
            profile={profile}
            modules={accessibleModules}
            // Inyectamos las herramientas de configuración en el pie
            moduleMenu={
                <SidebarMenu>
                    <MenuPlannerMenu mode="operative" />
                </SidebarMenu>
            }
            moduleSettings={
                <SidebarMenu>
                    <MenuPlannerMenu mode="settings" />
                </SidebarMenu>
            }
        >
            {/* Contenedor con ancho controlado para que la tabla no se estire infinito */}
            <div className="max-w-4xl mx-auto">
                <MenuPlannerWeeklyTable 
                    initialSchedule={initialSchedule}
                    allRecipes={allRecipes}
                    allCategories={allCategories}
                />
            </div>
        </UnifiedAppSidebar>
    );
}