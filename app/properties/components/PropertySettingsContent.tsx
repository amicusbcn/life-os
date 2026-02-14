'use client';

import { useProperty } from '../context/PropertyContext'; // <--- IMPORTAR CONTEXTO

// Componentes Hijos
import { PropertyForm } from './PropertyForm';
import { LocationManager } from './LocationManager';
import { MembersManager } from './MembersManager';
import { DashboardAlerts } from './DashboardAlerts';
import { PropertyModulesSettings } from './PropertyModulesSettings'; // <--- YA EXISTE
import { PropertyAlert, PropertyLocation } from '@/types/properties';
import { DocumentsManager } from './DocumentsManager';

interface Props {
    section: string;
    zones: PropertyLocation[];
    alerts: PropertyAlert[];
}

export function PropertySettingsContent({ section, zones, alerts }: Props) {
    
    // Obtenemos la propiedad del contexto para sacar su ID
    const { property } = useProperty(); 

    // Títulos dinámicos
    const headerInfo: Record<string, { title: string, desc: string }> = {
        general: { title: "Información General", desc: "Datos básicos y foto de la propiedad." },
        structure: { title: "Estructura y Zonas", desc: "Configura plantas y habitaciones." },
        members: { title: "Equipo y Accesos", desc: "Gestiona quién puede ver o editar esta casa." },
        modules: { title: "Módulos", desc: "Activa o desactiva funcionalidades." },
        alerts: { title: "Tablón de Avisos", desc: "Gestiona las alertas visibles en el Dashboard." },
    };

    const info = headerInfo[section] || { title: "Configuración", desc: "" };

    return (
        <div className="animate-in fade-in duration-300 space-y-6">
            
            <div className="border-b pb-4 mb-6">
                <h1 className="text-2xl font-bold text-slate-900">{info.title}</h1>
                <p className="text-slate-500">{info.desc}</p>
            </div>

            {section === 'general' && <PropertyForm />}
            
            {/* AQUÍ ESTABA EL ERROR: LE PASAMOS propertyId */}
            {section === 'structure' && (
                <LocationManager propertyId={property.id} zones={zones} />
            )}
            
            {section === 'members' && <MembersManager />}
            
            {section === 'alerts' && <DashboardAlerts alerts={alerts} isReadOnly={false} />}
            
            {section === 'modules' && <PropertyModulesSettings />}
            
        </div>
    );
}