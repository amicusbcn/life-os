import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { NewLoanDialog } from './NewLoanDialog'
import { ReturnLoanButton } from './ReturnLoanButton'
import { ItemActionsMenu } from './ItemActionsMenu'

// Iconos (Mismos estilos que tu app)
import { 
  ArrowLeft, MapPin, Calendar, Tag, Wrench, 
  History, Link as LinkIcon, AlertCircle, CheckCircle2,
  FileText, ExternalLink
} from 'lucide-react'

// UI Components
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

// Componentes Placeholder (Los crearemos en el siguiente paso)
import { NewMaintenanceDialog } from './NewMaintenanceDialog'

export default async function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // 1. OBTENER DATOS (Item + Mantenimiento + Préstamos)
  const { data: item } = await supabase
    .from('inventory_items')
    .select(`
      *,
      inventory_categories ( name, icon ),
      inventory_locations ( name )
    `)
    .eq('id', id)
    .single()
  
    const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .order('full_name')
  if (!item) redirect('/inventory')

  const { data: maintenance } = await supabase
    .from('inventory_maintenance_tasks')
    .select('*, profiles(full_name)')
    .eq('item_id', id)
    .order('last_maintenance_date', { ascending: false })

  const { data: loans } = await supabase
    .from('inventory_loans')
    .select('*')
    .eq('item_id', id)
    .order('loan_date', { ascending: false })

    const { data: categories } = await supabase.from('inventory_categories').select('*').order('name')
    const { data: locations } = await supabase.from('inventory_locations').select('*').order('name')
  
  // 2. CÁLCULOS Y HELPERS
  const photoUrl = item.photo_path 
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/inventory/${item.photo_path}`
    : null

  // Garantía
  const now = new Date()
  const warrantyEnd = item.warranty_end_date ? new Date(item.warranty_end_date) : null
  const isWarrantyActive = warrantyEnd ? warrantyEnd > now : false
  const hasWarranty = !!warrantyEnd

  // Parsear Enlaces (JSONB)
  const links = Array.isArray(item.external_links) ? item.external_links : []

  return (
    <div className="min-h-screen bg-slate-100 pb-24 font-sans">
      
      {/* HEADER STICKY (Estilo Travel) */}
      <div className="bg-white sticky top-0 z-10 border-b border-slate-200 px-4 py-2 flex items-center gap-3 shadow-sm">
        <Link href="/inventory" className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-base font-bold text-slate-800 truncate flex-1">{item.name}</h1>
          {/* --- AQUÍ EL MENÚ NUEVO --- */}
        <ItemActionsMenu 
           item={item} 
           categories={categories || []} 
           locations={locations || []} 
        />
        {/* -------------------------- */}
      </div>

      <div className="max-w-3xl mx-auto p-3 space-y-4">

        {/* 1. FICHA PRINCIPAL (Estilo Resumen Travel) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Si hay foto, la mostramos arriba tipo portada */}
          {photoUrl && (
            <div className="h-48 w-full bg-slate-100 relative">
               <img src={photoUrl} alt={item.name} className="w-full h-full object-cover" />
            </div>
          )}
          
          <div className="px-4 py-3 space-y-3">
             <div className="flex justify-between items-start">
                <div>
                   <h2 className="text-lg font-bold text-slate-900">{item.model || 'Sin modelo'}</h2>
                   <p className="text-xs text-slate-500 uppercase tracking-wider">{item.serial_number}</p>
                </div>
                {item.price && (
                   <span className="text-lg font-black text-slate-800">{item.price} €</span>
                )}
             </div>

             {/* Etiquetas visuales */}
             <div className="flex flex-wrap gap-2 text-xs">
                {item.inventory_locations && (
                  <div className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md border border-indigo-100 font-medium">
                    <MapPin className="h-3.5 w-3.5" /> {item.inventory_locations.name}
                  </div>
                )}
                {item.inventory_categories && (
                  <div className="flex items-center gap-1.5 bg-slate-100 text-slate-600 px-2 py-1 rounded-md border border-slate-200">
                    <Tag className="h-3.5 w-3.5" /> {item.inventory_categories.name}
                  </div>
                )}
             </div>

             {/* Barra de Garantía */}
             {hasWarranty && (
               <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${isWarrantyActive ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                  {isWarrantyActive ? <CheckCircle2 className="h-4 w-4"/> : <AlertCircle className="h-4 w-4"/>}
                  <span className="font-semibold">
                    {isWarrantyActive ? 'Garantía Activa' : 'Garantía Expirada'}
                  </span>
                  <span className="ml-auto opacity-75">
                    Fin: {warrantyEnd.toLocaleDateString()}
                  </span>
               </div>
             )}
          </div>
          
          {/* BOTONES DE ENLACES (Manuales, Tickets) */}
          {(links.length > 0 || item.receipt_path) && (
            <div className="bg-slate-50 border-t border-slate-100 px-4 py-3 flex gap-2 overflow-x-auto">
               {/* Botón Ticket */}
               {item.receipt_path && (
                 <a 
                   href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/inventory/${item.receipt_path}`}
                   target="_blank"
                   className="flex-shrink-0 inline-flex items-center gap-1.5 bg-white shadow-sm border border-slate-200 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-700 active:scale-95 transition-transform"
                 >
                    <FileText className="h-3.5 w-3.5 text-blue-500" /> Ver Ticket
                 </a>
               )}
               {/* Botones Links Externos */}
               {links.map((link: any, i: number) => (
                  <a 
                    key={i} 
                    href={link.url} 
                    target="_blank"
                    className="flex-shrink-0 inline-flex items-center gap-1.5 bg-white shadow-sm border border-slate-200 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-700 active:scale-95 transition-transform"
                  >
                     <ExternalLink className="h-3.5 w-3.5 text-orange-500" /> {link.title}
                  </a>
               ))}
            </div>
          )}
        </div>

        {/* 2. LISTA MANTENIMIENTO (Estilo Lista Gastos) */}
        <div>
           <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1 flex items-center gap-2">
             <Wrench className="h-3.5 w-3.5" /> Mantenimiento
           </h3>
           
           <div className="space-y-2">
             {!maintenance || maintenance.length === 0 ? (
                <div className="text-center py-6 text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                  <p className="text-sm">No hay mantenimientos registrados</p>
                </div>
             ) : (
                maintenance.map((task) => (
                  <Card key={task.id} className="border-0 py-2 shadow-sm rounded-lg ring-1 ring-slate-200 bg-white">
                    <CardContent className="p-0">
                      <div className="flex min-h-[56px]">
                        {/* ICONO IZQ */}
                        <div className="w-12 flex items-center justify-center border-r border-slate-100 bg-slate-50 text-slate-400">
                           <Wrench className="h-5 w-5" />
                        </div>
                        
                        {/* CONTENIDO CENTRO */}
                        <div className="flex-1 px-3 py-2 flex flex-col justify-center">
                           <p className="font-semibold text-sm text-slate-800">{task.description}</p>
                           <div className="flex items-center gap-2 mt-0.5">
                             <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
                               {task.periodicity_days ? `Cada ${task.periodicity_days} días` : 'Puntual'}
                             </span>
                             {task.profiles && (
                               <span className="text-[10px] text-slate-400">
                                 Por: {task.profiles.full_name?.split(' ')[0]}
                               </span>
                             )}
                           </div>
                        </div>

                        {/* FECHA DCHA */}
                        <div className="px-3 py-2 flex flex-col justify-center items-end border-l border-slate-50 min-w-[80px]">
                           <span className="text-xs font-bold text-slate-700">
                             {task.last_maintenance_date ? new Date(task.last_maintenance_date).toLocaleDateString() : '-'}
                           </span>
                           <span className="text-[10px] text-slate-400">Última vez</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
             )}
           </div>
        </div>

        {/* 3. LISTA PRÉSTAMOS (Mismo estilo) */}
        <div className="pb-4">
           <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1 flex items-center gap-2">
             <History className="h-3.5 w-3.5" /> Historial Préstamos
           </h3>
           
<div className="space-y-2">
             {loans && loans.map((loan) => {
               const isReturned = !!loan.return_date
               return (
                  <Card key={loan.id} className={`border-0 py-2 shadow-sm rounded-lg ring-1 ${isReturned ? 'ring-slate-200 bg-white opacity-70' : 'ring-orange-200 bg-orange-50'}`}>
                    <CardContent className="p-0">
                      <div className="flex min-h-[50px]">
                        {/* Icono */}
                        <div className={`w-12 flex items-center justify-center border-r ${isReturned ? 'border-slate-100 bg-slate-50 text-slate-400' : 'border-orange-100 bg-orange-100 text-orange-600'}`}>
                           <History className="h-5 w-5" />
                        </div>
                        
                        {/* Info */}
                        <div className="flex-1 px-3 py-2 flex flex-col justify-center">
                           <p className={`font-semibold text-sm ${isReturned ? 'text-slate-700' : 'text-slate-900'}`}>{loan.borrower_name}</p>
                           <p className="text-[10px] text-slate-500">
                             {new Date(loan.loan_date).toLocaleDateString()} 
                             {loan.return_date ? ` ➔ ${new Date(loan.return_date).toLocaleDateString()}` : ' (En curso)'}
                           </p>
                        </div>
                        
                        {/* Botón Acción o Badge */}
                        <div className="px-3 py-2 flex items-center justify-end min-w-[90px]">
                           {!isReturned ? (
                             // Si está activo, mostramos botón para devolver
                             <ReturnLoanButton loanId={loan.id} itemId={id} />
                           ) : (
                             // Si ya se devolvió, solo el badge
                             <Badge variant="outline" className="text-[10px] h-6 bg-slate-50">
                               Devuelto
                             </Badge>
                           )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
               )
             })}
           </div>
        </div>

      </div>

      {/* BARRA INFERIOR FIJA */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white border-t border-slate-200 z-20 safe-area-bottom shadow-lg">
         <div className="max-w-3xl mx-auto flex gap-2 ...">
            <div className="flex-1">
               {/* 2. PASAR LOS PROFILES AL DIÁLOGO AQUÍ: */}
               <NewMaintenanceDialog 
                  itemId={id} 
                  profiles={profiles || []} 
               />
            </div>
            <NewLoanDialog itemId={id} />
         </div>
      </div>

    </div>
  )
}