'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { BellRing, Megaphone, Plus } from 'lucide-react';
import { createPropertyAlert } from '../actions';
import { toast } from 'sonner';

interface Props {
  propertyId: string;
  trigger?: React.ReactNode; // Para poder personalizar el botón que lo abre
}

export function AlertSheet({ propertyId, trigger }: Props) {
  const [open, setOpen] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    formData.append('property_id', propertyId);
    try {
        await createPropertyAlert(formData);
        setOpen(false);
        toast.success("Aviso publicado correctamente");
    } catch (e) {
        toast.error("Error al publicar el aviso");
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || (
            <Button className="w-full justify-start" variant="ghost">
                <Megaphone className="w-4 h-4 mr-2" /> Crear Aviso
            </Button>
        )}
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Publicar Nuevo Aviso</SheetTitle>
          <SheetDescription>
            Este mensaje aparecerá destacado en el Dashboard de la propiedad.
          </SheetDescription>
        </SheetHeader>

        <form action={handleSubmit} className="space-y-6 mt-6">
            <div className="space-y-2">
                <Label>Título del aviso</Label>
                <Input name="title" placeholder="Ej: Piscina cerrada" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select name="type" defaultValue="info">
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="info">Info (Azul)</SelectItem>
                            <SelectItem value="warning">Aviso (Amarillo)</SelectItem>
                            <SelectItem value="critical">Urgente (Rojo)</SelectItem>
                            <SelectItem value="success">Positivo (Verde)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                {/* FECHAS SIMPLIFICADAS (Input nativo HTML date es suficiente por ahora) */}
                <div className="space-y-2">
                    <Label>Mostrar hasta</Label>
                    <Input type="date" name="end_date" />
                </div>
            </div>

            <div className="space-y-2">
                <Label>Mensaje detallado</Label>
                <Textarea name="message" placeholder="Explica los detalles..." rows={4} />
            </div>

            <div className="flex items-center space-x-2 bg-slate-50 p-3 rounded border">
                <Checkbox id="notify" name="notify_everyone" />
                <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="notify" className="flex items-center gap-2 cursor-pointer">
                        <BellRing className="w-3.5 h-3.5"/> Notificar a todos
                    </Label>
                    <p className="text-xs text-muted-foreground">
                        Enviar push/email a los miembros.
                    </p>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <Button type="submit">Publicar Aviso</Button>
            </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}