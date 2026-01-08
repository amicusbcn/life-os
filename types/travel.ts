// types/travel.ts

export type TravelContext = 'work' | 'personal';
export type TripDbStatus = 'planned' | 'ongoing' | 'completed' | 'cancelled'| 'open' | 'closed';

// --- ENTIDADES BASE (Reflejo fiel de la BBDD) ---

export interface TravelTrip {
  id: string;
  created_at: string;
  name: string;
  start_date: string;
  end_date: string | null;
  status: TripDbStatus;
  employer_id: string | null;
  report_id: string | null;
  user_id: string;
  context: TravelContext; // NUEVO
}

export interface TravelExpense {
  id: string;
  created_at: string;
  date: string;
  trip_id: string;
  report_id: string | null;
  category_id: string | null;
  concept: string | null;
  amount: number;
  mileage_distance: number | null;
  mileage_rate_snapshot: number | null;
  is_mileage?: boolean;
  is_reimbursable: boolean;
  receipt_url: string | null;
  user_id: string;
  receipt_waived: boolean;
  personal_accounting_checked: boolean;
  context: TravelContext; // NUEVO
}

export interface TravelCategory {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  context: TravelContext;
  icon_key: string;  
  is_mileage: boolean; 
  current_rate?:number;
}

export interface TripDetailData extends TravelTrip {
  travel_employers: {
    name: string;
  } | null;
}

// --- TIPOS PARA CONSULTAS (Lo que "viene" de Supabase) ---
// Estos son los que suelen abultar pero son necesarios para evitar el tipo 'any'

export interface TripQueryResponse {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  status: TripDbStatus;
  employer_id: string | null;
  report_id: string | null;
  context: TravelContext;
  travel_employers: { name: string } | null;
  travel_reports: { id: string; name: string; status: string; code: string | null } | null;
  // Si usas una cuenta de gastos agregada desde SQL, añadirías:
  expenses_aggregate?: { aggregate: { sum: { amount: number }; count: number } };
}

export interface ReportQueryResponse {
  id: string;
  created_at: string;
  name: string;
  employer_id: string | null;
  user_id: string;
  status: string;
  code: string | null;
  url_summary: string | null;
  url_detail: string | null;
  url_receipts: string | null;
  travel_employers: { name: string } | null;
  travel_trips: { id: string; name: string; travel_expenses: { amount: number }[] }[];
}

// --- INTERFACES PARA LA UI (Data Transfer Objects) ---

export interface TripWithTotals extends TravelTrip {
  employer_name: string; // Eliminamos el '?' para que no sea undefined
  report_name?: string;
  report_status?: string;
  total_amount: number;
  expense_count: number;
  visual_status: string;
  // Añadimos esto para resolver los errores de "Property 'travel_reports' does not exist"
  travel_reports?: {
    id: string;
    name: string;
    status: string;
    code: string | null;
  } | null;
}

export interface TravelReportWithDetails {
  id: string;
  created_at: string;
  name: string;
  employer_id: string | null;
  user_id: string;
  status: 'draft' | 'submitted' | 'approved' | 'paid';
  code: string | null;
  url_summary?: string | null;
  url_detail?: string | null;
  url_receipts?: string | null;
  employer_name?: string;
  trip_count: number;
  total_amount: number;
  // ESTO ES LO QUE FALTA:
  trips_data?: {
    id: string;
    name: string;
    start_date: string;
    travel_expenses?: { amount: number }[];
  }[];
}

export interface TravelMileageTemplate {
  id: string;
  name: string;
  distance: number;
  category_id: string;
  user_id: string;
}

// --- PROPS DE COMPONENTES ---

export interface NewExpenseDialogProps {
  tripId: string;
  categories: TravelCategory[];
  templates: TravelMileageTemplate[];
  context: TravelContext; // Obligatorio para saber qué mostrar
}

export interface TravelEmployer {
  id: string;
  name: string;
}

// Auxiliares
export type ExpenseReceiptUrl = { receipt_url: string | null };

export interface TravelTripCandidate {
  id: string;
  name: string;
  start_date: string;
}

export interface ReportCandidatesResponse {
  ready: TravelTripCandidate[];
  warnings: TravelTripCandidate[];
}

export interface TripStatusSelectorProps {
    tripId: string;
    currentStatus: TripDbStatus;
    isPersonal?: boolean;
    // Añadimos lo que falta:
    trip: any; // O el tipo de tu viaje si lo tienes definido
    hasPendingReceipts: boolean;
    hasExpenses: boolean;
}