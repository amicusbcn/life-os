import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'

// Componentes Locales
import { NewLoanDialog } from './NewLoanDialog'
import { ReturnLoanButton } from './ReturnLoanButton'
import { ItemActionsMenu } from './ItemActionsMenu'
import { NewMaintenanceDialog } from './NewMaintenanceDialog'
import { MaintenanceCard } from './MaintenanceCard'

// Tipos
import { InventoryLink } from '@/types/inventory'

// Iconos
import { 
  ArrowLeft, MapPin, Tag, Wrench, 
  History, AlertCircle, CheckCircle2,
  FileText, ExternalLink
} from 'lucide-react'

// UI Components
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default async function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // En Next.js 15 params es una promesa, en 14 no necesariamente, 
  // pero esta sintaxis es future-proof.
  const { id } = await params
  const supabase = await createClient()

  // 1. OBTENCIÓN DE DATOS PARALELA (Optimización de Rendimiento)
  const [
    { data: item, error: itemError },
    { data: maintenance },
    { data: loans },
    { data: profiles },
    { data: categories },
    { data: locations }
  ] = await Promise.all([
    // A. Item principal
    supabase.from('inventory_items').select(`
      *,
      inventory_categories ( name, icon ),
      inventory_locations ( name )
    `).eq('id', id).single(),
    
    // B. Mantenimiento
    supabase.from('inventory_maintenance_tasks')
      .select('*, profiles(full_name)')
      .eq('item_id', id)
      .order('last_maintenance_date', { ascending: false }),

    // C. Préstamos
    supabase.from('inventory_loans')
      .select('*')
      .eq('item_id', id)
      .order('loan_date', { ascending: false }),

    // D. Perfiles (para el diálogo de mantenimiento)
    supabase.from('profiles').select('id, full_name').order('full_name'),

    // E. Configuración (para editar item)
    supabase.from('inventory_categories').select('*').order('name'),
    supabase.from('inventory_locations').select('*').order('name')
  ])

  if (itemError || !item) redirect('/inventory')

  // 2. CÁLCULOS Y HELPERS
  // URL Foto (Storage)
  const photoUrl = item.photo_path 
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/inventory/${item.photo_path}`
    : null

  // Garantía
  const now = new Date()
  const warrantyEnd = item.warranty_end_date ? new Date(item.warranty_end_date) : null
  const isWarrantyActive = warrantyEnd ? warrantyEnd > now : false
  const hasWarranty = !!warrantyEnd

  // Enlaces (Tipado seguro)
  // Supabase devuelve JSONB como 'any' a veces, forzamos el tipo aquí
  const links = (Array.isArray(item.external_links) ? item.external_links : []) as InventoryLink[]

  return (
    <div className="min-h-screen bg-slate-100 pb-28 font-sans">
      
      {/* HEADER STICKY */}
      <div className="bg-white/80 backdrop-blur-md sticky top-0 z-10 border-b border-slate-200 px-4 py-3 flex items-center gap-3 shadow-sm safe-area-top">
        <Link href="/inventory" className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-base font-bold text-slate-800 truncate flex-1 leading-tight">
            {item.name}
        </h1>
        
        {/* Menú de Acciones (Editar/Borrar) */}
        <ItemActionsMenu 
           item={item} 
           categories={categories || []} 
           locations={locations || []} 
        />
      </div>

      <div className="max-w-3xl mx-auto p-4 space-y-6">

        {/* 1. FICHA PRINCIPAL */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Foto Portada */}
          {photoUrl && (
            <div className="h-56 w-full bg-slate-100 relative group cursor-pointer">
               {/* Aquí podrías poner un componente <Image> de Next.js optimizado si quisieras */}
               <img 
                 src={photoUrl} 
                 alt={item.name} 
                 className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
               />
               {/* Overlay degradado para texto sobre imagen si fuera necesario */}
               <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}
          
          <div className="px-5 py-4 space-y-4">
             <div className="flex justify-between items-start gap-4">
                <div>
                   <h2 className="text-xl font-bold text-slate-900 leading-tight">
                     {item.model || <span className="text-slate-400 italic font-normal">Sin modelo especificado</span>}
                   </h2>
                   {item.serial_number && (
                     <p className="text-xs font-mono text-slate-500 mt-1 bg-slate-100 inline-block px-1.5 py-0.5 rounded">
                       S/N: {item.serial_number}
                     </p>
                   )}
                </div>
                {item.price && (
                   <div className="text-right shrink-0">
                      <span className="block text-2xl font-black text-slate-800 tracking-tight">
                        {item.price.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                      </span>
                   </div>
                )}
             </div>

             {/* Etiquetas (Pills) */}
             <div className="flex flex-wrap gap-2 text-sm">
                {item.inventory_locations && (
                  <div className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-100 font-medium transition-colors hover:bg-indigo-100">
                    <MapPin className="h-3.5 w-3.5" /> 
                    {item.inventory_locations.name}
                  </div>
                )}
                {item.inventory_categories && (
                  <div className="flex items-center gap-1.5 bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full border border-slate-200 font-medium">
                    <Tag className="h-3.5 w-3.5" /> 
                    {item.inventory_categories.name}
                  </div>
                )}
             </div>

             {/* Estado Garantía */}
             {hasWarranty && (
               <div className={`flex items-center gap-3 text-sm px-4 py-3 rounded-xl border ${
                 isWarrantyActive 
                   ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                   : 'bg-rose-50 border-rose-100 text-rose-800'
               }`}>
                  {isWarrantyActive ? <CheckCircle2 className="h-5 w-5 shrink-0"/> : <AlertCircle className="h-5 w-5 shrink-0"/>}
                  <div className="flex-1">
                    <p className="font-bold">
                      {isWarrantyActive ? 'Garantía Vigente' : 'Garantía Expirada'}
                    </p>
                    <p className="text-xs opacity-80 mt-0.5">
                      Válida hasta el {warrantyEnd?.toLocaleDateString()}
                    </p>
                  </div>
               </div>
             )}
          </div>
          
          {/* Footer de Enlaces / Documentos */}
          {(links.length > 0 || item.receipt_path) && (
            <div className="bg-slate-50/80 border-t border-slate-100 px-5 py-3 flex gap-2 overflow-x-auto no-scrollbar">
               {/* Ticket de Compra */}
               {item.receipt_path && (
                 <a 
                   href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/inventory/${item.receipt_path}`}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="flex-shrink-0 inline-flex items-center gap-2 bg-white shadow-sm border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-blue-600 hover:border-blue-200 active:scale-95 transition-all"
                 >
                    <FileText className="h-4 w-4 text-blue-500" /> Ticket Compra
                 </a>
               )}
               {/* Links Externos */}
               {links.map((link, i) => (
                  <a 
                    key={i} 
                    href={link.url} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 inline-flex items-center gap-2 bg-white shadow-sm border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-orange-600 hover:border-orange-200 active:scale-95 transition-all"
                  >
                     <ExternalLink className="h-4 w-4 text-orange-500" /> {link.title}
                  </a>
               ))}
            </div>
          )}
        </div>

