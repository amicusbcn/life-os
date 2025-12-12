// app/types/travel.ts

// --- 1. ENTIDADES DE BASE DE DATOS (Lo que hay en Supabase) ---

export type TripDbStatus = 'open' | 'closed' | 'reported';

export type TripVisualStatus = 'planned' | 'active' | 'completed' | 'closed' | 'reported';

export type ReportStatus = 'draft' | 'submitted' | 'paid';

export interface TravelEmployer {
  id: string;
  name: string;
}

export interface TravelMileageTemplate {
    id: string;
    created_at: string;
    name: string;
    distance: number; // Distancia fija en la plantilla
    user_id: string;
}

export interface TravelTrip {
  id: string;
  name: string;
  employer_id: string;
  report_id?: string | null;
  start_date: string; // ISO Date string
  end_date: string;
  status: TripDbStatus; // <--- Mantenemos el estado original de la DB
  travel_reports?: {
	id: string;
	name: string;
	status: ReportStatus;
    code?: string | null; // <--- AÑADIDO: Para mostrar el código del reporte
  } | null;
}

export interface TravelReport {
  id: string;
  created_at: string;
  name: string;
  code?: string; 
  employer_id: string;
  status: ReportStatus;
  user_id?: string;
  url_summary?: string | null;
  url_detail?: string | null;
  url_receipts?: string | null;
  submitted_at?: string | null;
  paid_at?: string | null;
}

export interface ReportCandidatesResponse {
  ready: TravelTrip[];    // Viajes cerrados listos para reportar
  warnings: TravelTrip[]; // Viajes con fecha pasada pero no cerrados
}

export interface TravelCategory {
// ... (sin cambios)
  id: string;
  name: string;
  icon_key: string;
  is_mileage: boolean;
  current_rate?: number;
}

export interface TravelExpense {
// ... (sin cambios)
  id: string;
  trip_id: string;
  date: string; 
  amount: number;
  concept: string;
  category_id: string;
  is_reimbursable: boolean;
  receipt_url?: string | null;
  receipt_waived: boolean;
  personal_accounting_checked: boolean;
  mileage_distance?: number | null;
  mileage_rate_snapshot?: number | null;
  created_at?: string;
  user_id?: string;
}

// --- 2. VIEW MODELS (Datos procesados para la UI) ---

export interface TripWithTotals extends TravelTrip {
  employer_name: string;
  total_amount: number;
  visual_status: TripVisualStatus; // <--- AÑADIDO: El estado calculado para las pestañas
}

export interface TravelReportWithDetails extends TravelReport {
// ... (sin cambios)
  employer_name?: string;
  trip_count: number;
  total_amount: number;
  trips_data?: any[]; 
}

// --- 3. DTOs / QUERY RESPONSES (Respuestas crudas de Supabase) ---

export interface ExpenseReceiptUrl {
  receipt_url: string | null;
}

export interface TripQueryResponse {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string; // Viene como string de la DB, lo castearemos a TripDbStatus
  employer_id: string;
  report_id: string | null;
  travel_employers: { name: string } | null;
  travel_reports: { 
    id: string; 
    name: string; 
    status: string; 
    code: string | null; // <--- AÑADIDO: El código para el DTO
} | null;
}

export interface ReportQueryResponse {
// ... (sin cambios)
  id: string;
  created_at: string;
  name: string;
  code?: string; 
  employer_id: string;
  status: string;
  user_id: string; 
  url_summary: string | null;
  url_detail: string | null;
  url_receipts: string | null;
  travel_employers: { name: string } | null;
  travel_trips: {
	id: string;
	name: string;
	start_date: string;
	end_date: string;
	travel_expenses: {
	  amount: number;
	}[]; // Optimizamos trayendo solo amount para la vista de lista
  }[];
}

// --- TIPO PARA RESPUESTAS DE SERVER ACTION ---
export interface TripStatusSelectorProps {
  trip: TravelTrip;
  hasPendingReceipts: boolean;
  hasExpenses: boolean; // Indica si tiene CUALQUIER gasto, para la advertencia de eliminación
}

export interface NewExpenseDialogProps {
  tripId: string;
  categories: TravelCategory[];
  // NUEVA PROP: Las plantillas disponibles para el usuario
  templates: TravelMileageTemplate[]; 
}

export interface TripDetailData extends TravelTrip {
  travel_employers: { name: string } | null
}