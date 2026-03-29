// app/maintenance/calendar/page.tsx
import { getCalendarActions } from "../../../data";
import { CalendarView } from "../../../components/CalendarView"; // Nuevo componente de vista
import { getAccessControl } from "@/utils/security";
import { notFound, redirect } from "next/navigation";
import { CalendarEvent } from "@/types/calendar";
import { getHolidays } from "@/app/core/data";

interface PageProps {
  params: Promise<{ year: string; month: string }>;
  searchParams: Promise<{eventId:string}>;
}

export default async function MonthlyCalendarPage({ params,searchParams }: PageProps) {
  // 1. Resolvemos los parámetros de la URL
  const { year, month } = await params;
  const { eventId } = await searchParams;
  const yearInt = parseInt(year);
  const monthInt = parseInt(month) - 1; 

  // Validación básica
  if (isNaN(yearInt) || isNaN(monthInt) || monthInt < 0 || monthInt > 11) {
    return notFound();
  }
    const {profile,accessibleModules, security} = await getAccessControl('maintenance');

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
        const holidays = await getHolidays(yearInt,monthInt, profile.locality,profile.id);

        return (
            <CalendarView 
                events={calendarEvents}
                profile={profile}
                accessibleModules={accessibleModules}
                isAdmin={security.isModuleAdmin}
                month={monthInt}
                year={yearInt}
                holidays={holidays}
                initialEventId={eventId}
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