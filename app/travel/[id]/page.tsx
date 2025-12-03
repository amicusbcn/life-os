import { createClient } from '@/utils/supabase/server'
import { NewExpenseDialog } from '../NewExpenseDialog'
import { EditExpenseDialog } from '../EditExpenseDialog'
import { QuickReceiptUpload } from './QuickReceiptUpload'
import { TripStatusSelector } from './TripStatusSelector'
import { toggleReceiptWaived, togglePersonalAccounting } from '../actions' // <--- IMPORT NUEVO
import { CategoryIcon } from '@/utils/icon-map'
import Link from 'next/link'
import { ArrowLeft, MapPin, Calendar, Paperclip, AlertCircle, Ban, CheckCircle2, Wallet } from 'lucide-react' // <--- Wallet IMPORTADO
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { redirect } from 'next/navigation'

export default async function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const tripId = id
  const supabase = await createClient()

  const { data: trip } = await supabase.from('travel_trips').select('*, travel_employers(name)').eq('id', tripId).single()
  if (!trip) redirect('/travel')

  const { data: categories } = await supabase.from('travel_categories').select('*').order('name')
  const { data: expenses } = await supabase.from('travel_expenses').select('*').eq('trip_id', tripId).order('date', { ascending: false })

  const totalAmount = expenses?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0
  const isClosed = trip.status === 'closed'

  // VALIDACIÓN
  const pendingCount = expenses?.filter(e => {
     const isMileage = categories?.find(c => c.id === e.category_id)?.is_mileage
     return !isMileage && !e.receipt_url && !e.receipt_waived
  }).length || 0
  const hasPendingReceipts = pendingCount > 0

  // AGRUPACIÓN
  const groupedExpenses = expenses?.reduce((acc: any, expense) => {
    const dateKey = expense.date 
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(expense)
    return acc
  }, {})
  const sortedDates = Object.keys(groupedExpenses || {}).sort((a, b) => b.localeCompare(a))

  return (
    <div className="min-h-screen bg-slate-100 pb-24 font-sans">
      
      {/* HEADER */}
      <div className="bg-white sticky top-0 z-10 border-b border-slate-200 px-4 py-2 flex items-center gap-3 shadow-sm">
        <Link href="/travel" className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-base font-bold text-slate-800 truncate flex-1">{trip.name}</h1>
        <div className="scale-90 origin-right">
          <TripStatusSelector trip={trip} hasPendingReceipts={hasPendingReceipts} />
        </div>
      </div>
      
      <div className="max-w-3xl mx-auto p-3 space-y-4">
        
        {/* RESUMEN */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 space-y-2">
            <div className="flex flex-col gap-1.5 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-indigo-500" />
                <span className="font-medium text-slate-900">{(trip.travel_employers as any)?.name}</span>
              </div>
              <div className="flex items-center gap-2">
                 <Calendar className="h-3.5 w-3.5 text-orange-500" />
                <span>
                  {new Date(trip.start_date).toLocaleDateString()} - {new Date(trip.end_date).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          <div className="bg-slate-50 border-t border-slate-100 px-4 py-2 flex justify-between items-center">
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total</span>
             <span className="text-xl font-black text-slate-800">{totalAmount.toFixed(2)} €</span>
          </div>
        </div>

        {/* LISTADO */}
        <div className="space-y-6">
          {(!expenses || expenses.length === 0) ? (
            <div className="text-center py-10 text-slate-400 bg-white rounded-xl border border-dashed mx-2">
              <p className="text-sm">Sin gastos todavía</p>
            </div>
          ) : (
            sortedDates.map((dateKey) => (
              <div key={dateKey}>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1 sticky top-14 z-0">
                  {new Date(dateKey).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>

                <div className="space-y-2">
                  {groupedExpenses[dateKey].map((expense: any) => {
                     const category = categories?.find(c => c.id === expense.category_id)
                     const isMileage = category?.is_mileage
                     const isMissing = !isMileage && !expense.receipt_url && !expense.receipt_waived

                     return (
                      <Card 
                        key={expense.id} 
                        className={`
                          border-0 py-3 shadow-sm rounded-lg overflow-hidden transition-all
                          ${isClosed ? 'opacity-90' : ''} 
                          ${isMissing ? 'ring-1 ring-orange-300 bg-orange-50/30' : 'ring-1 ring-slate-200 bg-white'} 
                        `}
                      >
                        <CardContent>
                          <div className="flex min-h-[64px]"> 
                            
                            {/* ICONO IZQUIERDA */}
                            <div className={`w-14 flex items-center justify-center border-r 
                              ${isMissing ? 'border-orange-100 bg-orange-100/50' : 'border-slate-100'} 
                              ${isClosed && !isMissing ? 'bg-slate-100' : ''}
                              ${!isClosed && !isMissing ? 'bg-indigo-50/50' : ''}
                            `}>
                              {isMissing ? (
                                <AlertCircle className="h-6 w-6 text-orange-500 animate-pulse" />
                              ) : (
                                <CategoryIcon name={category?.icon_key} className="h-6 w-6 text-indigo-500" />
                              )}
                            </div>
                            
                            {/* DATOS CENTRO */}
                            <div className="flex-1 px-3 py-2 flex flex-col justify-center min-w-0">
                              <div className="flex justify-between items-start mb-0.5">
                                 <p className={`font-semibold text-sm truncate pr-2 ${isClosed ? 'text-slate-600' : 'text-slate-900'}`}>
                                   {expense.concept}
                                 </p>
                                 <p className="font-bold text-slate-900 whitespace-nowrap text-sm">
                                   {expense.amount.toFixed(2)} €
                                 </p>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                 <span className="text-[10px] font-medium text-slate-500">{category?.name}</span>
                                 {isMileage && (
                                    <span className="text-[10px] bg-slate-100 text-slate-500 px-1 py-px rounded border border-slate-200">
                                      {expense.mileage_distance} km
                                    </span>
                                 )}
                                 {!expense.is_reimbursable && (
                                   <span className="text-[10px] bg-yellow-50 text-yellow-700 px-1 py-px rounded border border-yellow-200">
                                     Empresa
                                   </span>
                                 )}
                                 {expense.receipt_waived && !isMileage && !expense.receipt_url && (
                                   <span className="text-[10px] flex items-center gap-1 text-slate-400 px-1 py-px">
                                     <Ban className="h-3 w-3" /> Sin ticket (OK)
                                   </span>
                                 )}
                              </div>
                            </div>
                          </div>

                          {/* BARRA INFERIOR DE ACCIONES */}
                          <div className={`border-t flex items-center justify-between px-2 py-1.5 h-10 ${isMissing ? 'bg-orange-50 border-orange-100' : 'bg-white border-slate-100'}`}>
                             
                             <div className="flex-1 flex items-center gap-2">
                               
                               {/* --- NUEVO: CHECK CONTABILIDAD (Siempre visible, izquierda) --- */}
                               <form>
                                 <Button 
                                    formAction={async () => {
                                      'use server'
                                      await togglePersonalAccounting(expense.id, tripId, expense.personal_accounting_checked)
                                    }}
                                    variant="ghost" size="icon" 
                                    className="h-7 w-7 hover:bg-slate-100"
                                    title="Marcar como revisado en contabilidad personal"
                                 >
                                    <Wallet className={`h-4 w-4 transition-colors ${expense.personal_accounting_checked ? 'text-emerald-500 fill-emerald-50' : 'text-slate-300'}`} />
                                 </Button>
                               </form>
                               {/* ------------------------------------------------------------- */}

                               <div className="h-4 w-px bg-slate-200 mx-1" /> {/* Separador */}

                               {isMileage ? (
                                 <span className="text-[10px] text-slate-300 italic">No requiere ticket</span>
                               ) : (
                                 <>
                                   {expense.receipt_url && (
                                      <a href={expense.receipt_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1 rounded-md text-xs font-semibold border border-indigo-100">
                                        <Paperclip className="h-3 w-3" /> Ticket
                                      </a>
                                   )}

                                   {!expense.receipt_url && !isClosed && (
                                      <>
                                        {!expense.receipt_waived && (
                                           <QuickReceiptUpload expenseId={expense.id} tripId={tripId} />
                                        )}
                                        <form>
                                           <Button 
                                             formAction={async () => {
                                               'use server'
                                               await toggleReceiptWaived(expense.id, tripId, expense.receipt_waived)
                                             }}
                                             variant="ghost" size="sm" 
                                             className={`h-7 px-2 text-[10px] ${expense.receipt_waived ? 'text-green-600 hover:text-green-700 hover:bg-green-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                                           >
                                             {expense.receipt_waived ? (
                                                <><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Justificado</>
                                             ) : (
                                                <><Ban className="h-3.5 w-3.5 mr-1" /> Omitir</>
                                             )}
                                           </Button>
                                        </form>
                                      </>
                                   )}
                                   
                                   {!expense.receipt_url && isClosed && !expense.receipt_waived && (
                                      <span className="text-[10px] text-red-400 font-bold">FALTA TICKET</span>
                                   )}
                                 </>
                               )}
                             </div>

                             {!isClosed && (
                                <div className="-mr-1">
                                  <EditExpenseDialog expense={expense} categories={categories || []} />
                                </div>
                             )}
                          </div>
                        </CardContent>
                      </Card>
                     )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {!isClosed && (
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-white border-t border-slate-200 z-20 safe-area-bottom shadow-lg">
           <div className="max-w-3xl mx-auto [&>button]:w-full [&>button]:h-11 [&>button]:text-base [&>button]:font-bold [&>button]:shadow-sm">
              <NewExpenseDialog tripId={tripId} categories={categories || []} />
           </div>
        </div>
      )}
    </div>
  )
}