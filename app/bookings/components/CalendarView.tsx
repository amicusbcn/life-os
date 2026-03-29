// app/booking/components/CalendarView.tsx
'use client';

import { Calendar } from '@/components/layout/Calendar';
import { CalendarEvent } from '@/types/calendar';
import { Info, User, Hammer, Star, Calendar1 } from 'lucide-react';
import { useEffect, useState } from 'react';
import BookingDialog from '../../booking/components/BookingDialog';
import { ExemptionsSheet } from './ExemptionsSheet';
export default function CalendarView({ 
  events, 
  exemptions,
  holidays,
  scheduler,
  members,
  currentProperty, 
  year,
  month,
  profile,
  isModuleAdmin 
}: any) {
  const [isRotationOpen, setIsRotationOpen] = useState(false);
  const [isExemptionsOpen, setIsExemptionsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const accentColor = currentProperty.color || '#3b82f6';

  // Mapeamos las excenciones a evnetos

  const exemptionEvents = exemptions.map((ex:any) => {
    // 1. Troceamos el string "YYYY-MM-DD" para evitar el lío de UTC
    const [sYear, sMonth, sDay] = ex.start_date.split('-').map(Number);
    const [eYear, eMonth, eDay] = ex.end_date.split('-').map(Number);

    return {
      id: ex.id,
      title: ex.name,
      range: {
        // 2. Creamos la fecha usando el constructor de números (usa hora local)
        // Mes - 1 porque en JS los meses van de 0 a 11
        start: new Date(sYear, sMonth - 1, sDay, 0, 0, 0), 
        end: new Date(eYear, eMonth - 1, eDay, 23, 59, 59)
      },
      type: ex.type === 'maintenance' ? 'maintenance' : 'special',
      status: 'info',
      color: ex.type === 'maintenance' ? '#ef4444' : '#f59e0b',
      isExemption: true
    };
  });
  const allEvents = [...events, ...exemptionEvents];
  useEffect(() => {
    // Escuchamos el evento que lanzamos desde el menú
    const openRotation = () => setIsRotationOpen(true);
    const openExemptions = () => setIsExemptionsOpen(true);
    
    window.addEventListener('open-rotation-settings', openRotation);
    window.addEventListener('open-exemptions-settings', openExemptions);

    return () => {
      window.removeEventListener('open-rotation-settings', openRotation);
      window.removeEventListener('open-exemptions-settings', openExemptions);
    };
  }, []);

  return (
    <div className="space-y-6">
      <Calendar 
        events={allEvents}
        holidays={holidays}
        month={month}
        year={year}
        accentColor={accentColor}
        baseUrl={`/properties/${currentProperty.slug}/booking`}
       renderDetail={(event) => {
        // Si es una exención, mostramos un detalle distinto
          if (event.isExemption) {
            return (
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  {event.type === 'maintenance' ? <Hammer className="text-rose-500" /> : <Star className="text-amber-500" />}
                  <h3 className="font-black uppercase tracking-tighter text-xl">{event.title}</h3>
                </div>
                <p className='text-sm text-slate-500 italic'>
                  <div className="flex items-center gap-2 text-slate-500 text-sm italic">
                    <Calendar1 size={14} />
                    <span>Del: {event.range?.start.toLocaleDateString()}</span>
                    <span>Al: {event.range?.end.toLocaleDateString()}</span>
                  </div>
                </p>
                <p className="text-sm text-slate-500 italic">
                  {event.type === 'maintenance' 
                    ? "La propiedad está bloqueada por mantenimiento." 
                    : "Periodo especial: la asignación se realiza por sorteo o fuera de la rueda."}
                </p>
              </div>
            );
          }
          else return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border">
              {event.type === 'maintenance' ? (
                <Hammer className="text-slate-400" size={24} />
              ) : (
                <User style={{ color: event.color }} size={24} />
              )}
              <div>
                <h3 className="font-black uppercase tracking-tighter text-xl">{event.title}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{event.type}</p>
              </div>
            </div>
            
            <div className="p-4 rounded-xl border bg-white shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-slate-500 text-sm italic">
                <Info size={14} />
                <span>Del: {event.range?.start.toLocaleDateString()}</span>
                <span>Al: {event.range?.end.toLocaleDateString()}</span>
              </div>
              {event.description && (
                <p className="text-slate-600 text-sm leading-relaxed">
                  "{event.description}"
                </p>
              )}
            </div>
          </div>
        )}
      }
      />

      {/* Acción Global: Reservar */}
      <div className="flex justify-end">
        <button 
          onClick={() => setSelectedDate(new Date())}
          className="px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest text-white shadow-xl transition-all hover:scale-105 active:scale-95"
          style={{ backgroundColor: accentColor }}
        >
          Nueva Reserva
        </button>
      </div>

      {/* Diálogo de Reserva (v2 pendiente) {selectedDate && (
        <BookingDialog 
          isOpen={!!selectedDate}
          onClose={() => setSelectedDate(null)}
          date={selectedDate}
          property={currentProperty}
        />
      )}*/}
      <ExemptionsSheet 
        isOpen={isExemptionsOpen} 
        onClose={() => setIsExemptionsOpen(false)}
        exemptions={exemptions}
        propertyId={currentProperty.id}
      />
    </div>
  );
}