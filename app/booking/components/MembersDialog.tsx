'use client';

import { useState, useEffect } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from '@/components/ui/dialog';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Users, Shield, ShieldAlert } from 'lucide-react';
import {  updateMemberConfig } from '../actions';
import { getPropertyMembers } from '../data';
import { BookingProperty } from '@/types/booking';
import { cn } from '@/lib/utils';

interface MembersDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  property: BookingProperty;
}

export default function MembersDialog({ isOpen, onOpenChange, property }: MembersDialogProps) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Cargar datos al abrir
  useEffect(() => {
    if (isOpen && property) {
      setLoading(true);
      getPropertyMembers(property.id)
        .then(data => setMembers(data))
        .finally(() => setLoading(false));
    }
  }, [isOpen, property]);

  // Manejar cambios en tiempo real (Optimistic UI simple)
  const handleUpdate = async (memberId: string, field: 'role' | 'turn_order', value: any) => {
    // 1. Actualización visual inmediata
    setMembers(prev => prev.map(m => 
        m.id === memberId ? { ...m, [field]: value } : m
    ));

    // 2. Persistencia en servidor
    // Buscamos el miembro actual para enviar el objeto completo (role + turn_order)
    const currentMember = members.find(m => m.id === memberId);
    if (!currentMember) return;

    const payload = {
        role: field === 'role' ? value : currentMember.role,
        turn_order: field === 'turn_order' ? (value === 'none' ? null : parseInt(value)) : currentMember.turn_order
    };

    await updateMemberConfig(memberId, {
        role: payload.role,
        turn_order: payload.turn_order
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gestión de Usuarios: {property.name}
          </DialogTitle>
          <DialogDescription>
            Configura roles y el orden automático de la "Rueda de Turnos".
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-1">
            {/* CABECERA TABLA */}
            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-semibold text-slate-500 uppercase">
                <div className="col-span-5">Usuario</div>
                <div className="col-span-3 text-center">Rol</div>
                <div className="col-span-4 text-center">Orden Rueda (1-5)</div>
            </div>

            {/* LISTA DE MIEMBROS */}
            <div className="space-y-2">
                {loading ? (
                    <div className="p-8 text-center text-slate-400">Cargando usuarios...</div>
                ) : (
                    members.map((member) => (
                        <div key={member.id} className="grid grid-cols-12 gap-4 items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                            
                            {/* 1. INFO USUARIO */}
                            <div className="col-span-5 flex items-center gap-3">
                                <div 
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm shrink-0"
                                    style={{ backgroundColor: member.profile?.color || '#ccc' }}
                                >
                                    {member.profile?.initials}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">{member.profile?.display_name}</p>
                                    <p className="text-[10px] text-slate-400 truncate">{member.profile?.secondary_email}</p>
                                </div>
                            </div>

                            {/* 2. SELECTOR ROL */}
                            <div className="col-span-3 flex justify-center">
                                <Select 
                                    value={member.role} 
                                    onValueChange={(val) => handleUpdate(member.id, 'role', val)}
                                >
                                    <SelectTrigger className={cn("h-7 text-xs w-[100px]", member.role === 'admin' ? "border-amber-200 bg-amber-50 text-amber-700" : "")}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="member">Miembro</SelectItem>
                                        <SelectItem value="admin">
                                            <span className="flex items-center gap-2">
                                                <Shield className="w-3 h-3" /> Admin
                                            </span>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* 3. SELECTOR ORDEN DE TURNO */}
                            <div className="col-span-4 flex justify-center">
                                <Select 
                                    value={member.turn_order?.toString() || 'none'} 
                                    onValueChange={(val) => handleUpdate(member.id, 'turn_order', val)}
                                >
                                    <SelectTrigger className={cn(
                                        "h-7 text-xs w-[120px]",
                                        member.turn_order ? "font-bold border-indigo-200 bg-indigo-50 text-indigo-700" : "text-slate-400"
                                    )}>
                                        <SelectValue placeholder="Sin turno" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none" className="text-slate-400 italic">-- Fuera de rueda --</SelectItem>
                                        {[1, 2, 3, 4, 5].map(num => (
                                            <SelectItem key={num} value={num.toString()}>
                                                <span className="font-medium">Semana {num}</span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                        </div>
                    ))
                )}
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}