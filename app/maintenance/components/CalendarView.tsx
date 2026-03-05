// app/maintenance/calendar/components/CalendarView.tsx
'use client';

import { UnifiedAppSidebar } from "@/components/layout/UnifiedAppSidebar"; 
import { ActivityDetail } from "./ActivityCalendarDatail";
import { CalendarEvent, Holiday } from "@/types/calendar";
import { MaintenanceMenu } from "./MaintenanceMenu";
import { Calendar } from "@/components/layout/Calendar";
import { PropertyBase } from "@/types/properties";
import { useMemo } from "react";

interface CalendarViewProps {
    events: CalendarEvent[];
    profile: any;
    accessibleModules: any[];
    isAdmin: boolean;
    month: number;
    year: number;
    holidays: Holiday[]; 
    currentProperty?:PropertyBase;
    initialEventId?:string;
}

export function CalendarView({ events, profile, accessibleModules, isAdmin, month, year,holidays,currentProperty,initialEventId }: CalendarViewProps) {
    const isPropertyContext=!!currentProperty;
    const encodedBackPath = useMemo(() => {
        if (typeof window === 'undefined') return '';

        // 1. Creamos un objeto URL con la dirección actual
        const url = new URL(window.location.href);

        // 2. ELIMINAMOS los parámetros que no queremos que se repitan en el "bucle"
        url.searchParams.delete('taskId');
        url.searchParams.delete('eventId');
        // Si tienes otros filtros (como mode), puedes dejarlos o quitarlos según prefieras

        // 3. Devolvemos solo el pathname + los parámetros limpios
        return encodeURIComponent(url.pathname + url.search);
    }, [month, year]); // Solo cambia si cambias de mes/año
    return (
        <div className="flex h-screen bg-slate-50">
            {/* Sidebar con el contexto de módulos del usuario */}
            
                    <UnifiedAppSidebar
                        title={isPropertyContext? "Calendario de Mant. "+currentProperty?.name : "Calendario de Mantenimiento"}
                        profile={profile}
                        modules={accessibleModules}
                        backLink={isPropertyContext?["/properties/"+currentProperty?.slug,"Volver a "+currentProperty?.name]:""}
                        moduleMenu={
                            <MaintenanceMenu 
                                userRole={profile?.role}
                                mode='operative'
                                view="calendar"
                                currentProperty={currentProperty}
                            />
                        }
                        moduleSettings={
                            <MaintenanceMenu
                                mode='settings'
                            />
                        }
                    >

              <main className="flex-1 overflow-y-auto">
                  <div className="px-4 lg:px-8 max-w-7xl mx-auto">
                      <Calendar 
                          month={month}
                          year={year}
                          events={events} 
                          holidays={holidays}
                          defaultEventId={initialEventId}
                          renderDetail={(event) => (
                              <ActivityDetail 
                                  payload={event.payload} 
                                  currentUser={profile}
                                  src={encodedBackPath}
                              />
                          )} 
                      />
                  </div>
              </main>
            </UnifiedAppSidebar>
        </div>
    );
}