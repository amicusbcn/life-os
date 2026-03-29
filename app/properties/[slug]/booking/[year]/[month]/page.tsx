import { notFound } from 'next/navigation';
import { getPropertyBySlug, getPropertyMembers } from '@/app/properties/data';
import { getCalendarEvents, getExemptions, getSchedulerSettings } from '@/app/bookings/data'; // Nuestra función v2
import { getHolidays } from '@/app/core/data'; // Los festivos globales
import { getAccessControl } from '@/utils/security';
import CalendarView from '@/app/bookings/components/CalendarView';
import { UnifiedAppSidebar } from '@/components/layout/UnifiedAppSidebar';
import { BookingMenu } from '@/app/bookings/components/BookingMenu';

interface PageProps {
  params: Promise<{ slug: string,year:number,month:number }>;
  searchParams: Promise<{ date?: string, debug?:string }>;
}

export default async function PropertyBookingPage({ params, searchParams }: PageProps) {
  const { slug,year,month } = await params;
  const sParams = await searchParams;

  // 1. Contexto y Seguridad (Lo que ya teníamos)
  const property = await getPropertyBySlug(slug);
  if (!property || !property.active_modules?.bookings) notFound();

  const { profile, security, accessibleModules } = await getAccessControl('booking', {
    table: "property_members",
    column: "property_id",
    id: property.id
  });

  // 2. Carga de datos v2
  const now = new Date();
  // ... lógica de parseo de sParams.date ...

  const [events, holidays, exemptions] = await Promise.all([
    getCalendarEvents(property.id, month, year),
    getHolidays(year,month-1, profile.locality,profile.id),
    getExemptions(property.id)
  ]);
  console.log(holidays)
  return (
    <UnifiedAppSidebar
      title="Reservas Familiares"
      profile={profile}
      modules={accessibleModules} // Para el selector de módulos (Inventario, Bookings...)  // El sidebar sabrá en qué casa estamos
      
      // Menú específico de Bookings (Operativo)
      moduleMenu={
        <BookingMenu 
          mode="operative"
          isAdmin={security.isModuleAdmin  || security.isGlobalAdmin}
          isDebugActive={security.isGlobalAdmin && sParams.debug === 'true'}
          currentProperty={property}
          view={'calendar'}
        />
      }
      // Menú de Ajustes (Solo si es admin/owner)
      moduleSettings={
        security.isModuleAdmin && (
          <BookingMenu 
            mode="settings"
            currentProperty={property}
            isAdmin={security.isModuleAdmin  || security.isGlobalAdmin}
          />
        )
      }
    >
      <div className="space-y-8">
        <CalendarView 
          events={events}
          exemptions={exemptions}
          holidays={holidays}
          currentProperty={property}
          year={year}
          month={month-1}
          currentDate={now}
        />
      </div>
    </UnifiedAppSidebar>
  );
}