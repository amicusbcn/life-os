// types/maintenance.ts
export type TaskStatus = 'pendiente' | 'en_proceso' | 'bloqueado' | 'completada' | 'cancelada';
export type TaskStatusIcon = 'TriangleAlert' | 'CirclePlay' | 'SquarePause' | 'CircleCheck' | 'OctogonX';
export type TaskType = 'averia' | 'preventivo' | 'mejora';
export type InsuranceStatus = 'no' | 'solicitada' | 'aceptada' | 'abonada' | 'rechazada';

export interface MaintenanceTask {
  id: string;
  property_id: string;
  item_id?: string | null;
  location_id?: string | null;
  title: string;
  description?: string;
  type: TaskType;
  status: TaskStatus;
  priority: number;
  assigned_to?: string | null;
  is_recurring: boolean;
  frequency_months?: number | null;
  next_occurrence?: string | null;
  created_at: string;
  // Relaciones (Joins de Supabase)
  properties?: { name: string; slug: string };
  inventory_items?: { name: string };
  assigned_member?: {
    id: string;
    name: string;
    user_id?: string | null;
  };
  created_by_profile?: {
    full_name: string;
  };
  insurance_status?: InsuranceStatus;
  insurance_ref?: string | null;
  category?: MaintenanceCategory;
}

export interface MaintenanceCategory {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}


export type EntryType = 'comentario' | 'actividad' | 'sistema';
export type ActivityStatus = 'programada' | 'realizada' | 'cancelada';

export interface MaintenanceLog {
    id: string;
    task_id: string;
    user_id: string;
    content: string;
    entry_type: EntryType;
    activity_date?: string | null;
    activity_status?: ActivityStatus | null;
    assigned_to?: string | null;
    created_at: string;
    // Relación para el perfil del que escribe
    profiles?: { full_name: string; avatar_url: string };
    // Relación para el asignado a la actividad (ej. tu hermano)
    assigned_profile?: { full_name: string };
}