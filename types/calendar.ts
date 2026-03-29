// types/calendar.ts
export type CalendarEventType = 'maintenance' | 'inventory' | 'finance' | 'health' | 'event' |
  // tipos de BOOking
  'rotation' | 'special' | 'blocked' | 'external' | 'request';
export type CalendarEventStatus= 'pending' | 'completed' | 'urgent' | 'info' |
  // estados de bookings
  'confirmed' | 'released' | 'cancelled';

export interface CalendarEvent {
  id: string;
  date?: Date;
  range?:{
    start:Date;
    end:Date;
  }
  title: string;
  description?: string;
  type: CalendarEventType;
  status: CalendarEventStatus;
  color?: string; // Color opcional para override
  payload?: any;   // El objeto original (ej: la tarea completa)
  isExemption?:boolean;
}

export interface CalendarProps {
  events: CalendarEvent[];
  // Slot para renderizar el detalle de lo que ocurra al hacer click
  renderDetail?: (event: CalendarEvent) => React.ReactNode; 
  month: number; // Mes actual (0-11)
  year: number;  // Año actual
  holidays?: Holiday[];
  hide_holidays?: boolean;
  defaultEventId?:string;
  baseUrl:string
}
export interface Holiday {
  id: string;
  holiday_date: string | Date;
  name: string;
  scope: 'national' | 'local' |'personal';
  locality?: string;
  is_annual: boolean;
  user_id?: string;
}

