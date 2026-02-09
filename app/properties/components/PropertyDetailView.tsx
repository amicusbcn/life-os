'use client';

import { useState } from 'react';
import { UnifiedAppSidebar } from '@/components/layout/UnifiedAppSidebar';
import { PropertiesMenu } from './PropertiesMenu'; // El archivo de arriba
import { PropertyDashboard } from './PropertyDashboard';
import { ContactsManager } from './ContactsManager';
import { Property, ZoneWithRooms, PropertyContact, PropertyAlert } from '@/types/properties';

interface Props {
  property: Property;
  zones: ZoneWithRooms[];
  contacts: PropertyContact[];
  alerts: PropertyAlert[];
  allProperties: any[];
  profile: any;
  accessibleModules: any[];
}

export function PropertyDetailView({ 
    property, contacts, alerts, allProperties, 
    profile, accessibleModules 
}: Props) {
    
    // 1. EL ESTADO DEBE VIVIR AQUÍ
    const [view, setView] = useState<'dashboard' | 'contacts'>('dashboard');

    const activeAlerts = alerts.filter(a => !a.end_date || new Date(a.end_date) > new Date());

    return (
        <UnifiedAppSidebar
            title={property.name}
            profile={profile}
            modules={accessibleModules}
            backLink={["/properties", "Volver al listado"]}
            
            // 2. PASAMOS LA FUNCIÓN 'setView' AL MENÚ
            moduleMenu={
                <PropertiesMenu 
                    mode='operative'
                    properties={allProperties}
                    currentView={view}      // "Estoy en dashboard"
                    onViewChange={setView}  // "Cuando cliquen, cambia a..."
                />
            }
            moduleSettings={
                <PropertiesMenu mode="settings" properties={allProperties} />
            }
        >
            {/* 3. RENDERIZADO CONDICIONAL SEGÚN EL ESTADO */}
            <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
                 <div className="animate-in fade-in duration-300">
                    {view === 'dashboard' ? (
                        <PropertyDashboard alerts={activeAlerts} />
                    ) : (
                        <ContactsManager contacts={contacts} />
                    )}
                 </div>
            </div>

        </UnifiedAppSidebar>
    );
}