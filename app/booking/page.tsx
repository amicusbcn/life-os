import { Suspense } from 'react';
import { createClient } from '@/utils/supabase/server';
import { validateModuleAccess } from '@/utils/security'; // <--- IMPORTAMOS LA UTILIDAD
import { getBookingProperties, getMonthEvents, getActiveHandovers, getPropertyMembers } from './data';
import CalendarView from './components/calendar-view';
import { ImpersonationProvider } from './components/impersonationContext';
import { ImpersonationBar } from './components/impersonationBar';
import { HandoverBoard } from './components/HandoverBoard';
import { parse, isValid } from 'date-fns';
import { UnifiedAppHeader } from '../core/components/UnifiedAppHeader';
import { BookingMenu } from './components/BookingMenu';
import { BookingMember, BookingProfile } from '@/types/booking';
import { BookingDialogManager } from './components/BookingDialogManager';

export default async function BookingPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

  // 1. SEGURIDAD CENTRALIZADA (Nivel 1 y 2)
  // Esto valida Login + Superadmin + Permiso Módulo 'booking'
  const { user, isAdminGlobal, modulePermission } = await validateModuleAccess('booking');

  // Mapeamos a las variables que usa nuestra UI
  const isSuperAdmin = isAdminGlobal;
  const isModuleAdmin = modulePermission === 'admin'; // Si validateModuleAccess devuelve 'admin' (ya sea por global o local)

  // Modo Dios (Solo SuperAdmin)
  const showImpersonationBar = isSuperAdmin && params.debug === 'true';

  // ---------------------------------------------------------------------------
  // 2. CARGAR DATOS
  // ---------------------------------------------------------------------------
  
  // A. Lista Maestra de Perfiles (Solo si tienes rango de Admin de Módulo/Super)
  let allProfiles: BookingProfile[] = [];
  if (isModuleAdmin) {
     const { data: profilesData } = await supabase
       .from('booking_profiles')
       .select(`
          *,
          booking_property_members (
             property:booking_properties (id, name, color)
          )
       `)
       .eq('is_active', true)
       .order('display_name');
     allProfiles = (profilesData as BookingProfile[]) || [];
  }

  // B. Propiedades
  const properties = await getBookingProperties();
  
  // C. Selección de Propiedad (Slug)
  const propSlug = typeof params.prop === 'string' ? params.prop : properties[0]?.slug;
  let selectedProperty = properties.find(p => p.slug === propSlug);
  if (!selectedProperty && properties.length > 0) selectedProperty = properties[0];

  // D. Fecha
  const dateParam = typeof params.date === 'string' ? params.date : null;
  let currentDate = new Date();
  if (dateParam) {
    const parsed = parse(dateParam, 'yyyy-MM', new Date());
    if (isValid(parsed)) currentDate = parsed;
  }

  // E. Datos de la Propiedad Seleccionada
  const events = selectedProperty 
    ? await getMonthEvents(selectedProperty.id, currentDate) 
    : [];

  const handovers = selectedProperty
    ? await getActiveHandovers(selectedProperty.id)
    : [];
  
  // F. Miembros y Permiso Local (Nivel 3)
  let propertyMembers: BookingMember[] = [];
  let isPropertyOwner = false;

  if (selectedProperty) {
    const rawMembers = await getPropertyMembers(selectedProperty.id);
    propertyMembers = rawMembers as BookingMember[];

    // Comprobamos si soy Owner de ESTA propiedad específica
    if (user) {
        const myMemberRecord = propertyMembers.find(m => 
            m.profile?.user_id === user.id && m.role === 'owner'
        );
        isPropertyOwner = !!myMemberRecord;
    }
  }

  // G. Festivos
  const { data: holidaysData } = await supabase.from('booking_holidays').select('*');
  const holidays = holidaysData || [];
  
  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24">
        <ImpersonationProvider realUserId={user.id} profiles={allProfiles}>
            <UnifiedAppHeader
                title="Reservas Familiares"
                backHref="/"
                userEmail={user.email || ''}
                userRole={isSuperAdmin ? 'admin' : 'user'}
                maxWClass="max-w-7xl"
                moduleMenu={
                  <Suspense fallback={<div className="w-8 h-8" />}>
                    <BookingMenu 
                            isSuperAdmin={isSuperAdmin}
                            isModuleAdmin={isModuleAdmin}
                            isPropertyOwner={isPropertyOwner}
                            isDebugActive={showImpersonationBar} 
                            currentProperty={selectedProperty!} 
                        />
                  </Suspense>
                }
            />
            <Suspense fallback={null}>
                <BookingDialogManager 
                    isModuleAdmin={isModuleAdmin}
                    currentProperty={selectedProperty!}
                    members={propertyMembers}
                    allProfiles={allProfiles}
                    properties={properties} // <--- Pasamos properties para el redirect fallback
                    currentUserId={user.id}
                    holidays={holidays}
                />
            </Suspense>
            {showImpersonationBar && <ImpersonationBar />}
            {properties.length===0 ? (
              <div className="p-10 text-center">
                <h2>No hay propiedades creadas</h2>
                {/* Aquí podrías poner el botón de crear si eres admin */}
              </div>
            ):(
              <main className="max-w-7xl mx-auto p-4 md:p-6 mt-6">
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
            </main>
          )}
        </ImpersonationProvider>
    </div>
  );
}