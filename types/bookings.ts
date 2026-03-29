import { CalendarEvent, CalendarEventStatus, CalendarEventType } from "./calendar";

export type BookingEventStatus=Extract<CalendarEventStatus,'confirmed' | 'released' | 'completed' | 'cancelled'>;
export type BookingEventType = Extract<CalendarEventType, 
  'rotation' | 'special' | 'blocked' | 'external' | 'request'
>;

// 2. Expandimos la interfaz
export interface BookingEvent extends CalendarEvent {
  property_id: string; 
  member_id:string;
  type: BookingEventType;
  status: BookingEventStatus;
}