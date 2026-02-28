'use client';

import { useState } from 'react';
import { 
  Calendar, CheckCircle2, FileText, MapPin, Wrench, 
  RefreshCw, Home, User, ArrowUpRight, ChevronLeft 
} from "lucide-react";
import { format, addMonths } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from 'next/link';

// Importamos tu componente de acción
import { CommentAction } from "./TimelineActions/CommentAction"; 
import { updateTimelineEntry } from "../actions";

export function ActivityDetail({ 
  payload, 
  currentUser,
  members = [] // Los pasaremos desde el wrapper del calendario
}: { 
  payload: { log: any, task: any },
  currentUser: any,
  members?: any[]
}) {
  const { log, task } = payload;
  const [isReporting, setIsReporting] = useState(false);
  
  const nextIterationDate = addMonths(new Date(), task.frequency_months || 1);

  // Lógica de Contexto
  const isPersonal = !task.property_id;
  const propertyName = task.property?.name || "Propiedad Personal";
  const itemName = task.item?.name;
  const locationName = task.location?.name;
  const assetName = itemName || locationName || "Sin ubicación";
  const hasItem = !!itemName;
  const AssetIcon = hasItem ? Wrench : MapPin;

  const handleQuickClose = async () => {
    try {
      await updateTimelineEntry({
        logId: log.id,
        taskId: task.id,
        content: log.content,
        resultNotes: "Cierre rápido desde calendario.",
        activityStatus: 'realizada',
        propertyId: task.property_id,
        activityDate: new Date(log.activity_date),
        nextIterationDate: task.is_recurring ? nextIterationDate : null,
        images: [] 
      });
      toast.success("Actividad completada");
      // Nota: Aquí se cerraría el Sheet por el revalidate del server action
    } catch (error) {
      toast.error("Error al cerrar actividad");
    }
  };

  // SI ESTAMOS EN MODO INFORME: Renderizamos el formulario de CommentAction
  if (isReporting) {
    return (
      <div className="space-y-6 py-4 animate-in fade-in slide-in-from-right-4">
        <header className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsReporting(false)}
            className="h-8 w-8 p-0 rounded-full"
          >
            <ChevronLeft size={18} />
          </Button>
          <h3 className="text-sm font-black uppercase tracking-tighter">Completar Informe</h3>
        </header>

        <CommentAction 
          mode="activity"
          taskId={task.id}
          propertyId={task.property_id}
          members={members}
          initialData={log}
          isCompletingAction={true} // Esto activa el ReportUI en tu componente
          is_recurring={task.is_recurring}
          next={nextIterationDate}
          onClose={() => setIsReporting(false)}
        />
      </div>
    );
  }

  // VISTA NORMAL DE LECTURA
  return (
    <div className="space-y-6 py-4">
      {/* 1. CABECERA CON LINK A LA TAREA */}
      <section className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
             <Badge variant="outline" className={cn(
               "text-[9px] uppercase tracking-widest px-1.5 py-0 h-4 border-none font-black",
               isPersonal ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"
             )}>
               {isPersonal ? <User size={10} className="mr-1"/> : <Home size={10} className="mr-1"/>}
               {propertyName}
             </Badge>
             
             <Badge className={cn(
               "text-[9px] uppercase tracking-widest px-1.5 py-0 h-4 font-black shadow-none border-none",
               log.is_completed ? "bg-green-500 text-white" : "bg-blue-600 text-white"
             )}>
               {log.is_completed ? 'REALIZADA' : 'PENDIENTE'}
             </Badge>
          </div>
          
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 leading-none">
              {task.title}
            </h3>
            <Button variant="outline" size="icon" className="h-8 w-8 shrink-0 rounded-lg border-slate-200" asChild>
              <Link href={`/maintenance/task/${task.id}`}>
                <ArrowUpRight size={16} className="text-slate-500" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Info de Activo/Ubicación */}
        <div className="flex items-center gap-2 text-slate-500">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-lg border border-slate-100">
            <AssetIcon size={12} className="text-blue-500" />
            <span className="text-[10px] font-bold uppercase tracking-tight">
              {assetName}
            </span>
          </div>
          {hasItem && locationName && (
            <span className="text-[10px] font-medium text-slate-400 italic">
              en {locationName}
            </span>
          )}
        </div>
      </section>

      {/* 2. DETALLE DE LA ACTIVIDAD */}
      <Card className="p-4 border-2 border-slate-100 shadow-none bg-slate-50/50 rounded-2xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-slate-400" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">
                {format(new Date(log.activity_date), "dd/MM/yyyy")}
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-500 uppercase">
             {format(new Date(log.activity_date), "eeee", { locale: es })}
          </span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
          <p className="text-sm text-slate-700 leading-snug font-medium">
            {log.content}
          </p>
        </div>
      </Card>

      {/* 3. ACCIONES */}
      <div className="space-y-3 pt-2">
        {!log.is_completed ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                onClick={handleQuickClose}
                className="bg-green-600 hover:bg-green-700 text-white rounded-xl font-black uppercase text-[10px] h-10 transition-all shadow-md shadow-green-100"
              >
                <CheckCircle2 size={16} className="mr-2" />
                Cerrar Rápido
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => setIsReporting(true)} // ACTIVAMOS MODO INFORME
                className="border-2 border-blue-100 text-blue-600 hover:bg-blue-50 rounded-xl font-black uppercase text-[10px] h-10"
              >
                <FileText size={16} className="mr-2" />
                Informe
              </Button>
            </div>

            {task.is_recurring && (
              <div className="flex items-center gap-2 p-3 bg-purple-50/50 rounded-xl border border-purple-100/50 border-dashed">
                <RefreshCw size={12} className="text-purple-500 animate-spin-slow" />
                <p className="text-[9px] text-purple-600 font-bold uppercase tracking-tight leading-tight">
                  Próxima: {format(nextIterationDate, "dd/MM/yyyy")}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="p-4 bg-green-50 rounded-2xl border-2 border-green-100 flex flex-col items-center text-center gap-2 animate-in zoom-in-95">
            <CheckCircle2 size={24} className="text-green-500" />
            <div>
              <p className="text-[10px] font-black uppercase text-green-800 tracking-tighter">Finalizada</p>
              <p className="text-[11px] text-green-600 font-medium italic mt-1">
                "{log.result_notes || 'Sin notas adicionales'}"
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}