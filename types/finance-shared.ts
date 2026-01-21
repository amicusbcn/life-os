export type SharedTransactionType = 'expense' | 'income' | 'loan' | 'repayment' | 'transfer';
export type SharedTransactionStatus = 'pending' | 'approved' | 'rejected';
export type SharedPaymentSource = 'account' | 'member';
export type SharedMemberRole = 'admin' | 'member';
export type SharedAccountType = 'checking' | 'credit' | 'cash'; 

export interface SharedGroup {
  id: string;
  name: string;
  owner_id: string;
  currency: string;
  created_at: string;
  default_account?:string | null;
}

export interface SharedMember {
  id: string;
  group_id: string;
  user_id: string | null; // Null si es virtual
  name: string;
  email?: string;
  role: SharedMemberRole;
  // Campos calculados de la vista (opcionales al cargar lista simple)
  current_equity?: number; 
  initial_balance?:number;
  total_paid?: number;
  total_consumed?: number;
  total_received?: number;
}

export interface SharedAccount {
  id: string;
  group_id: string;
  name: string;
  balance: number;
  balance_date?:Date;
  type:  SharedAccountType;
  responsible_member_id?: string | null;
  color?: string;
  icon_name?: string;
}

export interface SharedAllocation {
  id: string;
  transaction_id: string;
  member_id: string;
  amount: number;
  member?: SharedMember; // Join
}

export interface SharedTransaction {
  id: string;
  group_id: string;
  account_id: string | null;
  date: string; // ISO Date
  amount: number;
  description: string;
  type: SharedTransactionType;
  status: SharedTransactionStatus;
  payment_source: SharedPaymentSource;
  payer_member_id: string | null;
  created_by: string;
  receipt_url?: string;
  reimbursement_status: 'none' | 'pending' | 'paid';
  // Joins comunes
  allocations?: SharedAllocation[];
  payer_member?: SharedMember;
  account?: SharedAccount;
  notes?:string;
  bank_balance?:number;
  linked_transaction_id?: string | null // El ID de la transacción espejo
  transfer_account_id?: string | null   // La otra cuenta implicada
  parent_transaction_id?: string | null 
  parent_transaction?: { description: string, date: string }
  is_provision: boolean
}


export interface SharedSplitTemplate {
  id: string;
  name: string;
  group_id: string;
  members: {
    member_id: string;
    shares: number;
  }[];
}

// ... (Tipos anteriores)

// === NUEVOS TIPOS PARA PLANTILLAS ===

export interface SharedSplitTemplate {
  id: string;
  group_id: string;
  name: string; // Ej: "Solo Chicos", "Todos menos Juan"
  created_at: string;
  description?:string;
  // Join con los detalles
  template_members?: SharedSplitTemplateMember[];
}

export interface SharedSplitTemplateMember {
  id: string;
  template_id: string;
  member_id: string;
  shares: number; // Ponderación (1 = una parte, 2 = doble parte, 0 = no paga)
  
  // Para UI
  member?: SharedMember; 
}

// Input para crear una plantilla
export interface CreateSplitTemplateInput {
  group_id: string;
  name: string;
  members: {
    member_id: string;
    shares: number;
  }[];
}

export interface SharedAccountManager {
  member_id: string;
  member_name: string; // Para mostrarlo fácil en UI
  member_email?: string;
}

export interface SharedAccount {
  id: string;
  group_id: string;
  name: string;
  balance: number;
  type: SharedAccountType;
  
  managers?: SharedAccountManager[]; 
}

// Input para asignar gestor
export interface AssignAccountManagerInput {
  account_id: string;
  member_id: string;
}

export interface CreateGroupInput {
  name: string;
  currency: string;
}

export interface AddMemberInput {
  group_id: string;
  name: string;
  email?: string;
  role: 'admin' | 'member';
  initial_balance?: number; // Nuevo
}
export interface UpdateMemberInput {
  memberId: string;
  groupId: string;
  name: string;
  role: 'admin' | 'member';
  email?: string;
  initial_balance?: number;
}

export interface SharedCategory {
  id: string;
  group_id: string;
  name: string;
  icon_name: string;
  color: string;
  parent_id?: string;
  level?: number; // Para UI
  is_individual_assignment:boolean;
  is_loan?:boolean;
}

export interface CreateSharedCategoryInput {
  group_id: string;
  name: string;
  icon_name?: string;
  parent_id?: string;
}

export interface CreateTransactionInput {
  group_id: string;
  date: string; // ISO Date
  amount: number;
  description: string;
  category_id?: string;
  
  // LOGICA DE PAGO
  payment_source: 'account' | 'member';
  payer_member_id?: string; // Obligatorio si source es member
  request_reimbursement?: boolean; // Checkbox de la UI
  
  // LOGICA DE REPARTO (Para empezar simple: Reparto equitativo entre IDs seleccionados)
  split_type: 'equal' | 'weighted'; // Cambiamos 'percentage' por 'weighted' que es más preciso
  involved_member_ids: string[]; // Quiénes participan en el gasto
  split_weights?: Record<string, number>;
}

export interface DashboardData {
    accounts: SharedAccount[]
    members: SharedMember[]
    categories: SharedCategory[]
    transactions: SharedTransaction[]
    splitTemplates: SharedSplitTemplate[]
}

