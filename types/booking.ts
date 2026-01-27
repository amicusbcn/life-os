// types/booking.ts

export type BookingStatus = 'confirmed' | 'released' | 'cancelled';
export type BookingType = 'turn' | 'request' | 'maintenance';
export type MemberRole = 'owner' | 'admin' | 'member';
export type MemberResponsibility = 'booking' | 'maintenance' | 'financial' | 'logistics';
export interface BookingProperty {
  id: string; // UUID
  name: string;
  slug: string; 
  max_slots: number; // 2 o 3
  color: string;
  scheduler_settings: SchedulerSettings;
  members?: BookingPropertyMember[];
}


export interface BookingPropertyMember {
  id: string;
  property_id: string;
  profile_id: string;
  role: MemberRole;
  turn_order: number | null;
  profile?: BookingProfile;
}

export interface BookingAnnouncement {
  id: string;
  property_id: string;
  content: string;
  is_active: boolean;
  created_at: string;
}

export interface BookingExemption {
  id: string;
  property_id: string;
  name: string;
  start_date: string; // ISO Date
  end_date: string;   // ISO Date
}

export interface BookingProfile {
  id: string;
  user_id?: string |null;
  display_name: string;
  initials: string; // Ej: "JP", "1", "A"
  color: string;    // Ej: "#EF4444"
  secondary_email?: string; // Para avisos a pareja
  is_active: boolean;
  email?:string;
  phone?:string;
  role?:string;
}

export interface BookingEvent {
  id: string;
  property_id: string;
  user_id: string; // En caso de maintenance, puede ser el ID del admin o null (según nullable)
  stay_range: string;
  type: BookingType;
  status: BookingStatus;
  notes?: string;
  
  // Relaciones
  property?: BookingProperty;
  user?: BookingProfile;
}

// Nuevo: Avisos de relevo
export interface BookingHandover {
  id: string;
  property_id: string;
  author_id: string;
  message: string; // "Se acabó el butano"
  created_at: string;
  resolved_at?: string; // Cuando el siguiente lo lee o marca OK
  author?: BookingProfile;
}

export type WizardExemption = {
  id?: string; // Opcional si es nueva
  name: string;
  start_date: Date;
  end_date: Date;
  type: 'special'|'maintenance'
};

export type SchedulerSettings = {
  turn_duration_weeks: number; // 1 o 2 normalmente
  changeover_day: number; // 0=Domingo, 1=Lunes, 5=Viernes
  excluded_dates: string[]; // Rangos ISO o fechas específicas
};
export type SchedulePattern = {
  weekIndex: number;
  slotIndex: number;
  userId: string;
};
export type GenerateScheduleInput = {
  propertyId: string;
  startDate: Date;
  endDate: Date;
  turnDurationWeeks: number;
  exemptions: WizardExemption[];
  cyclePattern: SchedulePattern[]; // <--- CAMBIO IMPORTANTE: Ya no es string[]
  cycleLengthWeeks: number; // Para saber cuándo repetir el patrón
};

type BookingEventInsert = {
  property_id: string;
  user_id: string | null;
  stay_range: string;
  type: 'turn' | 'maintenance';
  status: 'confirmed';
  notes?: string;
};


export interface BookingMember {
  id: string; 
  property_id: string;
  profile_id: string;
  role: MemberRole;
  responsibilities: MemberResponsibility[];
  turn_order: number;
  profile: BookingProfile;
}

export type PropertySettingsInput = {
  name: string;
  max_slots: number;
  color?: string;
  // Otros campos futuros...
};

export interface BookingHoliday {
  id: string;
  date: string; // Vendra como string 'YYYY-MM-DD' de la DB
  name: string;
}