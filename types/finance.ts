import { Json, Profile } from './inventory'; // Importamos Json y Profile desde un tipo existente

// Definición de Tipos ENUM usados en la BBDD
export type FinanceAccountType = 'checking' | 'savings' | 'credit_card' | 'loan' | 'investment' | 'cash';

export interface FinanceDashboardData {
    accounts: FinanceAccount[];
    categories: FinanceCategory[];
    transactions: FinanceTransaction[];
    rules: FinanceRule[]; // 👈 Añade esta línea
}

export interface FinanceAccount {
  id: string;
  created_at: string;
  name: string;
  account_type: FinanceAccountType;
  currency: string;
  initial_balance: number;
  is_active: boolean;
  user_id: string;
  current_balance:number;
  color_theme?:string;
  icon_name?:string;
}

export interface FinanceCategory {
  id: string;
  created_at: string;
  name: string;
  icon_name?: string;
  color:string;
  is_income: boolean; // true para ingresos, false para gastos
  user_id: string;
  parent_id?: string | null; // Para subcategorías
  parent?:FinanceCategory|null;
}

export interface FinanceImporter {
  id: string;
  created_at: string;
  name: string;
  file_type: string; // Ej: 'C43', 'CSV', 'Manual'
  user_id: string;
}

export interface FinanceTransactionSplit {
  id: string;
  transaction_id: string;
  amount: number;
  category_id: string;
  notes?: string;
  user_id: string;
  category?: FinanceCategory; // 👈 AÑADE ESTA LÍNEA para corregir errores 347, 350, 352, 356
}

// src/types/finance.ts (Añadir a los tipos existentes)

/**
 * Define el mapeo de columnas para la importación de archivos CSV de un banco.
 */
export type ImporterTemplate = {
  id: string; // UUID de la plantilla
  user_id: string;
  name: string; // Nombre de la plantilla (ej: "Plantilla Banco X")
  delimiter: string; // Separador de columnas (ej: ',', ';', '\t')
  // Mapeo: {campo_del_sistema: nombre_columna_en_csv}
  mapping: {
    operation_date: string; // Nombre del encabezado CSV para la fecha
    concept: string; // Nombre del encabezado CSV para el concepto
    amount: string; // Nombre del encabezado CSV para el importe
    sign_column?: string; // Nombre del encabezado CSV si el signo está en columna separada
  };
};
 export type ParsedTransaction = {
  date: string;
  amount: number;
  concept: string;
  importer_notes: string;
};

export interface FinanceTransaction {
  id: string;
  created_at: string;
  date: string; // Formato YYYY-MM-DD
  concept: string;
  amount: number; // Positivo (Ingreso) o Negativo (Gasto)
  account_id: string;
  importer_id?: string;
  
  is_split: boolean; // true si tiene desgloses en finance_transaction_splits
  travel_expense_id?: string | null; // Link al módulo de Viajes
  category_id?: string | null; // Categoría primaria (si no hay split, o inicial)
  user_id: string;
  
  // Propiedades opcionales para JOINs en el Frontend:
  category?: FinanceCategory;
  account?: FinanceAccount;
  splits?: FinanceTransactionSplit[]; 
}

export interface FinanceRule {
    id: string;
    user_id: string;
    pattern: string;
    category_id: string;
    created_at: string;
    category?: FinanceCategory; // Relación opcional
}