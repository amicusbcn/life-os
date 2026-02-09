'use client';

import { useState } from 'react';
import { useProperty } from '../context/PropertyContext'; // <--- IMPORTANTE
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateProperty, createProperty } from '../actions'; // Tus server actions
import { toast } from "sonner";
import { Loader2 } from 'lucide-react';

interface Props {
    onSuccess?: () => void; // Para cerrar el Sheet si es creación
}

export function PropertyForm({ onSuccess }: Props) {
    // 1. Intentamos leer el contexto.
    // Si estamos creando una casa nueva desde el menú lateral, puede que no haya contexto (será undefined).
    // Si estamos editando en Settings, SÍ habrá contexto.
    const context = tryUseProperty(); 
    const property = context?.property;

    const [loading, setLoading] = useState(false);

    // Si hay propiedad, estamos EDITANDO. Si no, estamos CREANDO.
    const isEditing = !!property;

    const handleSubmit = async (formData: FormData) => {
        setLoading(true);
        try {
            if (isEditing) {
                // MODO EDICIÓN
                await updateProperty(property.id, formData);
                toast.success("Propiedad actualizada");
            } else {
                // MODO CREACIÓN
                await createProperty(formData);
                toast.success("Propiedad creada correctamente");
                if (onSuccess) onSuccess();
            }
        } catch (error) {
            toast.error("Ha ocurrido un error al guardar");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form action={handleSubmit} className="space-y-6">
            
            {/* NOMBRE DE LA PROPIEDAD */}
            <div className="space-y-2">
                <Label htmlFor="name">Nombre de la Casa</Label>
                <Input 
                    id="name" 
                    name="name" 
                    placeholder="Ej: Apartamento Playa" 
                    required 
                    defaultValue={property?.name || ''} // <--- AQUÍ CARGAMOS EL VALOR
                />
            </div>

            {/* DIRECCIÓN */}
            <div className="space-y-2">
                <Label htmlFor="address">Dirección completa</Label>
                <Input 
                    id="address" 
                    name="address" 
                    placeholder="Calle Falsa 123..." 
                    defaultValue={property?.address || ''} 
                />
            </div>

            {/* SLUG (URL) - Opcional, o solo lectura si prefieres */}
            {isEditing && (
                <div className="space-y-2">
                    <Label htmlFor="slug" className="text-slate-500">Identificador URL (Slug)</Label>
                    <Input 
                        id="slug" 
                        name="slug" 
                        defaultValue={property?.slug || ''} 
                        disabled // Normalmente el slug no se cambia alegremente
                        className="bg-slate-100 text-slate-500"
                    />
                    <p className="text-[11px] text-slate-400">
                        Usado en la dirección web. Para cambiarlo, contacta soporte.
                    </p>
                </div>
            )}

            {/* NOTAS / DESCRIPCIÓN */}
            <div className="space-y-2">
                <Label htmlFor="description">Notas internas</Label>
                <Textarea 
                    id="description" 
                    name="description" 
                    placeholder="Notas sobre llaves, wifi, alarmas..." 
                    rows={4}
                    defaultValue={property?.description || ''} // <--- OTRO VALOR
                />
            </div>

            {/* BOTÓN DE GUARDAR */}
            <div className="pt-2">
                <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEditing ? 'Guardar Cambios' : 'Registrar Propiedad'}
                </Button>
            </div>
        </form>
    );
}

// Helper para usar el contexto sin que explote si no existe (para el modo creación fuera de contexto)
function tryUseProperty() {
    try {
        return useProperty();
    } catch {
        return null;
    }
}