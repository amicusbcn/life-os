import { 
  Car, 
  Bed, 
  Utensils, 
  Bus, // Nuevo (Billetes/Bus)
  CircleParking, // Nuevo (La P de Parking)
  CarTaxiFront, // Nuevo (Taxi)
  ShoppingBag, 
  HelpCircle 
} from 'lucide-react'

// Mapa de iconos disponibles
// La clave (izquierda) es lo que guardaremos en la Base de Datos
export const CategoryIcons: Record<string, any> = {
  'Car': Car,
  'Bed': Bed,
  'Utensils': Utensils,
  'Bus': Bus,         // Usaremos la clave 'Bus' para Billetes
  'Parking': CircleParking, // Usaremos la clave 'Parking'
  'Taxi': CarTaxiFront,     // Usaremos la clave 'Taxi'
  'ShoppingBag': ShoppingBag,
}

export function CategoryIcon({ name, className }: { name?: string, className?: string }) {
  const IconComponent = CategoryIcons[name || ''] || HelpCircle
  return <IconComponent className={className} />
}