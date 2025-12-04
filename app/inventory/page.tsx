import { createClient } from '@/utils/supabase/server'
import { InventoryListView } from './InventoryListView'
import { NewItemDialog } from './NewItemDialog'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { ArrowLeft } from 'lucide-react'

export default async function InventoryPage() {
  const supabase = await createClient()

  // 1. Obtener Categorías (para pasar al diálogo y a los filtros)
  const { data: categories } = await supabase
    .from('inventory_categories')
    .select('id, name, icon')
    .order('name')

  // 2. Obtener Ubicaciones (para pasar al diálogo)
  const { data: locations } = await supabase
    .from('inventory_locations')
    .select('id, name')
    .order('name')

  // 3. Obtener Items (el inventario en sí)
  // Hacemos el join para traer el nombre de la categoría y ubicación
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
      <div className="sticky top-0 z-10 bg-slate-100/90 backdrop-blur-sm border-b border-slate-200/50 px-4 py-3 shadow-sm">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-200 -ml-2 rounded-full">
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-slate-800">Inventario</h1>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-xl mx-auto p-4">
        <InventoryListView 
          items={items || []} 
          categories={categories || []}
          locations={locations || []}
        />
      </main>

      {/* BARRA INFERIOR FIJA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 z-20 safe-area-bottom shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
         <div className="max-w-xl mx-auto">
            {/* Pasamos categorías y ubicaciones para el desplegable del formulario */}
            <NewItemDialog 
              categories={categories || []} 
              locations={locations || []} 
            />
         </div>
      </div>

    </div>
  )
}