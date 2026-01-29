// app/inventory/page.tsx
import { getUserData } from '@/utils/security';
import { UnifiedAppSidebar } from '@/components/layout/UnifiedAppSidebar';
import { InventoryListView } from './components/InventoryListView';
import { InventoryMenu } from './components/InventoryMenu';
import { createClient } from '@/utils/supabase/server';

export default async function InventoryPage() {
  // 1. Seguridad centralizada
  const { profile, accessibleModules } = await getUserData('inventory');

  const supabase = await createClient();

  // 2. Carga paralela de datos (Categorías, Ubicaciones e Ítems)
  const [
    { data: categories },
    { data: locations },
    { data: items }
  ] = await Promise.all([
    supabase.from('inventory_categories').select('id, name, icon').order('name'),
    supabase.from('inventory_locations').select('id, name, parent_id').order('name'),
    supabase.from('inventory_items').select(`
      *,
      inventory_categories ( name, icon ),
      inventory_locations ( name )
    `).order('created_at', { ascending: false })
  ]);

  return (
    <UnifiedAppSidebar
      title="Inventario"
      profile={profile}
      modules={accessibleModules}
      moduleMenu={
        <InventoryMenu 
          mode="operative"
          categories={categories || []} 
          locations={locations || []} 
        />
      }
      // Inyectamos la configuración de maestros en el pie
      moduleSettings={
        <InventoryMenu 
          mode="settings"
          categories={categories || []} 
          locations={locations || []} 
        />
      }
    >
      <main className="max-w-xl mx-auto">
        <InventoryListView 
          items={items || []} 
          categories={categories || []}
          locations={locations || []}
        />
      </main>
    </UnifiedAppSidebar>
  );
}