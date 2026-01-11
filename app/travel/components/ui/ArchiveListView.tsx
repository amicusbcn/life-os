// app/travel/[context]/archive/components/ArchiveListView.tsx
'use client'

import { useState } from 'react'
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Calendar, Search, FileText, List, Paperclip, MoreVertical, ExternalLink, ChevronDown } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import LoadIcon from "@/utils/LoadIcon"
import Link from 'next/link'
import { getSignedReportUrl } from '@/app/travel/report-actions'

export function ArchiveListView({ initialTrips, context }: { initialTrips: any[], context: string }) {
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState(''); // Formato 'YYYY-MM'

  const filteredTrips = initialTrips.filter(t => {
    const matchesText = t.name.toLowerCase().includes(search.toLowerCase()) || 
                        t.travel_employers?.name?.toLowerCase().includes(search.toLowerCase());
  
    const matchesDate = !dateFilter || t.start_date.startsWith(dateFilter);
  
    return matchesText && matchesDate;
  });
  return (
    <div className="space-y-4">
      {/* Filtros */}
        <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
            placeholder="Buscar por nombre o empresa..." 
            className="pl-10 bg-white border-none shadow-sm h-11"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            />
        </div>
        <Input 
            type="month" 
            className="w-40 bg-white border-none shadow-sm h-11 cursor-pointer"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
        />
        {dateFilter && (
            <Button variant="ghost" onClick={() => setDateFilter('')} className="h-11 px-3 text-slate-400">
            Limpiar
            </Button>
        )}
        </div>

      <Accordion type="multiple" className="space-y-3">
        {filteredTrips.map((trip) => (
          <AccordionItem key={trip.id} value={trip.id} className="border-none mb-4">
            <Card className="overflow-hidden border-0 shadow-sm ring-1 ring-slate-200/60 bg-white pt-6 pb-0">
              
              {/* SECCIÓN PRINCIPAL (ESTÁTICA) */}
              <div className="flex items-center px-4">
                {/* INFO VIAJE */}
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-800 text-lg leading-tight">{trip.name}</h3>
                    {trip.travel_employers?.name && (
                      <Badge 
                        variant="outline" 
                        className="text-[10px] border-0 text-white px-2 py-0.5 font-bold uppercase"
                        style={{ backgroundColor: trip.travel_employers.color || '#ef4444' }}
                      >
                        {trip.travel_employers.name}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center text-xs text-slate-400 font-medium italic">
                    <Calendar className="h-3.5 w-3.5 mr-1.5" />
                    <span>{new Date(trip.start_date).toLocaleDateString()}</span>
                    {trip.end_date && <><span className="mx-2 opacity-50">—</span><span>{new Date(trip.end_date).toLocaleDateString()}</span></>}
                  </div>
                </div>

                {/* IMPORTE TOTAL */}
                <div className="text-right px-4">
                  <span className="block text-[10px] font-bold text-slate-300 uppercase tracking-widest">Total Viaje</span>
                  <div className="flex items-baseline justify-end leading-none">
                    <span className="text-2xl font-black text-slate-900 tracking-tight">
                      {trip.total_amount?.toFixed(2) || '0.00'}
                    </span>
                    <span className="text-sm ml-0.5 font-bold text-slate-900">€</span>
                  </div>
                </div>

                {/* MENÚ TRES PUNTOS */}
                <div className="pl-2 border-l border-slate-100">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-10 w-8 text-slate-400">
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuLabel className="text-[10px] uppercase text-slate-400">Informe: {trip.travel_reports.code}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <Link href={`/travel/reports/${trip.travel_reports.id}?type=summary`} target="_blank">
                                    <DropdownMenuItem className="cursor-pointer"><FileText className="mr-2 h-4 w-4" /> Ver Resumen</DropdownMenuItem>
                                </Link>
                                <Link href={`/travel/reports/${trip.travel_reports.id}?type=detail`} target="_blank">
                                    <DropdownMenuItem className="cursor-pointer"><List className="mr-2 h-4 w-4" /> Ver Detalle</DropdownMenuItem>
                                </Link>
                                {trip.travel_reports.url_receipts && (
                                    <DropdownMenuItem className="cursor-pointer text-orange-600" onClick={async () => {
                                    const url = await getSignedReportUrl(trip.travel_reports.url_receipts);
                                    window.open(url, '_blank');
                                    }}>
                                    <Paperclip className="mr-2 h-4 w-4" /> Anexo Tickets
                                    </DropdownMenuItem>
                                )}
            </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* SECCIÓN INFERIOR: EL DISPARADOR (TRIGGER) */}
                <div className="bg-slate-50/50 border-t border-slate-100 flex justify-center">
                  <AccordionTrigger className="py-2 px-4 w-full hover:no-underline flex justify-center items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest group">
                    <span className="group-data-[state=open]:hidden">Ver Desglose de Gastos</span>
                    <span className="hidden group-data-[state=open]:block">Ocultar Gastos</span>
                    <ChevronDown className="h-3 w-3 transition-transform duration-300 group-data-[state=open]:rotate-180" />
                  </AccordionTrigger>
                </div>

                {/* CONTENIDO DESPLEGABLE */}

              <AccordionContent className="border-t border-slate-50 bg-slate-50/50 p-4">
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Desglose de Gastos</p>
                  {trip.travel_expenses?.length > 0 ? (
                    trip.travel_expenses.map((exp: any) => (
                      <div key={exp.id} className="flex items-center justify-between text-sm bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="bg-slate-100 p-1.5 rounded">
                            <LoadIcon name={exp.travel_categories?.icon_key || 'Tag'} className="h-3 w-3 text-slate-500" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-700">{exp.concept}</p>
                            <p className="text-[10px] text-slate-400">{new Date(exp.date).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-bold text-slate-900">{exp.amount.toFixed(2)} €</p>
                          {!exp.is_reimbursable && <p className="text-[8px] text-orange-500 font-bold uppercase">Visa</p>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic">No hay gastos registrados en este viaje.</p>
                  )}
                </div>
              </AccordionContent>
            </Card>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}