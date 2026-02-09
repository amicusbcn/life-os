'use client';

import { useState } from 'react';
import { useProperty } from '../context/PropertyContext';
import { PropertyContact } from '@/types/properties';
import { addContact, deleteContact } from '../actions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { Switch } from "@/components/ui/switch";
import { 
    Phone, Mail, Wrench, Siren, 
    MoreHorizontal, ShieldCheck, Trash2, Plus, User 
} from 'lucide-react';
// CAMBIO IMPORTANTE: Usamos Sheet en vez de Dialog
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { toast } from 'sonner'; 

interface Props {
  contacts: PropertyContact[];
}

export function ContactsManager({ contacts }: Props) {
  const { can, property } = useProperty();
  const isBoss = can('manage_contacts'); 

  const [isOpen, setIsOpen] = useState(false);
  const [isProtected, setIsProtected] = useState(false);

  const handleCreate = async (formData: FormData) => {
    formData.append('property_id', property.id);
    if (isBoss && isProtected) {
        formData.append('is_protected', 'on');
    }
    
    try {
        await addContact(formData);
        setIsOpen(false);
        setIsProtected(false);
        toast.success("Contacto añadido");
    } catch (e) {
        toast.error("Error al crear contacto");
    }
  };

  const handleDelete = async (contact: PropertyContact) => {
    if (!contact.is_protected || isBoss) {
        if(confirm(`¿Borrar a ${contact.name}?`)) {
             await deleteContact(contact.id, property.id);
             toast.success("Contacto eliminado");
        }
    } else {
        alert("Este contacto está protegido.");
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch(cat) {
        case 'emergency': return <Siren className="w-4 h-4 text-red-500"/>;
        case 'maintenance': return <Wrench className="w-4 h-4 text-orange-500"/>;
        case 'services': return <User className="w-4 h-4 text-blue-500"/>;
        default: return <MoreHorizontal className="w-4 h-4 text-slate-500"/>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* CABECERA */}
      <div className="flex justify-between items-center">
        <div>
            <h3 className="text-lg font-medium">Agenda Compartida</h3>
            <p className="text-sm text-slate-500">Teléfonos útiles para toda la familia.</p>
        </div>

        {/* CAMBIO: SHEET EN LUGAR DE DIALOG */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2"/> Nuevo</Button>
            </SheetTrigger>
            
            {/* Contenido lateral derecho */}
            <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>Nuevo Contacto</SheetTitle>
                    <SheetDescription>
                        Añade un profesional o servicio a la agenda de la casa.
                    </SheetDescription>
                </SheetHeader>

                <form action={handleCreate} className="space-y-6 mt-6">
                    <div className="space-y-4 px-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Nombre</Label>
                                <Input name="name" placeholder="Ej: Juan Electricista" required />
                            </div>
                            <div className="space-y-2">
                                <Label>Rol</Label>
                                <Input name="role" placeholder="Ej: Fontanero" required />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Teléfono</Label>
                                <Input name="phone" placeholder="600..." />
                            </div>
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input name="email" placeholder="@..." />
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                             <Label>Categoría</Label>
                             <Select name="category" defaultValue="maintenance">
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="emergency">Emergencia</SelectItem>
                                    <SelectItem value="maintenance">Mantenimiento</SelectItem>
                                    <SelectItem value="services">Servicios</SelectItem>
                                    <SelectItem value="other">Otro</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* SWITCH PROTECCIÓN (Solo Jefes) */}
                        {isBoss && (
                            <div className="flex items-center space-x-2 bg-yellow-50 p-4 rounded-md border border-yellow-200">
                                <Switch id="prot-mode" checked={isProtected} onCheckedChange={setIsProtected} />
                                <div className="grid gap-1.5 leading-none">
                                    <Label htmlFor="prot-mode" className="flex items-center gap-1 font-semibold text-yellow-800 cursor-pointer">
                                        <ShieldCheck className="w-3 h-3"/> Proteger Contacto
                                    </Label>
                                    <p className="text-[11px] text-yellow-700">
                                        Si activas esto, solo los Administradores podrán editar o borrar este contacto.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Notas</Label>
                            <Textarea name="notes" placeholder="Horario, dirección, número de póliza..." rows={4} />
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 px-4">
                        <Button type="submit" className="w-full sm:w-auto">Guardar Contacto</Button>
                    </div>
                </form>
            </SheetContent>
        </Sheet>
      </div>

      {/* LISTA (Sin cambios) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contacts.map(contact => (
            <Card key={contact.id} className={`relative group transition-all hover:shadow-md ${contact.is_protected ? 'border-yellow-200 bg-yellow-50/20' : ''}`}>
                <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex gap-3 items-center">
                            <div className="p-2 bg-slate-100 rounded-full">
                                {getCategoryIcon(contact.category)}
                            </div>
                            <div>
                                <h4 className="font-semibold text-slate-900 flex items-center gap-1">
                                    {contact.name}
                                    {contact.is_protected && (
                                        <span title="Protegido">
                                            <ShieldCheck className="w-3 h-3 text-yellow-500" />
                                        </span>
                                    )}
                                </h4>
                                <p className="text-xs text-slate-500 uppercase">{contact.role}</p>
                            </div>
                        </div>
                        
                        {(!contact.is_protected || isBoss) && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500 hover:bg-red-50" onClick={() => handleDelete(contact)}>
                                <Trash2 className="w-4 h-4"/>
                            </Button>
                        )}
                    </div>
                    
                    <div className="space-y-1.5 mt-4 text-sm text-slate-600">
                        {contact.phone && (
                            <div className="flex items-center gap-2 group/link">
                                <Phone className="w-3.5 h-3.5 text-slate-400 group-hover/link:text-blue-500"/>
                                <a href={`tel:${contact.phone}`} className="hover:underline decoration-blue-500/30 underline-offset-2 transition-colors">{contact.phone}</a>
                            </div>
                        )}
                        {contact.email && (
                            <div className="flex items-center gap-2 group/link">
                                <Mail className="w-3.5 h-3.5 text-slate-400 group-hover/link:text-blue-500"/>
                                <a href={`mailto:${contact.email}`} className="truncate hover:underline decoration-blue-500/30 underline-offset-2 transition-colors">{contact.email}</a>
                            </div>
                        )}
                        {contact.notes && (
                            <div className="mt-3 text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-100">
                                {contact.notes}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        ))}
        {contacts.length === 0 && (
             <div className="col-span-full flex flex-col items-center justify-center py-12 text-slate-400 border-2 border-dashed rounded-xl bg-slate-50/50">
                <User className="w-10 h-10 mb-2 opacity-20" />
                <p>No hay contactos guardados.</p>
                <p className="text-sm">Añade el primero con el botón "Nuevo".</p>
            </div>
        )}
      </div>
    </div>
  );
}