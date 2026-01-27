'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

// Tipos y Componentes
import { BookingProperty, BookingMember, BookingProfile, BookingHoliday } from '@/types/booking';
import { PropertySettingsDialog } from './settings/PropertySettingsDialog';
import { BookingAdminDialog } from './settings/BookingAdminDialog';
import { ScheduleWizard } from './ScheduleWizard';

interface BookingDialogManagerProps {
  isModuleAdmin: boolean;
  currentProperty?: BookingProperty;
  members: BookingMember[];
  allProfiles: BookingProfile[];
  properties: BookingProperty[]; // Para el Admin Dialog
  currentUserId: string;
  holidays:BookingHoliday[];
}

export function BookingDialogManager({
  isModuleAdmin,
  currentProperty,
  members,
  allProfiles,
  properties,
  currentUserId,
  holidays
}: BookingDialogManagerProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const activeDialog = searchParams.get('dialog'); // 'admin', 'settings', 'wizard' o null

  const propSlug = searchParams.get('prop');
  const activeProperty = currentProperty || properties.find(p => p.slug === propSlug);

  // 1. LEER ESTADO DIRECTAMENTE DE LA URL (Single Source of Truth)
  const [showSettings, setShowSettings] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showWizard, setShowWizard] = useState(false);

  // 2. FUNCIÓN PARA CERRAR (Limpia la URL)
  const closeDialog = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('dialog'); // Borramos la clave 'dialog'
    
    // Mantenemos 'prop' si existe, para no perder el contexto de la casa
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <>
      {/* 1. DIÁLOGO ADMIN GLOBAL */}
      {isModuleAdmin && (
        <BookingAdminDialog 
           isOpen={activeDialog === 'admin'}
           onClose={closeDialog} 
           profiles={allProfiles} 
           properties={properties}
           onManageProperty={(prop) => {
               // REDIRECCIÓN DURA (Full Reload) para asegurar datos frescos
               window.location.href = `/booking?prop=${prop.slug}&settings=true`;
           }}
           holidays={holidays}
        />
      )}

      {/* 2. DIÁLOGO CONFIG PROPIEDAD */}
      {activeProperty && (
        <PropertySettingsDialog 
           isOpen={activeDialog === 'settings'}
            onClose={closeDialog} 
            property={activeProperty}
            members={members} 
            allProfiles={allProfiles} 
            currentUserId={currentUserId}
        />
      )}
      
      {/* 3. WIZARD (Opcional, si también quieres controlarlo por URL o eventos) */}
      {currentProperty && (
          <ScheduleWizard 
            isOpen={activeDialog === 'wizard'}
            onClose={closeDialog} 
            propertyId={currentProperty.id}
            maxSlots={currentProperty.max_slots || 1}
            members={members.map(m => m.profile)} 
          />
      )}
    </>
  );
}