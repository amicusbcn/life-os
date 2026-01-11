// types/travel.ts

/**
 * CONTEXTOS Y ESTADOS
 */
export type TravelContext = 'work' | 'personal';

// 'archived' permite ocultar viajes viejos de la vista principal
export type TripDbStatus = 'planned' | 'active' | 'completed' | 'cancelled' | 'open' | 'closed' | 'reported' | 'archived';

// Flujo simplificado: Borrador -> Enviado -> Pagado -> Archivado
export type ReportStatus = 'draft' | 'submitted' | 'paid' | 'archived';

/**
 * ENTIDADES BASE (Reflejo fiel de la BBDD)
 */
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
  context: TravelContext;
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
  context: TravelContext;
  finance_transactions?: { id: string }[];
}

export interface TravelCategory {
  id: string;
  name: string;
  icon_key: string | undefined;
  context: TravelContext;
  current_rate: number | null;
  is_mileage: boolean;
}

export interface TravelEmployer {
  id: string;
  name: string;
  color?:string;
}

export interface TravelMileageTemplate {
  id: string;
  name: string;
  distance: number;
  category_id: string;
  user_id: string;
}

/**
 * RESPUESTAS DE CONSULTAS (Data Fetching)
 */
export interface TripQueryResponse extends TravelTrip {
  travel_employers: { name: string } | null;
  travel_reports: { 
    id: string; 
    name: string; 
    status: ReportStatus; 
    code: string | null 
  } | null;
}

export interface ReportQueryResponse extends TravelReport {
  travel_employers: { name: string } | null;
  travel_trips: {
    id: string;
    name: string;
    start_date: string; // Ya no necesitamos (t as any)
    travel_expenses: { amount: number }[];
  }[];
}

/**
 * INTERFACES PARA LA UI (Extended)
 */
export interface TripWithTotals extends TravelTrip {
  employer_name?: string;
  report_name?: string;
  report_status?: ReportStatus;
  total_amount: number;
}

export interface TravelReport {
  id: string;
  created_at: string;
  name: string;
  employer_id: string | null;
  user_id: string;
  status: ReportStatus;
  code: string | null;
  url_summary?: string | null;
  url_detail?: string | null;
  url_receipts?: string | null;
}

export interface TravelReportWithDetails extends TravelReport {
  employer_name?: string;
  trip_count: number;
  total_amount: number;
  trips_data?: {
    id: string;
    name: string;
    start_date: string;
    travel_expenses?: { amount: number }[];
  }[];
}

/**
 * AUXILIARES PARA COMPONENTES
 */
export interface ReportCandidatesResponse {
  ready: TravelTrip[];
  warnings: TravelTrip[];
}

export interface TripDetailData extends TravelTrip {
  travel_employers: { name: string } | null;
}

export type ExpenseReceiptUrl = { receipt_url: string | null };

export interface TravelTripCandidate {
  id: string;
  name: string;
  start_date: string;
}