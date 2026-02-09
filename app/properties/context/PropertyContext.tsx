'use client';

import React, { createContext, useContext, useState, useMemo } from 'react';
import { Property, PropertyMember } from '@/types/properties';

interface PropertyContextType {
  property: Property;
  members: PropertyMember[];
  
  currentUser: PropertyMember | undefined; // Quien soy realmente
  emulatedUser: PropertyMember | undefined; // A quien estoy emulando
  activeUser: PropertyMember | undefined;   // El que cuenta para la UI (Real o Emulado)
  
  setEmulatedUserId: (id: string | null) => void;
  
  // Sistema de Permisos
  can: (action: 'edit_house' | 'manage_members' | 'edit_structure' | 'view_finance'| 'manage_modules'| 'manage_contacts') => boolean;
}

export const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export function PropertyProvider({ 
  children, 
  property, 
  members, 
  currentUserId 
}: { 
  children: React.ReactNode, 
  property: Property, 
  members: PropertyMember[], 
  currentUserId: string 
}) {
  const [emulatedId, setEmulatedUserId] = useState<string | null>(null);

  // 1. Identificar usuarios
  const realUser = members.find(m => m.user_id === currentUserId);
  const emulatedUser = emulatedId ? members.find(m => m.id === emulatedId) : undefined;
  
  // 2. ¿Quién está "activo"? (Si hay emulación, gana el emulado)
  const activeUser = emulatedUser || realUser;

  // 3. Lógica central de permisos (Aquí defines las reglas del juego)
  const can = (action: string) => {
    if (!activeUser) return false;
    const role = activeUser.role;

    switch (action) {
        // ACCIONES DE ALTO RIESGO (Solo Dueño)
        case 'delete_property':
        case 'transfer_ownership':
             return role === 'owner';

        // GESTIÓN DE EQUIPO (Dueño y Admin)
        case 'manage_members': 
             return role === 'owner' || role === 'admin';

        // GESTIÓN OPERATIVA (Dueño y Admin)
        // Editar nombre, dirección, crear habitaciones, borrar zonas...
        case 'edit_house':
        case 'edit_structure':
        case 'manage_contacts':
        case 'manage_documents':
            return role === 'owner' || role === 'admin';
            
        // VISIBILIDAD FINANCIERA (Todos menos invitados)
        case 'view_finance':
            return role !== 'guest';
            
        case 'manage_modules':
        return role === 'owner' || role === 'admin';

        default:
            return false;
    }
  };

  const value = {
    property,
    members,
    currentUser: realUser,
    emulatedUser,
    activeUser,
    setEmulatedUserId,
    can
  };

  return <PropertyContext.Provider value={value}>{children}</PropertyContext.Provider>;
}

export const useProperty = () => {
  const context = useContext(PropertyContext);
  if (!context) throw new Error("useProperty must be used within PropertyProvider");
  return context;
};