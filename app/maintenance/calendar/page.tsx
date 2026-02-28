// app/maintenance/calendar/page.tsx
import { getCalendarActions } from "../data";
import { CalendarView } from "../components/CalendarView"; // Nuevo componente de vista
import { getUserData } from "@/utils/security";
import { redirect } from "next/navigation";
import { CalendarEvent } from "@/types/calendar";

interface PageProps {
    searchParams: Promise<{ month?: string, year?: string }>;
}

export default async function CalendarPage({ searchParams }: PageProps) {
    // 1. Resolvemos params y seguridad con getUserData
    const sParams = await searchParams;
    const { 
        profile, 
        isAdminGlobal, 
        modulePermission, 
        accessibleModules 
    } = await getUserData('maintenance');

    if (!profile) redirect("/login");

    // 2. Parámetros de tiempo
    const month = sParams.month ? parseInt(sParams.month) : new Date().getMonth();
    const year = sParams.year ? parseInt(sParams.year) : new Date().getFullYear();

    try {
        // 3. Carga de datos de mantenimiento
        const actions = await getCalendarActions(month, year);

        // 4. Mapeo al contrato UnifiedCalendar
        const calendarEvents: CalendarEvent[] = actions.map(log => ({
            id: log.id,
            date: new Date(log.activity_date),
            title: log.task.title,
            type: 'maintenance',
            status: log.is_completed ? 'completed' : 'pending',
            payload: { log, task: log.task }
        }));

        return (
            <CalendarView 
                events={calendarEvents}
                profile={profile}
                accessibleModules={accessibleModules}
                isAdmin={isAdminGlobal || modulePermission === 'admin'}
            />
        );
    } catch (e) {
        console.error("Error en CalendarPage:", e);
        // Podríamos redirigir o mostrar un estado de error
        return (
            <div className="p-x text-center">
                <p className="text-slate-500 font-bold">Error al cargar el calendario.</p>
            </div>
        );
    }
}