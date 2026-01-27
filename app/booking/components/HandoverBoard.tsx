'use client';

import { useState } from 'react';
import { useImpersonation } from './impersonationContext';
import { createHandover, resolveHandover } from '../actions';
import { BookingProperty } from '@/types/booking';
import { AlertCircle, CheckCircle2, Send, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// Definimos la interfaz localmente o impórtala de types si la tienes completa
interface Handover {
  id: string;
  message: string;
  created_at: string;
  author?: {
    display_name: string;
    initials: string;
    color: string;
  };
}

interface HandoverBoardProps {
  property: BookingProperty;
  initialHandovers: Handover[];
}

export function HandoverBoard({ property, initialHandovers }: HandoverBoardProps) {
  const { activeProfile } = useImpersonation();
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Acción: Crear aviso
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msg.trim() || !activeProfile) return;
    
    setLoading(true);
    await createHandover(property.id, activeProfile.id, msg);
    setMsg('');
    setLoading(false);
  };

  // Acción: Resolver aviso (Marcar como leído/solucionado)
  const handleResolve = async (id: string) => {
    if (!activeProfile) return;
    await resolveHandover(id, activeProfile.id);
  };

  return (
    <div className="mt-8 border rounded-xl bg-white shadow-sm overflow-hidden">
      <div className="bg-slate-50 border-b px-4 py-3 flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-amber-600" />
        <h3 className="font-semibold text-slate-800">
          Avisos de Relevo en {property.name}
        </h3>
        <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full ml-auto">
          {initialHandovers.length} activos
        </span>
      </div>

      <div className="p-4 space-y-4">
        
        {/* FORMULARIO DE NUEVO AVISO */}
        <form onSubmit={handleSend} className="flex gap-2">
          <Input 
            placeholder={`¿Falta algo en ${property.name}? (ej: Se acabó el aceite...)`}
            value={msg}
            onChange={e => setMsg(e.target.value)}
            disabled={loading}
            className="flex-1 text-sm"
          />
          <Button type="submit" size="icon" disabled={loading || !msg.trim()} className="bg-slate-900">
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={16} />}
          </Button>
        </form>

        {/* LISTA DE AVISOS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {initialHandovers.length === 0 ? (
            <div className="col-span-full py-6 text-center text-slate-400 text-sm italic border-2 border-dashed rounded-lg">
              Todo en orden. No hay incidencias reportadas. ✅
            </div>
          ) : (
            initialHandovers.map(item => (
              <div key={item.id} className="group relative bg-amber-50/50 border border-amber-100 p-3 rounded-lg hover:shadow-md transition-all flex flex-col gap-2">
                
                {/* Cabecera Autor */}
                <div className="flex items-center gap-2 mb-1">
                  <div 
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                    style={{ backgroundColor: item.author?.color || '#ccc' }}
                  >
                    {item.author?.initials}
                  </div>
                  <span className="text-xs font-semibold text-slate-700">
                    {item.author?.display_name}
                  </span>
                  <span className="text-[10px] text-slate-400 ml-auto">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>

                {/* Mensaje */}
                <p className="text-sm text-slate-800 font-medium leading-snug">
                  {item.message}
                </p>

                {/* Botón Resolver (Aparece al hacer hover o siempre en móvil) */}
                <button 
                  onClick={() => handleResolve(item.id)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-green-100 rounded-full text-green-600"
                  title="Marcar como solucionado"
                >
                  <CheckCircle2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}