'use client';

import { useState } from 'react';
import { useProperty } from '../context/PropertyContext';
import { addMember, removeMember } from '../actions'; // Importa tus actions
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from '@/components/ui/badge';
import { User, Ghost, Trash2, Plus, Shield, ShieldCheck, ShieldAlert } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { updateMemberCapability } from '../actions';
export function MembersManager() {
  const { members, property, can, currentUser } = useProperty();
  
  // Estado local para el formulario
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('guest');
  const [isSubmitting, setIsSubmitting] = useState(false);
    
  // --- HANDLERS ---
  const handleAddMember = async () => {
    if (!newName) return;
    setIsSubmitting(true);
    
    const formData = new FormData();
    formData.append('property_id', property.id);
    formData.append('name', newName);
    formData.append('email', newEmail); // Si está vacío se envía string vacío
    formData.append('role', newRole);

    try {
        await addMember(formData);
        // Limpiar form
        setNewName('');
        setNewEmail('');
        setNewRole('guest');
    } catch (error) {
        console.error(error);
        alert("Error al añadir miembro");
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (confirm("¿Seguro que quieres eliminar a este miembro?")) {
        await removeMember(memberId, property.id);
    }
  };
  const MODULE_NAMES: Record<string, string> = {
        inventory: "Inventario",
        finance: "Finanzas",
        bookings: "Reservas",
        maintenance: "Mantenimiento"
    };
  const handleUpdateCapability = async (memberId: string, moduleKey: string, level: string) => {
        try {
            // Llamada directa a la acción. 
            // La lógica de "merge" o "delete" la hace el SQL.
            await updateMemberCapability(memberId, moduleKey, level);
            
            // Aquí podrías añadir un toast.success si usas sonner
        } catch (error) {
            console.error("Error en el componente:", error);
            // toast.error("Error al guardar los cambios");
        }
    };

    const getCapabilityBadge = (level: string) => {
        const styles: Record<string, string> = {
            admin: "bg-emerald-100 text-emerald-700 border-emerald-200",
            editor: "bg-amber-100 text-amber-700 border-amber-200",
            viewer: "bg-sky-100 text-sky-700 border-sky-200",
            blocked: "bg-rose-100 text-rose-700 border-rose-200 font-bold",
        };

    return styles[level] || "bg-slate-100 text-slate-500 border-slate-200";
    };

  // Icono según Rol
  const getRoleBadge = (role: string) => {
    switch(role) {
        case 'owner': return <Badge className="bg-yellow-500 hover:bg-yellow-600 gap-1"><ShieldAlert className="w-3 h-3"/> Propietario</Badge>;
        case 'admin': return <Badge className="bg-blue-500 hover:bg-blue-600 gap-1"><ShieldCheck className="w-3 h-3"/> Admin</Badge>;
        case 'member': return <Badge variant="secondary" className="gap-1"><User className="w-3 h-3"/> Usuario</Badge>;
        default: return <Badge variant="outline" className="text-slate-500 gap-1">Invitado</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. FORMULARIO DE INVITACIÓN (Solo si tienes permiso) */}
      {can('manage_members') && (
          <Card className="bg-slate-50 border-dashed border-2">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg">Añadir Persona</CardTitle>
                <CardDescription>
                    Crea un usuario fantasma (sin email) o invita a alguien real.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col md:flex-row gap-3 items-end">
                    <div className="space-y-1 flex-1 w-full">
                        <label className="text-xs font-medium text-slate-500">Nombre (Apodo)</label>
                        <Input 
                            placeholder="Ej: Abuela, Invitado..." 
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                        />
                    </div>
                    
                    <div className="space-y-1 flex-1 w-full">
                        <label className="text-xs font-medium text-slate-500">Email (Opcional)</label>
                        <Input 
                            placeholder="usuario@email.com" 
                            type="email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                        />
                    </div>

                    <div className="space-y-1 w-full md:w-[140px]">
                        <label className="text-xs font-medium text-slate-500">Rol</label>
                        <Select value={newRole} onValueChange={setNewRole}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="member">Miembro</SelectItem>
                                <SelectItem value="guest">Invitado</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Button onClick={handleAddMember} disabled={!newName || isSubmitting}>
                        <Plus className="w-4 h-4 mr-2"/> Añadir
                    </Button>
                </div>
            </CardContent>
          </Card>
      )}

      {/* 2. LISTADO DE MIEMBROS */}
      <div className="grid gap-4">
        {members.map((member) => (
            <div key={member.id} className="flex flex-col p-4 bg-white border rounded-lg shadow-sm gap-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Avatar>...</Avatar>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-semibold">{member.name}</span>
                                {getRoleBadge(member.role)}
                            </div>
                            <div className="text-sm text-slate-500">{member.email}</div>
                        </div>
                    </div>

                    {/* BOTONES DE ACCIÓN */}
                    <div className="flex items-center gap-2">
                        {/* 🛡️ NUEVO: GESTOR DE CAPABILITIES */}
                        {can('manage_members') && (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" className="gap-2">
                                        <Shield className="w-4 h-4" /> Módulos
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 p-4">
                                    <div className="space-y-4">
                                        <h4 className="font-medium text-sm border-b pb-2">Permisos por Módulo</h4>
                                        
                                        {Object.entries(property.active_modules || {})
                                            .filter(([_, isActive]) => isActive) // Solo mostramos los que están a 'true'
                                            .map(([moduleKey, _]) => (
                                                <div key={moduleKey} className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase">
                                                    {MODULE_NAMES[moduleKey] || moduleKey}
                                                </label>
                                                <Select 
                                                    defaultValue={member.capabilities?.[moduleKey] || 'none'}
                                                    onValueChange={(val) => handleUpdateCapability(member.id, moduleKey, val)}
                                                >
                                                    <SelectTrigger className="h-8 text-xs">
                                                    <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                    <SelectItem value="none">Heredado (Gris)</SelectItem>
                                                    <SelectItem value="admin">Admin (Verde)</SelectItem>
                                                    <SelectItem value="editor">Editor (Amarillo)</SelectItem>
                                                    <SelectItem value="viewer">Lector (Azul)</SelectItem>
                                                    <SelectItem value="blocked">Bloqueado (Rojo)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                </div>
                                            ))}

                                            {/* Si no hay módulos activos, mostramos un aviso */}
                                            {Object.values(property.active_modules || {}).every(v => !v) && (
                                            <p className="text-xs text-slate-400 italic">No hay módulos activos en esta propiedad.</p>
                                            )}
                                    </div>
                                </PopoverContent>
                            </Popover>
                        )}
                        
                        {/* Botón Borrar (El que ya tenías) */}
                        {can('manage_members') && member.id !== currentUser?.id && (
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveMember(member.id)}>
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                </div>
                
                {/* 📝 BADGES DE CAPABILITIES (Para verlo de un vistazo sin abrir el popover) */}
                {member.capabilities && Object.keys(member.capabilities).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t">
                        {Object.entries(member.capabilities as Record<string, string>).map(([mod, level]) => (
                            <Badge key={mod} variant="secondary" className={getCapabilityBadge(level)}>
                                {mod}: {level}
                            </Badge>
                        ))}
                    </div>
                )}
            </div>
        ))}
      </div>
    </div>
  );
}