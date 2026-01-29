// app/settings/modules/components/AddModuleSheet.tsx
'use client'

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Save, Palette, Layout } from 'lucide-react';
import { createModule } from '../actions';
import { toast } from 'sonner';

export function AddModuleSheet({ variant }: { variant?: 'sidebar' }) {
  const [open, setOpen] = useState(false);

  async function handleSubmit(formData: FormData) {
    const data = {
      name: formData.get('name') as string,
      key: formData.get('key') as string,
      description: formData.get('description') as string,
      category: formData.get('category') as string,
      icon: formData.get('icon') as string,
      route: `/${formData.get('key')}`, // Generamos ruta automática basada en la key
    };

    const res = await createModule(data);
    if (res.success) {
      toast.success(res.message);
      setOpen(false);
    } else {
      toast.error(res.error);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {/* Botón para el menu lateral (sidebar) y para otros sitios */}
        {variant === 'sidebar' ? (
            <button className="flex w-full items-center py-1.5 px-2 text-[11px] text-slate-500 hover:text-indigo-600">
            <span className="mr-2">•</span> Nuevo Módulo
            </button>
        ) : (
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md">
                <Plus className="w-4 h-4 mr-2" /> Nuevo Módulo
            </Button>
        )}      
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] bg-slate-50">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-2xl font-black">Añadir Módulo</SheetTitle>
          <SheetDescription>Registra una nueva aplicación en el ecosistema Life OS.</SheetDescription>
        </SheetHeader>

        <form action={handleSubmit} className="space-y-6">
          <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <Palette className="h-4 w-4 text-slate-400" />
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Configuración Base</h4>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold">Nombre</Label>
              <Input name="name" placeholder="Ej: Gestor de Tareas" required />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold">Identificador Único (Key)</Label>
              <Input name="key" placeholder="ej: tasks" required className="font-mono text-xs" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold">Carpeta/Categoría</Label>
              <Input name="category" placeholder="Ej: Productividad" required />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold">Icono (Lucide)</Label>
              <Input name="icon" placeholder="Ej: CheckSquare" required className="font-mono text-xs" />
            </div>
          </section>

          <Button type="submit" className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 font-bold text-white rounded-xl shadow-lg transition-transform active:scale-95">
            <Save className="mr-2 h-4 w-4" /> Crear Módulo
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}