'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, Calendar } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';

export function MobileTaskHeader({ task }: { task: any }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="lg:hidden sticky top-0 z-20 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="p-4" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col min-w-0">
            {/* Título siempre visible (truncado si es largo) */}
            <h1 className="font-bold text-slate-900 truncate text-sm">
              {task.title}
            </h1>
            {!isOpen && (
              <div className="flex items-center gap-2 mt-1">
                 <Badge variant="outline" className="text-[10px] py-0 h-4">
                    {task.status}
                 </Badge>
                 <span className="text-[10px] text-slate-500">
                    ID: #{task.id.slice(0,5)}
                 </span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {isOpen ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
          </div>
        </div>

        {/* Contenido desplegable */}
        {isOpen && (
          <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
            <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-2 rounded-lg">
                    <p className="text-slate-400 font-bold uppercase text-[9px]">Ubicación</p>
                    <p className="font-medium text-slate-700">{task.property_locations?.name || 'General'}</p>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg">
                    <p className="text-slate-400 font-bold uppercase text-[9px]">Objeto</p>
                    <p className="font-medium text-slate-700">{task.inventory_items?.name || 'Ninguno'}</p>
                </div>
            </div>
            
            <div className="space-y-1">
                <p className="text-slate-400 font-bold uppercase text-[9px]">Descripción</p>
                <p className="text-sm text-slate-600 leading-relaxed">
                    {task.description || 'Sin descripción adicional.'}
                </p>
            </div>

            {/* AQUÍ pondríamos el botón de Editar que querías */}
            <Button variant="outline" size="sm" className="w-full text-xs h-8 border-dashed">
                Editar Datos Generales
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}