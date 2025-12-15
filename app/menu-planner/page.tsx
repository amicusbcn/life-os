import { createClient } from '@/utils/supabase/server';
import { UnifiedAppHeader } from '@/app/core/components/UnifiedAppHeader'; 
import MenuPlannerMenu from './components/MenuPlannerMenu';
import MenuPlannerWeeklyTable from './components/MenuPlannerWeeklyTable'; 
import { format, startOfWeek, endOfWeek } from 'date-fns'; // Importamos funciones de fecha
import { getWeeklySchedule } from '@/app/menu-planner/data'; // Usamos tu función

export default async function MenuPlannerPage() {
  const supabase = await createClient();
  
  // 1. Obtener el usuario
  const { data: { user } } = await supabase.auth.getUser();
  
  // Valores por defecto para invitado
  let userEmail = 'Invitado';
  let userRole = 'guest';

  if (user) {
    // 2. Obtener el perfil y asegurar el email
    userEmail = user.email || 'Sin Email';
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
      
    // Usamos el rol del perfil, si existe, o 'user' como fallback.
    userRole = profile?.role || 'user'; 
  }
  // 🚨 CÁLCULO DEL RANGO DE FECHAS (Semana actual)
    const today = new Date();
    const start = startOfWeek(today, { weekStartsOn: 1 }); // Lunes
    const end = endOfWeek(today, { weekStartsOn: 1 }); // Domingo

    const startDateKey = format(start, 'yyyy-MM-dd');
    const endDateKey = format(end, 'yyyy-MM-dd');

    // 🚨 CARGA DE DATOS usando tu función getWeeklySchedule
    const initialScheduleResult = await getWeeklySchedule(startDateKey, endDateKey);
  return (
    <div className="min-h-screen bg-slate-100 font-sans pb-24">
      
      {/* HEADER SUPERIOR */}
      <UnifiedAppHeader
              title="Menú Semanal"
              backHref="/"
              userEmail={user?.email || ''} // Usamos el usuario obtenido
              userRole={userRole}
              maxWClass='max-w-xl'
              moduleMenu={<MenuPlannerMenu />} 

            />
      <MenuPlannerWeeklyTable initialSchedule={initialScheduleResult}/>
    </div>
  );
}