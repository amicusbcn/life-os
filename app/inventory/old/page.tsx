// app/inventory/[id]/page.tsx
import { createClient } from '@/utils/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getUserData } from '@/utils/security'
import { UnifiedAppSidebar } from '@/components/layout/UnifiedAppSidebar'

// Componentes Locales
import { ReturnLoanButton } from './ReturnLoanButton'
import { ItemActionsMenu } from './components/ItemActionsMenu'
import { MaintenanceCard } from './MaintenanceCard'

// Tipos
import { InventoryLink, InventoryItem } from '@/types/inventory' 

// Iconos
import { MapPin, Tag, Wrench, History, AlertCircle, CheckCircle2, FileText, ExternalLink } from 'lucide-react'

// UI Components
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface FullInventoryItem extends InventoryItem {
    inventory_categories: { name: string, icon: string } | null;
    inventory_locations: { name: string } | null;
}

export default async function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    
    // 1. Seguridad centralizada y perfil
    const { profile, accessibleModules } = await getUserData('inventory')
    const supabase = await createClient()

    // 2. Obtención de datos paralela
    const [
        { data: item, error: itemError },
        { data: maintenance },
        { data: loans },
        { data: profiles },
        { data: categories },
        { data: locations }
    ] = await Promise.all([
        supabase.from('inventory_items').select(`
            *,
            inventory_categories ( name, icon ),
            inventory_locations ( name )
        `).eq('id', id).single(),
        
        supabase.from('inventory_maintenance_tasks')
            .select('*, profiles(full_name)')
            .eq('item_id', id)
            .order('last_maintenance_date', { ascending: false }),

        supabase.from('inventory_loans')
            .select('*')
            .eq('item_id', id)
            .order('loan_date', { ascending: false }),

        supabase.from('profiles').select('id, full_name').order('full_name'),
        supabase.from('inventory_categories').select('*').order('name'),
        supabase.from('inventory_locations').select('*').order('name')
    ])

    if (itemError || !item) notFound()

    // 3. Cálculos y Helpers
    const photoUrl = item.photo_path 
        ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/inventory/${item.photo_path}`
        : null

    const now = new Date()
    const warrantyEnd = item.warranty_end_date ? new Date(item.warranty_end_date) : null
    const isWarrantyActive = warrantyEnd ? warrantyEnd > now : false
    const hasWarranty = !!warrantyEnd
    const links = (Array.isArray(item.external_links) ? item.external_links : []) as InventoryLink[]

    return (
        <UnifiedAppSidebar
            title={item.name}
            profile={profile}
            modules={accessibleModules}
            backLink="/inventory"
            // Operativa: Registrar Mantenimiento y Nuevo Préstamo
            moduleMenu={
                <ItemActionsMenu 
                    mode="operative"
                    item={item} 
                    profiles={profiles || []}
                />
            }
            // Ajustes: Editar y Eliminar ítem
            moduleSettings={
                <ItemActionsMenu 
                    mode="settings"
                    item={item} 
                    categories={categories || []}
                    locations={locations || []}
                />
            }
        >
            <div className="max-w-3xl mx-auto space-y-6">

                {/* 1. FICHA PRINCIPAL */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    {photoUrl && (
                        <div className="h-64 w-full bg-slate-100 relative group overflow-hidden">
                             <img 
                                 src={photoUrl} 
                                 alt={item.name} 
                                 className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                             />
                        </div>
                    )}
                    
                    <div className="px-5 py-5 space-y-4">
                         <div className="flex justify-between items-start gap-4">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 leading-tight">
                                        {item.model || <span className="text-slate-400 font-normal italic">Modelo no especificado</span>}
                                    </h2>
                                    {item.serial_number && (
                                        <p className="text-xs font-mono text-slate-500 mt-2 bg-slate-100 inline-block px-1.5 py-0.5 rounded">
                                            S/N: {item.serial_number}
                                        </p>
                                    )}
                                </div>
                                {item.price && (
                                     <div className="text-right shrink-0">
                                            <span className="block text-3xl font-black text-slate-800 tracking-tight">
                                                {item.price.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                                            </span>
                                     </div>
                                )}
                         </div>

                         <div className="flex flex-wrap gap-2">
                                {item.inventory_locations && (
                                    <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-100 font-bold px-3 py-1">
                                        <MapPin className="h-3.5 w-3.5 mr-1.5" /> 
                                        {item.inventory_locations.name}
                                    </Badge>
                                )}
                                {item.inventory_categories && (
                                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 px-3 py-1 font-bold">
                                        <Tag className="h-3.5 w-3.5 mr-1.5" /> 
                                        {item.inventory_categories.name}
                                    </Badge>
                                )}
                         </div>

                         {hasWarranty && (
                             <div className={`flex items-center gap-3 text-sm px-4 py-3 rounded-xl border ${
                                 isWarrantyActive 
                                     ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                                     : 'bg-rose-50 border-rose-100 text-rose-800'
                             }`}>
                                    {isWarrantyActive ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600"/> : <AlertCircle className="h-5 w-5 shrink-0 text-rose-600"/>}
                                    <div className="flex-1">
                                        <p className="font-bold">
                                            {isWarrantyActive ? 'Garantía Vigente' : 'Garantía Expirada'}
                                        </p>
                                        <p className="text-xs opacity-80 mt-0.5">
                                            Hasta el {warrantyEnd?.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </p>
                                    </div>
                             </div>
                         )}
                    </div>
                    
                    {(links.length > 0 || item.receipt_path) && (
                        <div className="bg-slate-50 border-t border-slate-100 px-5 py-3 flex gap-2 overflow-x-auto no-scrollbar">
                             {item.receipt_path && (
                                 <a 
                                     href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/inventory/${item.receipt_path}`}
                                     target="_blank" rel="noopener noreferrer"
                                     className="flex-shrink-0 inline-flex items-center gap-2 bg-white shadow-sm border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-blue-600 transition-all active:scale-95"
                                 >
                                        <FileText className="h-4 w-4 text-blue-500" /> Ver Ticket
                                 </a>
                             )}
                             {links.map((link, i) => (
                                    <a 
                                        key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                                        className="flex-shrink-0 inline-flex items-center gap-2 bg-white shadow-sm border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-orange-600 transition-all active:scale-95"
                                    >
                                         <ExternalLink className="h-4 w-4 text-orange-500" /> {link.title}
                                    </a>
                             ))}
                        </div>
                    )}
                </div>

                {/* 2. SECCIÓN MANTENIMIENTO */}
                <section className="space-y-3 pt-2">
                     <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                         <Wrench className="h-3.5 w-3.5" /> Historial de Mantenimiento
                     </h3>
                     
                     <div className="space-y-3">
                         {!maintenance || maintenance.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
                                    <Wrench className="h-8 w-8 opacity-10 mb-2" />
                                    <p className="text-xs font-bold tracking-tight">Sin registros de mantenimiento</p>
                                </div>
                         ) : (
                                maintenance.map((task) => (
                                    <MaintenanceCard 
                                            key={task.id} 
                                            task={task} 
                                            profiles={profiles || []} 
                                    />
                                ))
                         )}
                     </div>
                </section>

                {/* 3. SECCIÓN PRÉSTAMOS */}
                <section className="space-y-3">
                     <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                         <History className="h-3.5 w-3.5" /> Historial de Préstamos
                     </h3>
                     
                     <div className="space-y-3">
                         {loans?.map((loan) => {
                             const isReturned = !!loan.return_date
                             return (
                                 <Card key={loan.id} className={`border-0 shadow-sm rounded-2xl ring-1 transition-all ${isReturned ? 'ring-slate-100 bg-white opacity-60' : 'ring-orange-200 bg-orange-50/50'}`}>
                                     <CardContent className="p-0 flex min-h-[64px]">
                                         <div className={`w-14 flex items-center justify-center border-r ${isReturned ? 'border-slate-100 bg-slate-50 text-slate-400' : 'border-orange-100 bg-orange-100 text-orange-600'}`}>
                                             <History className="h-5 w-5" />
                                         </div>
                                         <div className="flex-1 px-4 py-3 flex flex-col justify-center">
                                             <p className={`font-bold text-sm ${isReturned ? 'text-slate-600' : 'text-slate-900'}`}>
                                                 {loan.borrower_name}
                                             </p>
                                             <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                                                 Desde: {new Date(loan.loan_date).toLocaleDateString('es-ES')} 
                                             </p>
                                         </div>
                                         <div className="pr-4 flex items-center">
                                             {!isReturned ? (
                                                 <ReturnLoanButton loanId={loan.id} itemId={id} />
                                             ) : (
                                                 <div className="text-right">
                                                     <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Devuelto</div>
                                                     <div className="text-[11px] font-bold text-slate-600">{new Date(loan.return_date).toLocaleDateString('es-ES')}</div>
                                                 </div>
                                             )}
                                         </div>
                                     </CardContent>
                                 </Card>
                             )
                         })}
                         {(!loans || loans.length === 0) && (
                                <p className="text-center text-[11px] text-slate-400 py-6 italic font-medium">No hay historial de préstamos para este objeto.</p>
                         )}
                     </div>
                </section>
            </div>
        </UnifiedAppSidebar>
    )
}