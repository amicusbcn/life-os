// app/properties/[slug]/booking/scheduler/page.tsx
import { getPropertyBySlug, getPropertyMembers } from "@/app/properties/data";
import {getSchedulerSettings} from "@/app/bookings/data"
import {SchedulerView} from "@/app/bookings/components/SchedulerView";
import { redirect } from "next/navigation";
import { getAccessControl } from '@/utils/security';
import { UnifiedAppSidebar } from '@/components/layout/UnifiedAppSidebar';
import { BookingMenu } from '@/app/bookings/components/BookingMenu';

export default async function SchedulerPage({ params }: any) {
  const { slug } = await params;
  
  // Aquí SÍ puedes usar el cliente de servidor porque esto corre en el server
  const property = await getPropertyBySlug(slug);
  
  if(!property) redirect('/properties');

  const { profile, security, accessibleModules } = await getAccessControl('booking', {
      table: "property_members",
      column: "property_id",
      id: property.id
    });
  
  const [members, settings] = await Promise.all([
    getPropertyMembers(property.id),
    getSchedulerSettings(property.id)
  ]);

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
              currentProperty={property}
              view="rotation"
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
      <SchedulerView 
        property={property}
        members={members}
        initialSettings={settings}
      />
    </UnifiedAppSidebar>
  );
}