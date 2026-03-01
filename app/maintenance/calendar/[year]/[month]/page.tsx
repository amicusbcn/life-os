// app/maintenance/calendar/page.tsx
import { getCalendarActions } from "../../../data";
import { CalendarView } from "../../../components/CalendarView"; // Nuevo componente de vista
import { getUserData } from "@/utils/security";
import { notFound, redirect } from "next/navigation";
import { CalendarEvent } from "@/types/calendar";

interface PageProps {
  params: Promise<{ year: string; month: string }>;
}

export default async function MonthlyCalendarPage({ params }: PageProps) {
  // 1. Resolvemos los parámetros de la URL
  const { year, month } = await params;
  const yearInt = parseInt(year);
  const monthInt = parseInt(month);

  // Validación básica
  if (isNaN(yearInt) || isNaN(monthInt) || monthInt < 0 || monthInt > 11) {
    return notFound();
  }
    const { 
        profile, 
        isAdminGlobal, 
        modulePermission, 
        accessibleModules 
    } = await getUserData('maintenance');

    if (!profile) redirect("/login");
    try {
        // 3. Carga de datos de mantenimiento
        const actions = await getCalendarActions(monthInt, yearInt);

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