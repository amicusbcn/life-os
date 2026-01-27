'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, MapPin, Palette, CalendarClock, Users, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { updatePropertySettings } from '../../actions/settings';
import { cn } from '@/lib/utils';

const COLOR_PALETTE = [
  '#3b82f6', // Azul
  '#ef4444', // Rojo
  '#10b981', // Verde
  '#f59e0b', // Ambar
  '#8b5cf6', // Violeta
  '#ec4899', // Rosa
  '#64748b', // Slate
];

export function GeneralTab({ property }: { property: any }) {
  const [formData, setFormData] = useState({ 
    name: property.name, 
    max_slots: property.max_slots || 1,
    default_turn_duration: property.default_turn_duration || 1, // <--- NUEVO
    address: property.address || '',
    image_url: property.image_url || '',
    color: property.color || '#3b82f6'
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    const res = await updatePropertySettings(property.id, formData);
    setIsLoading(false);
    
    if (res.success) toast.success(res.message);
    else toast.error(res.message);
  };

  return (
    <div className="space-y-6 w-full pb-6">
      
      {/* SECCIÓN 1: IDENTIDAD VISUAL */}
      <div className="space-y-4 p-4 bg-white border rounded-lg shadow-sm">
          <h4 className="text-sm font-bold text-muted-foreground flex items-center gap-2 border-b pb-2">
            <Palette size={14}/> Identidad de la Propiedad
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre Corto</Label>
                <Input 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                  placeholder="Ej: Casa Playa"
                />
              </div>

              <div className="space-y-2">
                <Label>Color en Calendario</Label>
                <div className="flex gap-2 flex-wrap pt-1">
                    {COLOR_PALETTE.map(c => (
                        <button
                            key={c}
                            type="button"
                            onClick={() => setFormData({...formData, color: c})}
                            className={cn(
                                "w-6 h-6 rounded-full border-2 transition-all ring-offset-1",
                                formData.color === c ? "border-slate-600 scale-110 ring-1 ring-slate-400" : "border-transparent hover:scale-105"
                            )}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>
              </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2"><ImageIcon size={14}/> URL Imagen Portada</Label>
            <div className="flex gap-2">
                <Input 
                  value={formData.image_url} 
                  onChange={(e) => setFormData({...formData, image_url: e.target.value})} 
                  placeholder="https://..."
                  className="text-xs font-mono"
                />
                {formData.image_url && (
                    <div className="w-10 h-10 rounded-md bg-slate-100 shrink-0 overflow-hidden border">
                        <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                )}
            </div>
          </div>
      </div>

      {/* SECCIÓN 2: REGLAS DE TURNOS (NUEVO) */}
      <div className="space-y-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
          <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2 border-b border-slate-200 pb-2">
            <CalendarClock size={14}/> Configuración de Turnos
          </h4>

          <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Capacidad (Slots)</Label>
                <div className="relative">
                    <Users className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input 
                      type="number" 
                      min={1} 
                      max={10}
                      className="pl-9 bg-white"
                      value={formData.max_slots} 
                      onChange={(e) => setFormData({...formData, max_slots: parseInt(e.target.value)})} 
                    />
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  Familias que caben simultáneamente.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Duración Estándar</Label>
                <div className="flex items-center gap-2">
                    <Input 
                      type="number" 
                      min={1} 
                      max={52}
                      className="bg-white"
                      value={formData.default_turn_duration} 
                      onChange={(e) => setFormData({...formData, default_turn_duration: parseInt(e.target.value)})} 
                    />
                    <span className="text-sm text-muted-foreground font-medium">semanas</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  Valor por defecto al generar calendario.
                </p>
              </div>
          </div>
      </div>

      {/* SECCIÓN 3: LOGÍSTICA */}
      <div className="space-y-4 p-4 bg-white border rounded-lg shadow-sm">
          <h4 className="text-sm font-bold text-muted-foreground flex items-center gap-2 border-b pb-2">
            <MapPin size={14}/> Ubicación y Logística
          </h4>

          <div className="space-y-2">
            <Label>Dirección Física</Label>
            <Textarea 
              value={formData.address} 
              onChange={(e) => setFormData({...formData, address: e.target.value})} 
              placeholder="Calle Principal 123, CP 00000..."
              rows={2}
              className="resize-none text-sm"
            />
          </div>
      </div>

      <div className="pt-2">
        <Button onClick={handleSave} disabled={isLoading} className="w-full font-bold">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
            Guardar Configuración
        </Button>
      </div>
    </div>
  );
}