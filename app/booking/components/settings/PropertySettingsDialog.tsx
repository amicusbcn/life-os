'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Users } from 'lucide-react';

// Sub-components
import { GeneralTab } from './GeneralTab';
import { MembersTab } from './MembersTab';
import { BookingMember, BookingProfile } from '@/types/booking'; // Asegúrate de tener este tipo definido

interface PropertySettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  property: { id: string; name: string; max_slots: number };
  members: BookingMember[];
  allProfiles: BookingProfile[];
  currentUserId: string; // Para saber quién soy yo (y no borrarme a mí mismo)
}

export function PropertySettingsDialog({ isOpen, onClose, property, members, allProfiles, currentUserId }: PropertySettingsDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b bg-slate-50/50">
          <DialogTitle>Configuración de Propiedad</DialogTitle>
          <DialogDescription>Gestiona los detalles y el equipo de {property.name}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 pt-2 border-b">
            <TabsList>
              <TabsTrigger value="general" className="flex gap-2"><Settings size={14}/> General</TabsTrigger>
              <TabsTrigger value="members" className="flex gap-2"><Users size={14}/> Miembros y Permisos</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-50/30">
            <TabsContent value="general" className="p-6 m-0 h-full">
              <GeneralTab property={property} />
            </TabsContent>
            
            <TabsContent value="members" className="p-0 m-0 h-full">
              <MembersTab propertyId={property.id} allProfiles={allProfiles} members={members} currentUserId={currentUserId} />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}