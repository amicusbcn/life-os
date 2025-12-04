export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface InventoryLink {
  title: string;
  url: string;
}

export interface InventoryCategory {
  id: string;
  name: string;
  icon?: string;
}

export interface InventoryLocation {
  id: string;
  name: string;
  description?: string;
  parent_id?: string | null; // <--- ¡AÑADE ESTO!
}

export interface InventoryItem {
  id: string;
  created_at: string;
  name: string;
  model?: string;
  serial_number?: string;
  purchase_date?: string; // Formato YYYY-MM-DD
  warranty_end_date?: string;
  price?: number;
  
  category_id?: string;
  location_id?: string;
  user_id: string;
  
  photo_path?: string;
  receipt_path?: string;
  
  external_links: InventoryLink[]; // Aquí usamos el tipo definido arriba, no solo JSON
}


export interface MaintenanceTask {
  id: string;
  item_id: string;
  description: string;
  periodicity_days?: number;
  last_maintenance_date?: string;
  responsible_user_id?: string; // El UUID del usuario
  profiles?: Profile; 
}

export interface InventoryLoan {
  id: string;
  item_id: string;
  borrower_name: string;
  loan_date: string;
  return_date?: string; // null si sigue prestado
  notes?: string;
}

export interface Profile {
  id: string;
  full_name: string;
  email?: string;
  avatar_url?: string;
}