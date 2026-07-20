// types/finance.ts
import { Json, Profile } from './inventory'; // Importamos Json y Profile desde un tipo existente

// Definición de Tipos ENUM usados en la BBDD
export type FinanceAccountType = 
  | 'checking' 
  | 'savings' 
  | 'credit_card' 
  | 'loan' 
  | 'investment' 
  | 'cash' 
  | 'virtual'; // Añadimos virtual para la "Caja de Viajes"

export const ACCOUNT_TYPES_META: Record<FinanceAccountType, { label: string, icon: string }> = {
    checking: { label: 'Cuenta Corriente', icon: 'Landmark' },
    savings: { label: 'Cuenta de Ahorro', icon: 'PiggyBank' },
    credit_card: { label: 'Tarjeta de Crédito', icon: 'CreditCard' },
    loan: { label: 'Préstamo / Deuda', icon: 'ReceiptEuro' },
    investment: { label: 'Inversión', icon: 'TrendingUp' },
    cash: { label: 'Efectivo', icon: 'Banknote' },
    virtual: { label: 'Cuenta Virtual / Puente', icon: 'Network' }
};

export interface FinanceDashboardData {
    accounts: FinanceAccount[];
    categories: FinanceCategory[];
    transactions: FinanceTransaction[];
    rules: FinanceRule[];
    history: any[];   // Log de importaciones
}

export interface FinanceAccount {
  id: string;
  created_at: string;
  user_id: string;
  name: string;
  slug:string;
  account_number?: string;
  account_type: FinanceAccountType;
  currency: string;

  avatar_letter?:string;
  color_theme?: string;
  icon_name?: string;

  initial_balance: number;
  current_balance: number;
  oldest_date?: string | null;
  newest_date?: string | null;

  is_active: boolean;
  is_hidden: boolean;
  auto_mirror_transfers?:boolean|null;

  //DEPRECATED
  balance_updated_at?: string; 
  importer_id?:string|null;
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

 export type ParsedTransaction = {
  date: string;
  amount: number;
  concept: string;
  importer_notes: string;
  bank_balance?: number | null;
};

export interface FinanceTransaction {
  id: string;
  created_at: string;
  date: string;
  concept: string;
  amount: number;
  account_id: string;
  importer_id?: string;
  is_split: boolean;
  travel_expense_id?: string | null;
  category_id?: string | null;
  user_id: string;
  notes?: string | null;                  // Tu "alias" personalizado
  bank_balance?: number | null;           // El saldo que venía en el CSV
  transfer_id?: string | null; // Para vincular Transferencias
  inventory_item_id?: string | null;      // Link al módulo de Inventario
  trip_id?:string |null;
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