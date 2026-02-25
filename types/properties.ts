export interface Property {
  id: string;
  name: string;
  slug: string;
  address?: string | null;
  description?: string | null;
  photo_url?: string | null;
  
  // CORRECCIÓN: Usamos los nombres reales de tu BBDD
  wifi_info?: {
    ssid?: string;
    password?: string;
  };
  insurance_info?: {
    company?: string;
    policy?: string;
    phone?: string;
  };
  
  security_info: {
    alarm_code?: string;
    company_name?: string;
    company_phone?: string;
  }
  
  active_modules?: PropertyModules

  created_at: string;

}
export type PropertySummary = Pick<Property, 'id' | 'name' | 'slug'>;
export type PropertyBase = Pick<Property, 'id' | 'name' | 'slug'>;
export interface PropertyLocation {
  id: string;
  property_id: string;
  parent_id?: string | null;
  name: string;
  type: 'zone' | 'room';
  created_at: string;
  parent?: PropertyLocation | null; 
}

export interface ZoneWithRooms extends PropertyLocation {
  rooms: PropertyLocation[];
}

export type MemberRole = 'owner' | 'admin' | 'member' | 'guest';

export interface PropertyMember {
  id: string;            // ID de la fila en property_members
  property_id: string;
  user_id?: string | null; // NULL si es fantasma
  
  // Datos denormalizados o del fantasma
  name: string;
  email?: string | null;
  avatar_url?: string | null;
  
  role: MemberRole;
  created_at: string;
}

// Helper para saber si es fantasma en el frontend
export const isGhost = (member: PropertyMember) => !member.user_id;

export interface PropertyContact {
  id: string;
  property_id: string;
  name: string;
  role: string;       // Ej: Fontanero
  phone: string | null;
  email: string | null;
  category: 'emergency' | 'maintenance' | 'services' | 'administrative' | 'other';
  is_protected:boolean;
  notes: string | null;
}

export interface PropertyAlert {
  id: string;
  property_id: string;
  title: string;
  message: string | null;
  type: 'info' | 'warning' | 'critical' | 'success';
  created_at: string;
  created_by?: string;
  start_date: string;  
  end_date: string | null;
}

export interface PropertyModules {
  finance: boolean;
  bookings: boolean;
  inventory: boolean;
  maintenance: boolean;
}

export interface PropertyDocument {
    id: string;
    property_id: string;
    name: string;
    category: string | null; // Puede ser null según tu SQL
    file_url: string;        // OJO: Aquí guardamos la RUTA (path), no la URL pública
    notes: string | null;
    file_type: string | null;
    file_size: number | null;
    created_at: string;
    visibility: 'public' | 'admins_only';
}