{/* 2. SECCIÓN MANTENIMIENTO */}
        <div>
           <div className="flex items-center justify-between mb-3 px-1">
             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
               <Wrench className="h-3.5 w-3.5" /> Mantenimiento
             </h3>
           </div>
           
           <div className="space-y-3">
             {!maintenance || maintenance.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                  <Wrench className="h-8 w-8 opacity-20 mb-2" />
                  <p className="text-sm font-medium">Sin registros</p>
                </div>
             ) : (
                maintenance.map((task) => (
                  // Usamos el nuevo componente interactivo
                  // Importante: Importa MaintenanceCard arriba
                  <MaintenanceCard 
                      key={task.id} 
                      task={task} 
                      profiles={profiles || []} 
                  />
                ))
             )}
           </div>
        </div>

        {/* 3. SECCIÓN PRÉSTAMOS */}
        <div className="pb-4">
           <div className="flex items-center justify-between mb-3 px-1">
             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
               <History className="h-3.5 w-3.5" /> Historial Préstamos
             </h3>
           </div>
           
           <div className="space-y-3">
             {loans && loans.map((loan) => {
               const isReturned = !!loan.return_date
               return (
                  <Card key={loan.id} className={`border-0 shadow-sm rounded-xl ring-1 overflow-hidden transition-all ${isReturned ? 'ring-slate-100 bg-white opacity-80' : 'ring-orange-200 bg-orange-50/50'}`}>
                    <CardContent className="p-0 flex min-h-[64px]">
                      {/* Icono */}
                      <div className={`w-14 flex items-center justify-center border-r ${isReturned ? 'border-slate-100 bg-slate-50 text-slate-400' : 'border-orange-100 bg-orange-100 text-orange-600'}`}>
                         <History className="h-5 w-5" />
                      </div>
                      
                      {/* Info */}
                      <div className="flex-1 px-4 py-3 flex flex-col justify-center">
                         <p className={`font-semibold text-sm ${isReturned ? 'text-slate-700' : 'text-slate-900'}`}>
                           {loan.borrower_name}
                         </p>
                         <p className="text-[11px] text-slate-500 mt-0.5">
                           Desde: {new Date(loan.loan_date).toLocaleDateString()} 
                         </p>
                         {loan.notes && !isReturned && (
                            <p className="text-[11px] text-orange-600/80 italic mt-1 line-clamp-1">"{loan.notes}"</p>
                         )}
                      </div>
                      
                      {/* Acción */}
                      <div className="pr-3 pl-2 flex items-center justify-end">
                         {!isReturned ? (
                           <ReturnLoanButton loanId={loan.id} itemId={id} />
                         ) : (
                           <div className="text-right px-2">
                             <div className="text-[10px] font-medium text-slate-400 uppercase">Devuelto</div>
                             <div className="text-xs text-slate-600">{new Date(loan.return_date).toLocaleDateString()}</div>
                           </div>
                         )}
                      </div>
                    </CardContent>
                  </Card>
               )
             })}
             {(!loans || loans.length === 0) && (
                <p className="text-center text-xs text-slate-400 py-4 italic">No hay historial de préstamos.</p>
             )}
           </div>
        </div>

      </div>

      {/* BARRA INFERIOR FIJA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 z-30 safe-area-bottom shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
         <div className="max-w-3xl mx-auto flex gap-3">
            <div className="flex-1">
               <NewMaintenanceDialog 
                  itemId={id} 
                  profiles={profiles || []} 
               />
            </div>
            <div className="flex-1">
                <NewLoanDialog itemId={id} />
            </div>
         </div>
      </div>

    </div>
  )
}