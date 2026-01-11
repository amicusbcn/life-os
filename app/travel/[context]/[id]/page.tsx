// app/travel/[context]/[id]/page.tsx

import { 
  getTripDetails, 
  getTripExpenses, 
  getTravelCategories, 
  getMileageTemplates 
} from '@/app/travel/data'
import { NewExpenseDialog } from '@/app/travel/components/dialogs/NewExpenseDialog'
import { EditExpenseDialog } from '@/app/travel/components/dialogs/EditExpenseDialog'
import { QuickReceiptUpload } from '@/app/travel/components/ui/QuickReceiptUpload'
import { TripStatusSelector } from '@/app/travel/components/ui/TripStatusSelector'
import { toggleReceiptWaived, togglePersonalAccounting } from '@/app/travel/actions'
import { CategoryIcon } from '@/utils/icon-map'
import Link from 'next/link'
import { ArrowLeft, MapPin, Calendar, Paperclip, AlertCircle, Ban, Wallet, CheckCircle2,Lock } from 'lucide-react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { redirect, notFound } from 'next/navigation'
import { TravelExpense, TripDetailData, TravelContext } from '@/types/travel'

interface PageProps {
  params: Promise<{ context: string; id: string }>
}

export default async function TripDetailPage({ params }: PageProps) {
  const { context, id } = await params
  if (context !== 'work' && context !== 'personal') notFound();
  const travelContext = context as TravelContext;
  
  // 1. Obtención de datos mediante las nuevas funciones de data.ts
  const trip = await getTripDetails(id, travelContext);
  if (!trip) redirect(`/travel/${travelContext}`);
  const tripId = id; // Esto soluciona los errores "Cannot find name 'tripId'"

  const [categories, expenses, mileageTemplates] = await Promise.all([
    getTravelCategories(travelContext),
    getTripExpenses(id),
    getMileageTemplates()
  ]);

  // 2. Lógica de Negocio y Totales
  const totalAmount = expenses.reduce((sum, item) => sum + (item.amount || 0), 0)
  const isClosed = trip.status === 'closed'
  const isPersonal = travelContext === 'personal'
  const isLocked = trip.status === 'closed' || trip.status === 'reported';

  // AGRUPACIÓN POR FECHA (Safe para compilación)
  const groupedExpenses = expenses.reduce<Record<string, TravelExpense[]>>((acc, expense) => {
    const dateKey = expense.date 
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(expense)
    return acc
  }, {})

  const sortedDates = Object.keys(groupedExpenses).sort((a, b) => b.localeCompare(a))

  return (
    <div className="min-h-screen bg-slate-100 pb-24 font-sans">
      
      {/* HEADER DINÁMICO */}
      <div className="sticky top-0 z-10 bg-slate-100/90 backdrop-blur-sm border-b border-slate-200/50 px-4 py-3 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
            <Link href={`/travel/${travelContext}`} className="p-2 -ml-2 rounded-full hover:bg-slate-200 text-slate-600 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex-1 min-w-0">
                <h1 className="text-sm font-bold text-slate-800 truncate leading-none mb-1">{trip.name}</h1>
                <span className={`text-[10px] font-bold uppercase tracking-widest ${isPersonal ? 'text-green-600' : 'text-blue-600'}`}>
                    {isPersonal ? 'Viaje Personal' : 'Viaje de Trabajo'}
                </span>
            </div>
            <div className="scale-90 origin-right">
                <TripStatusSelector 
    // Estas son las que faltaban según el error:
    tripId={trip.id}
    currentStatus={trip.status}
    
    // Estas son las que ya tenías:
    trip={trip}
    hasPendingReceipts={(expenses || []).some(e => !e.receipt_url && !e.receipt_waived && !e.is_mileage)}
    hasExpenses={(expenses ?? []).length > 0}
    
    // Opcional: para lógica de estilos
    isPersonal={context === 'personal'} 
/>
            </div>
        </div>
      </div>
      
      <div className="max-w-3xl mx-auto p-3 space-y-4">
        {/* RESUMEN DE CABECERA */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 space-y-2">
            <div className="flex flex-col gap-1.5 text-xs text-slate-600">
              {!isPersonal && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-indigo-500" />
                    <span className="font-medium text-slate-900">{trip.travel_employers?.name ?? 'Sin Empresa'}</span>
                  </div>
              )}
              <div className="flex items-center gap-2">
                 <Calendar className="h-3.5 w-3.5 text-orange-500" />
                <span>
                  {trip.start_date ? new Date(trip.start_date).toLocaleDateString('es-ES') : '---'} - {trip.end_date ? new Date(trip.end_date).toLocaleDateString('es-ES') : '---'}
                </span>
              </div>
            </div>
          </div>
          <div className="bg-slate-50 border-t border-slate-100 px-4 py-2 flex justify-between items-center">
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gasto Total</span>
             <span className="text-xl font-black text-slate-800">{totalAmount.toFixed(2)} €</span>
          </div>
        </div>

        {/* LISTADO DE GASTOS */}
        <div className="space-y-6">
          {sortedDates.map((dateKey) => (
              <div key={dateKey}>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                  {new Date(dateKey).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                </h3>

                <div className="space-y-2">
                  {groupedExpenses[dateKey].map((expense) => {
                      const category = categories?.find(c => c.id === expense.category_id)
                      const isMileage = category?.is_mileage
                      const isMissingReceipt = !isPersonal && !isMileage && !expense.receipt_url && !expense.receipt_waived

                      return (
                      <Card key={expense.id} className={`border-0 py-1 shadow-sm rounded-lg ring-1 ${isMissingReceipt ? 'ring-orange-300 bg-orange-50/30' : 'ring-slate-200 bg-white'}`}>
                        <CardContent className="p-0">
                          <div className="flex items-center p-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${isMissingReceipt ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-500'}`}>
                                {isMissingReceipt ? <AlertCircle className="h-5 w-5 animate-pulse" /> : <CategoryIcon name={category?.icon_key || 'Tag'} className="h-5 w-5" />}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-baseline">
                                  <p className="font-bold text-sm truncate text-slate-800">{expense.concept}</p>
                                  
                                  
                                <div className="flex items-center gap-1.5 ml-2">
                                    <p className="font-black text-sm text-slate-900">
                                        {expense.amount.toFixed(2)}€
                                    </p>
                                </div>
                              </div>
                              <p className="text-[10px] text-slate-500 font-medium">
                                  {category?.name} {isMileage ? `• ${expense.mileage_distance}km` : ''}
                              </p>
                            </div>
                          </div>

                          {/* ACCIONES DEL GASTO */}
                          <div className={`px-3 py-1.5 border-t flex items-center justify-between min-h-[40px] ${isMissingReceipt ? 'bg-orange-50 border-orange-100' : 'bg-slate-50/50 border-slate-100'}`}>
                            <div className="flex items-center gap-3">
                                {/* CHECK CONTABILIDAD (WALLET) */}
                                    {expense.finance_transactions && expense.finance_transactions.length > 0 ? (
                                        <span title="Sincronizado con Finanzas">
                                            <Wallet className="h-3.5 w-3.5 text-emerald-500" />
                                        </span>
                                    ) : (
                                        <span title="No sincronizado">
                                            <Wallet className="h-3.5 w-3.5 text-slate-200" />
                                        </span>
                                    )}

                                <div className="h-4 w-px bg-slate-200 mx-0.5" />

                                {/* LÓGICA DE TICKETS */}
                                {/* LÓGICA DE TICKETS PROTEGIDA */}
                                {isMileage ? (
                                    <span className="text-[10px] text-slate-400 italic">No requiere ticket</span>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        {/* CASO A: Hay ticket (Independiente de si está cerrado o no, lo mostramos) */}
                                        {expense.receipt_url ? (
                                            <a 
                                                href={expense.receipt_url} 
                                                target="_blank" 
                                                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
                                            >
                                                <Paperclip className="h-3 w-3" /> VER TICKET
                                            </a>
                                        ) : isLocked ? (
                                            /* CASO B: Viaje BLOQUEADO y sin ticket */
                                            expense.receipt_waived ? (
                                                <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 opacity-70">
                                                    <CheckCircle2 className="h-3 w-3" /> EXENTO
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                                                    <AlertCircle className="h-3 w-3" /> FALTA TICKET
                                                </span>
                                            )
                                        ) : (
                                            /* CASO C: Viaje ABIERTO y sin ticket (Permitimos acciones) */
                                            <>
                                                <QuickReceiptUpload expenseId={expense.id} tripId={tripId} />
                                                
                                                <form>
                                                    <Button 
                                                        formAction={async () => {
                                                            'use server'
                                                            await toggleReceiptWaived(expense.id, tripId, expense.receipt_waived)
                                                        }}
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className={`h-7 px-2 text-[10px] font-bold uppercase ${
                                                            expense.receipt_waived 
                                                                ? 'text-emerald-600 hover:bg-emerald-50' 
                                                                : 'text-orange-600 hover:bg-orange-100'
                                                        }`}
                                                    >
                                                        {expense.receipt_waived ? (
                                                            <><CheckCircle2 className="h-3 w-3 mr-1" /> Exento</>
                                                        ) : (
                                                            <><Ban className="h-3 w-3 mr-1" /> ¿Sin Ticket?</>
                                                        )}
                                                    </Button>
                                                </form>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                            {!isLocked ? (
                              <EditExpenseDialog 
                                expense={expense} 
                                categories={categories || []} 
                                context={travelContext} 
                              />
                            ) : (
                              <Button variant="ghost" size="icon" disabled className="opacity-30">
                                <Lock className="h-4 w-4" />
                              </Button>
                            )}
                        </div>
                        </CardContent>
                      </Card>
                      )
                  })}
                </div>
              </div>
          ))}
        </div>
      </div>

      {/* FOOTER ACCIÓN */}
      {!isClosed && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-200 z-20">
            <div className="max-w-3xl mx-auto">
              <NewExpenseDialog 
                tripId={tripId} 
                categories={categories || []} 
                templates={mileageTemplates} 
                context={travelContext} 
              />
            </div>
        </div>
      )}
    </div>
  )
}