// app/booking/page.tsx
import { Suspense } from 'react';
import { createClient } from '@/utils/supabase/server';
import { getUserData } from '@/utils/security'; // <--- CAMBIADO A getUserData
import { getBookingProperties, getMonthEvents, getActiveHandovers, getPropertyMembers, getAllBookingProfiles, getHolidays } from './data';
import CalendarView from './components/calendar-view';
import { ImpersonationProvider } from './components/impersonationContext';
import { ImpersonationBar } from './components/impersonationBar';
import { HandoverBoard } from './components/HandoverBoard';
import { parse, isValid } from 'date-fns';
import { UnifiedAppSidebar } from '@/components/layout/UnifiedAppSidebar'; // <--- NUEVO LAYOUT
import { BookingMenu } from './components/BookingMenu';
import { BookingMember, BookingProfile } from '@/types/booking';
import { BookingDialogManager } from './components/BookingDialogManager';

export default async function BookingPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // 1. Seguridad unificada
  const { profile, accessibleModules, userRole, isAdminGlobal, modulePermission } = await getUserData('booking');

  const params = await searchParams;
  const isSuperAdmin = isAdminGlobal;
  const isModuleAdmin = modulePermission === 'admin';
  const showImpersonationBar = isSuperAdmin && params.debug === 'true';

  const dateParam = typeof params.date === 'string' ? params.date : null;
  let currentDate = new Date();
  if (dateParam) {
    const parsed = parse(dateParam, 'yyyy-MM', new Date());
    if (isValid(parsed)) currentDate = parsed;
  }
  
  // 2. CARGA DE DATOS (Delegada a data.ts)
  const [properties, allProfiles, holidays] = await Promise.all([
    getBookingProperties(),
    isModuleAdmin ? getAllBookingProfiles() : Promise.resolve([]),
    getHolidays()
  ]);

  
  // 3. Selección de Propiedad
  const propSlug = typeof params.prop === 'string' ? params.prop : properties[0]?.slug;
  let selectedProperty = properties.find(p => p.slug === propSlug) || properties[0];

  // 4. Datos contextuales de la propiedad seleccionada
  const [events, handovers, propertyMembers] = selectedProperty 
    ? await Promise.all([
        getMonthEvents(selectedProperty.id, currentDate),
        getActiveHandovers(selectedProperty.id),
        getPropertyMembers(selectedProperty.id)
      ])
    : [[], [], []];

  // Identificar si soy Owner de la propiedad seleccionada
  const isPropertyOwner = !!(propertyMembers as BookingMember[]).find(
    m => m.profile?.user_id === profile.id && m.role === 'owner'
  );
  
  return (
    <ImpersonationProvider realUserId={profile.id} profiles={allProfiles}>
        <UnifiedAppSidebar
            title="Reservas Familiares"
            profile={profile}
            modules={accessibleModules}
            // Cuerpo del Sidebar: Generador de turnos
            moduleMenu={
                <BookingMenu 
                    mode="operative"
                    isSuperAdmin={isSuperAdmin}
                    isModuleAdmin={isModuleAdmin}
                    isPropertyOwner={isPropertyOwner}
                    isDebugActive={showImpersonationBar} 
                    currentProperty={selectedProperty} 
                />
            }
            // Pie del Sidebar: Ajustes de propiedad y modo admin
            moduleSettings={
                <BookingMenu 
                    mode="settings"
                    isSuperAdmin={isSuperAdmin}
                    isModuleAdmin={isModuleAdmin}
                    isPropertyOwner={isPropertyOwner}
                    isDebugActive={showImpersonationBar} 
                    currentProperty={selectedProperty} 
                />
            }
        >
            {/* Gestión de Diálogos */}
            <Suspense fallback={null}>
                <BookingDialogManager 
                    isModuleAdmin={isModuleAdmin}
                    currentProperty={selectedProperty!}
                    members={propertyMembers}
                    allProfiles={allProfiles}
                    properties={properties}
                    currentUserId={profile.id}
                    holidays={holidays}
                />
            </Suspense>

            {/* Barra de Impersonación dentro del contenido */}
            {showImpersonationBar && <div className="mb-6"><ImpersonationBar /></div>}

            {properties.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
                <h2 className="text-xl font-bold text-slate-800">No hay propiedades creadas</h2>
                <p className="text-slate-500 mt-2">Contacta con el administrador para dar de alta una propiedad.</p>
              </div>
            ) : (
              <div className="space-y-8">
                <CalendarView 
                    properties={properties} 
                    events={events}           
                    currentProperty={selectedProperty!} 
                    currentDate={currentDate} 
                    holidays={holidays}
                />
                {selectedProperty && (
                    <HandoverBoard 
                        property={selectedProperty} 
                        initialHandovers={handovers as any}
                    />
                )}
              </div>
            )}
        </UnifiedAppSidebar>
    </ImpersonationProvider>
  );
}