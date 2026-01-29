// app/settings/modules/components/EditModuleSheet.tsx
'use client'

import { useState } from 'react';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { 
    Settings2, Save, Fingerprint, Palette, 
    AlignLeft, Info, Folder, Hash, Activity, 
    ExternalLink, ShieldCheck, 
    Link as LinkIcon
} from 'lucide-react';
import { updateModule } from '../actions';
import { toast } from 'sonner';
import LoadIcon from '@/utils/LoadIcon';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface Props {
    module: any;
    admins?: { id: string, full_name: string, avatar_url: string }[];
}

export function EditModuleSheet({ module, admins = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [iconPreview, setIconPreview] = useState(module.icon);

  async function handleSubmit(formData: FormData) {
    const data = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      icon: formData.get('icon') as string,
      key: formData.get('key') as string,
      // Los campos no editables no se envían o se mantienen igual
    };

    toast.promise(updateModule(module.id, data), {
      loading: 'Actualizando núcleo...',
      success: () => { setOpen(false); return 'Módulo actualizado'; },
      error: 'Error al sincronizar'
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-600">
          <Settings2 className="h-4 w-4" />
        </Button>
      </SheetTrigger>

      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto p-0 bg-slate-50 border-l shadow-2xl">
        {/* HEADER CON IDENTIDAD */}
        <div className="p-6 bg-white border-b sticky top-0 z-10">
            <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                    <LoadIcon name={iconPreview || 'Package'} size={28} />
                </div>
                <div>
                    <SheetTitle className="text-xl font-black text-slate-900 tracking-tight">
                        {module.name}
                    </SheetTitle>
                    <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] font-mono bg-slate-50">{module.key}</Badge>
                        {module.config_route && (
                            <Button variant="link" className="h-auto p-0 text-[10px] text-indigo-600" asChild>
                                <a href={module.config_route}>
                                    <ExternalLink className="w-3 h-3 mr-1" /> Configuración App
                                </a>
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>

        <form action={handleSubmit} className="p-6 space-y-6 pb-24">
          
          {/* SECCIÓN 1: DATOS EDITABLES */}
          <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <Palette className="h-4 w-4 text-slate-400" />
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Información General</h4>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-600">Nombre del Módulo</Label>
              <Input name="name" defaultValue={module.name} required className="bg-slate-50/50 border-slate-200" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-600">Ruta del Módulo</Label>
              <Input name="key" defaultValue={module.key} required className="bg-slate-50/50 border-slate-200" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-600">Icono (Nombre Lucide)</Label>
              <div className="flex gap-2">
                <Input 
                    name="icon" 
                    value={iconPreview} 
                    onChange={(e) => setIconPreview(e.target.value)}
                    className="bg-slate-50/50 font-mono text-xs" 
                    placeholder="Ej: Wallet, Calendar..."
                />
                <div className="w-10 h-10 border rounded-lg flex items-center justify-center bg-white shrink-0">
                    <LoadIcon name={iconPreview} size={18} className="text-slate-400" />
                </div>
              </div>
              <p className="text-[9px] text-slate-400">Usa nombres válidos de <Link href="https://lucide.dev/icons" target='_blank'>lucide.dev</Link></p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-600">Descripción</Label>
              <Textarea name="description" defaultValue={module.description} rows={2} className="bg-slate-50/50 text-xs resize-none" />
            </div>
          </section>

          {/* SECCIÓN 2: METADATOS (Solo Lectura) */}
          <section className="grid grid-cols-2 gap-3">
             <div className="bg-slate-100/50 p-3 rounded-xl border border-slate-200/60">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <Folder className="w-3 h-3" />
                    <span className="text-[9px] font-bold uppercase tracking-wider">Carpeta</span>
                </div>
                <span className="text-xs font-bold text-slate-600">{module.category || 'Sin carpeta'}</span>
             </div>
             <div className="bg-slate-100/50 p-3 rounded-xl border border-slate-200/60">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <Hash className="w-3 h-3" />
                    <span className="text-[9px] font-bold uppercase tracking-wider">Posición</span>
                </div>
                <span className="text-xs font-bold text-slate-600">#{module.sort_order || 0}</span>
             </div>
          </section>

          {/* SECCIÓN 3: ADMINISTRADORES */}
          <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-slate-400" />
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Admin. del Módulo</h4>
            </div>
            <div className="flex flex-wrap gap-2">
                {admins.length > 0 ? admins.map(admin => (
                    <div key={admin.id} className="flex items-center gap-2 bg-slate-50 pr-3 rounded-full border border-slate-100">
                        <Avatar className="h-6 w-6 border">
                            <AvatarImage src={admin.avatar_url} />
                            <AvatarFallback className="text-[8px]">{admin.full_name?.[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-[10px] font-bold text-slate-700">{admin.full_name}</span>
                    </div>
                )) : (
                    <span className="text-[10px] text-slate-400 italic">No hay administradores específicos</span>
                )}
            </div>
          </section>

          <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t sm:relative sm:bg-transparent sm:border-0 sm:p-0">
            <Button type="submit" className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-100">
                <Save className="mr-2 h-4 w-4" /> Guardar Arquitectura
            </Button>
          </div>

        </form>
      </SheetContent>
    </Sheet>
  );
}