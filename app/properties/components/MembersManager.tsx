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
            <div key={member.id} className="flex items-center justify-between p-4 bg-white border rounded-lg shadow-sm">
                <div className="flex items-center gap-4">
                    {/* Avatar Inteligente: Muestra fantasma si no es usuario real */}
                    <Avatar className="h-10 w-10 border">
                        <AvatarImage src={member.avatar_url || ''} />
                        <AvatarFallback className={member.user_id ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}>
                            {member.user_id ? member.name.substring(0,2).toUpperCase() : <Ghost className="w-5 h-5"/>}
                        </AvatarFallback>
                    </Avatar>
                    
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">{member.name}</span>
                            {getRoleBadge(member.role)}
                        </div>
                        <div className="text-sm text-slate-500 flex items-center gap-2">
                            {member.email || "Usuario Local (Fantasma)"}
                            {/* Indicador visual si soy yo */}
                            {member.user_id === currentUser?.id && (
                                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">Tú</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Botón Borrar: Protegido y no te puedes borrar a ti mismo */}
                {can('manage_members') && member.id !== currentUser?.id && (
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleRemoveMember(member.id)}
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                )}
            </div>
        ))}
      </div>
    </div>
  );
}