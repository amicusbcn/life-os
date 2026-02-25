import { PropertyLocation } from "./properties";

// app/types/inventory.ts (NUEVO/ACTUALIZADO)
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
  parent_id?: string | null;
  parent?: InventoryLocation | null;
}

export interface InventoryItem {
  id: string;
  created_at: string;
  name: string;
  model?: string;
  brand?:string;
  serial_number?: string;
  purchase_date?: string; 
  warranty_end_date?: string;
  price?: number;
  
  category_id?: string;
  user_id: string;
    
  // A) MODO PERSONAL (El que ya tenías)
  // Referencia a la tabla 'inventory_locations'
  location_id?: string | null; 

  // B) MODO PROPIEDAD (El nuevo)
  // Referencia a la tabla 'properties'
  property_id?: string | null; 
  property_location_id?: string | null; 
  

  photo_path?: string;
  receipt_path?: string;
  external_links: InventoryLink[]; 
  location?: InventoryLocation; // Personal
  property_location?: PropertyLocation; // Propiedad
  inventory_loans?: InventoryLoan[];
}

export type InventoryItemBase = Pick<InventoryItem, 'id' | 'name' | 'property_id' |'location_id' |'property_location_id'>;

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


// 🚨 Interfaz para el menú (pasando los datos)
export interface InventoryMenuProps {
    categories: InventoryCategory[];
    locations: InventoryLocation[];
}

export interface CloneableElementProps {
    onClick?: (e: React.MouseEvent) => void;
    onSelect?: (e: Event) => void; 
}
export interface LocationWithLevel extends InventoryLocation {
    level: number
}
export interface InventorySettingsDialogProps {
  categories: InventoryCategory[];
  locations: InventoryLocation[];
  children: React.ReactNode;
}
export interface ItemEditDialogProps {
    item: any;
    categories: any[]; 
    locations: any[];
    // 🚨 Ahora recibe el estado directamente, no usa children
    isOpen?: boolean; 
    setOpen?: (open: boolean) => void; 
    children?: React.ReactNode;
}
