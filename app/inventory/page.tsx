// app/inventory/page.tsx
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { ArrowLeft } from 'lucide-react'

// Componentes Locales
// Asegúrate de que los nombres de archivo coinciden mayúsculas/minúsculas
import { InventorySettingsDialog } from './components/InventorySettingsDialog'
import { InventoryListView } from './components/InventoryListView'
import { NewItemDialog } from './components/NewItemDialog'
import { UnifiedAppHeader } from '@/app/core/components/UnifiedAppHeader'; 
import { InventoryMenu } from './components/InventoryMenu';

// ¡ESTA LÍNEA ES LA CLAVE! Debe ser 'export default' y 'async'
export default async function InventoryPage() {
  const supabase = await createClient()
  // 🚨 NUEVO: Obtener el usuario y el perfil
	const { data: { user } } = await supabase.auth.getUser();
	const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single();
	const userRole = profile?.role || 'user'; // Asumimos 'user' si no hay perfil
  // 1. Obtener Categorías
  const { data: categories } = await supabase
    .from('inventory_categories')
    .select('id, name, icon')
    .order('name')

  // 2. Obtener Ubicaciones
  const { data: locations } = await supabase
    .from('inventory_locations')
    .select('id, name, parent_id')
    .order('name')

  // 3. Obtener Items
  const { data: items } = await supabase
    .from('inventory_items')
    .select(`
      *,
      inventory_categories ( name, icon ),
      inventory_locations ( name )
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-slate-100 font-sans pb-24">
      
      {/* HEADER SUPERIOR */}
      <UnifiedAppHeader
      				title="Inventario"
      				backHref="/"
      				userEmail={user?.email || ''} // Usamos el usuario obtenido
      				userRole={userRole}
      				maxWClass='max-w-xl'
      				moduleMenu={
      						<InventoryMenu 
      								categories={categories || []} 
      								locations={locations || []} 
      						/>
      				}
      			/>

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-xl mx-auto p-4">
        <InventoryListView 
          items={items || []} 
          categories={categories || []}
          locations={locations || []}
        />
      </main>

      {/* BARRA INFERIOR */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 z-20 safe-area-bottom shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
         <div className="max-w-xl mx-auto">
            <NewItemDialog 
              categories={categories || []} 
              locations={locations || []} 
            />
         </div>
      </div>

    </div>
  )
}