import { BookingEvent } from "@/types/booking";

export const parseBookingRange = (rangeStr: string) => {
  if (!rangeStr) return { start: new Date(), end: new Date() };
  
  // Limpiamos corchetes y paréntesis: [fecha, fecha) -> fecha,fecha
  const clean = rangeStr.replace(/[\[\]\(\)]/g, '');
  const [startStr, endStr] = clean.split(',');
  
  return {
    start: new Date(startStr.replace(/"/g, '')), // A veces Postgres añade comillas
    end: new Date(endStr.replace(/"/g, ''))
  };
};

export const isEventInDay = (event: BookingEvent, day: Date) => {
    const range = parseBookingRange(event.stay_range);
    if (!range) return false;

    const dayTime = day.setHours(0,0,0,0);
    const startTime = range.start.setHours(0,0,0,0);
    const endTime = range.end.setHours(0,0,0,0);

    // Postgres ranges suelen ser [start, end) -> start inclusivo, end exclusivo
    return dayTime >= startTime && dayTime < endTime;
};