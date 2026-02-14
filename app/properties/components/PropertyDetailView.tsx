'use client';

import { useState } from 'react';
import { UnifiedAppSidebar } from '@/components/layout/UnifiedAppSidebar';
import { PropertiesMenu } from './PropertiesMenu';
import { PropertyDashboard } from './PropertyDashboard';
import { ContactsManager } from './ContactsManager';
import { DocumentsManager } from './DocumentsManager'; // <--- IMPORTAR
import { Property, ZoneWithRooms, PropertyContact, PropertyAlert, PropertyDocument } from '@/types/properties'; // <--- TIPO

interface Props {
  property: Property;
  zones: ZoneWithRooms[];
  contacts: PropertyContact[];
  alerts: PropertyAlert[];
  documents: PropertyDocument[]; // <--- NUEVA PROP
  allProperties: any[];
  profile: any;
  accessibleModules: any[];
}

// Definimos el tipo de vista para que TypeScript nos ayude
export type PropertyViewType = 'dashboard' | 'contacts' | 'documents';

export function PropertyDetailView({ 
    property, contacts, alerts, documents, allProperties, 
    profile, accessibleModules 
}: Props) {
    
    // 1. AÑADIMOS 'documents' AL ESTADO
    const [view, setView] = useState<PropertyViewType>('dashboard');

    const activeAlerts = alerts.filter(a => !a.end_date || new Date(a.end_date) > new Date());

    return (
        <UnifiedAppSidebar
            title={property.name}
            profile={profile}
            modules={accessibleModules}
            backLink={["/properties", "Volver al listado"]}
            
            // 2. PASAMOS LA FUNCIÓN AL MENÚ (Asegúrate de actualizar PropertiesMenu también)
            moduleMenu={
                <PropertiesMenu 
                    mode='operative'
                    properties={allProperties}
                    currentView={view}      
                    onViewChange={setView}  
                />
            }
            moduleSettings={
                <PropertiesMenu mode="settings" properties={allProperties} />
            }
        >
            {/* 3. RENDERIZADO CONDICIONAL */}
            <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
                 <div className="animate-in fade-in duration-300">
                    
                    {view === 'dashboard' && (
                        <PropertyDashboard alerts={activeAlerts} />
                    )}
                    
                    {view === 'contacts' && (
                        <ContactsManager contacts={contacts} />
                    )}

                    {/* NUEVA VISTA */}
                    {view === 'documents' && (
                        <DocumentsManager documents={documents} />
                    )}

                 </div>
            </div>

        </UnifiedAppSidebar>
    );
}