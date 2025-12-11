// app/utils/trip-logic.ts
import { TravelTrip, TripVisualStatus } from '@/types/travel';

export interface TripStateResult {
  visualStatus: TripVisualStatus;
  label: string;
  color: string; // Tailwind classes
  actions: {
    canClose: boolean;   // ¿Se puede pasar a 'closed'?
    canReopen: boolean;  // ¿Se puede pasar a 'open'?
    canReport: boolean;  // ¿Se puede meter en un informe?
    isLocked: boolean;   // ¿Está bloqueado totalmente (readonly)?
  };
}

export function getTripState(trip: TravelTrip): TripStateResult {
  const today = new Date().toLocaleDateString('en-CA'); // "YYYY-MM-DD" local

  // --- 1. ESTADO: REPORTADO (Bloqueo Total) ---
  if (trip.status === 'reported' || trip.report_id) {
    return {
      visualStatus: 'reported',
      label: '📑 Reportado',
      color: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      actions: { canClose: false, canReopen: false, canReport: false, isLocked: true }
    };
  }

  // --- 2. ESTADO: CERRADO (Bloqueo Parcial) ---
  if (trip.status === 'closed') {
    return {
      visualStatus: 'closed',
      label: '🔒 Cerrado',
      color: 'bg-slate-100 text-slate-500 border-slate-200 line-through',
      actions: { 
        canClose: false, 
        canReopen: true, // <--- ¡AQUÍ ESTÁ LA CLAVE! Se puede reabrir
        canReport: true, // Se puede reportar desde cerrado
        isLocked: true   // Visualmente parece bloqueado, pero tiene acciones
      }
    };
  }

  // --- 3. ESTADO: ABIERTO (Cálculo de fechas) ---
  // Si llegamos aquí, status === 'open'. Calculamos el sub-estado visual.

  const baseActions = { canClose: true, canReopen: false, canReport: true, isLocked: false };

  // A. Futuro
  if (trip.start_date > today) {
    return {
      visualStatus: 'planned',
      label: '📅 Planificado',
      color: 'bg-orange-100 text-orange-700 border-orange-200',
      actions: baseActions
    };
  }

  // B. Pasado
  if (trip.end_date < today) {
    return {
      visualStatus: 'completed',
      label: '🛬 Realizado',
      color: 'bg-blue-100 text-blue-700 border-blue-200',
      actions: baseActions
    };
  }

  // C. Presente
  return {
    visualStatus: 'active',
    label: '🚀 En curso',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    actions: baseActions
  };
}