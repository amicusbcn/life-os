// types/calendar.ts
export type CalendarEventType = 'maintenance' | 'inventory' | 'finance' | 'health' | 'event';

export interface CalendarEvent {
  id: string;
  date: Date;
  title: string;
  description?: string;
  type: CalendarEventType;
  status: 'pending' | 'completed' | 'urgent' | 'info';
  color?: string; // Color opcional para override
  payload: any;   // El objeto original (ej: la tarea completa)
}

export interface CalendarProps {
  events: CalendarEvent[];
  // Slot para renderizar el detalle de lo que ocurra al hacer click
  renderDetail?: (event: CalendarEvent) => React.ReactNode; 
}