// app/maintenance/calendar/page.tsx
import { getCalendarActions } from "../data";
import { MaintenanceCalendar } from "../components/MaintenanceCalendar";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export default async function CalendarPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) redirect("/login");

    // Traemos las acciones (esta es la función que definimos antes)
    const actions = await getCalendarActions();

    return (
        <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
            <header>
                <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">
                    Calendario de Mantenimiento
                </h1>
                <p className="text-sm text-slate-500 font-medium">
                    Planificación mensual de actividades y revisiones.
                </p>
            </header>

            {/* Pasamos los datos al componente cliente. 
                Usamos un array vacío como fallback para evitar el error de .filter() */}
            <MaintenanceCalendar actions={actions || []} />
        </div>
    );
}