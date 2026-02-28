// app/maintenance/calendar/components/CalendarView.tsx
'use client';

import { UnifiedAppSidebar } from "@/components/layout/UnifiedAppSidebar"; 
import { ActivityDetail } from "./ActivityCalendarDatail";
import { CalendarEvent } from "@/types/calendar";
import { MaintenanceMenu } from "./MaintenanceMenu";
import { Calendar } from "@/components/layout/Calendar";

interface CalendarViewProps {
    events: CalendarEvent[];
    profile: any;
    accessibleModules: any[];
    isAdmin: boolean;
}

export function CalendarView({ events, profile, accessibleModules, isAdmin }: CalendarViewProps) {
    return (
        <div className="flex h-screen bg-slate-50">
            {/* Sidebar con el contexto de módulos del usuario */}
            
                    <UnifiedAppSidebar
                        title={history? "Histórico de Mantenimiento" : "Tareas de Mantenimiento"}
                        profile={profile}
                        modules={accessibleModules}
                        moduleMenu={
                            <MaintenanceMenu 
                                userRole={profile?.role}
                                mode='operative'
                                view="calendar"
                                isPropertyContext={false}
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
                          events={events} 
                          renderDetail={(event) => (
                              <ActivityDetail 
                                  payload={event.payload} 
                                  currentUser={profile} 
                              />
                          )} 
                      />
                  </div>
              </main>
            </UnifiedAppSidebar>
        </div>
    );
}