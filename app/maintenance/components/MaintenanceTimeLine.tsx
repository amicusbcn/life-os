'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Calendar, CheckCircle2, MessageSquare, Settings, User,FileText,X } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";
import { CommentAction } from "./TimelineActions/CommentAction";
import { Pencil } from "lucide-react";
import { TimelineAttachments } from "./TimelineAttachments";


export function MaintenanceTimeline({ 
  logs, 
  taskId,      // <--- FALTABA
  propertyId,  // <--- FALTABA
  members,     // <--- FALTABA
  currentUser  // <--- Añadimos esto para el check de seguridad
}: { 
  logs: any[], 
  taskId: string, 
  propertyId: string, 
  members: any[],
  currentUser?: any 
}) {
  const [logToComplete, setLogToComplete] = (useState<any | null>(null));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFinalizing, setIsFinalizing] = useState<boolean>(false);
  const sortedLogs = [...logs].sort((a, b) => {
    const dateA = new Date(a.activity_date || a.created_at).getTime();
    const dateB = new Date(b.activity_date || b.created_at).getTime();
    
    return dateB - dateA; // <--- Cambiado de (A-B) a (B-A) para descendente
  });
  const handleCloseEdit = () => {
    setEditingId(null);
    setIsFinalizing(false);
  };
  return (
    <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-slate-200 before:via-slate-200 before:to-transparent">
      {sortedLogs.map((log, index) => {
        const isSystem = log.entry_type === 'sistema';
        const isActivity = log.entry_type === 'actividad';
        const isEditing = editingId === log.id;
        const logDate = new Date(log.activity_date || log.created_at);
        const isFuture = logDate > new Date();
        
        // Comprobamos si este es el primer elemento del "pasado" para meter el separador
        const nextLog = sortedLogs[index - 1]; // El anterior en el array (que es posterior en tiempo)
        const showTodayLine = nextLog && 
                              new Date(nextLog.activity_date || nextLog.created_at) > new Date() && 
                              logDate <= new Date();

        return (
          <div key={log.id} className="relative flex items-start gap-6 group">          
            {/* ICONO DEL TIMELINE */}
            <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-white shadow-sm ${
              isSystem ? 'bg-slate-100' : isActivity ? 'bg-blue-600' : 'bg-white'
            }`}>
              {isSystem ? (
                <Settings className="h-4 w-4 text-slate-500" />
              ) : isActivity ? (
                <Calendar className="h-4 w-4 text-white" />
              ) : (
                <Avatar className="h-full w-full">
                  <AvatarImage src={log.author?.avatar_url} />
                  <AvatarFallback className="bg-blue-50 text-[10px] text-blue-600 font-bold">
                    {log.author?.full_name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>

            {/* CONTENIDO (VISTA O EDICIÓN) */}
            <div className="flex-1 pt-1.5">
              {/* SEPARADOR "HOY" */}
            {showTodayLine && (
              /* Usamos un margen negativo a la izquierda para compensar el espacio del hilo del timeline */
              <div className="relative flex items-center py-0 pb-12 ml-16 mr-0">
                
                {/* Línea Izquierda */}
                <div className="flex-grow border-t-2 border-dashed border-blue-200/60 shadow-sm"></div>
                
                {/* Etiqueta Central - Con estilo 'Glassmorphism' para que destaque */}
                <div className="mx-4 flex items-center gap-2 bg-white/80 backdrop-blur-sm px-5 py-2 rounded-full border-2 border-blue-100 shadow-md ring-4 ring-blue-50/50">
                  <div className="h-2 w-2 rounded-full bg-blue-500 animate-ping" />
                  <span className="text-[11px] font-black text-blue-700 uppercase tracking-[0.3em] pl-1">
                    Hoy
                  </span>
                </div>
                
                {/* Línea Derecha */}
                <div className="flex-grow border-t-2 border-dashed border-blue-200/60 shadow-sm"></div>
              </div>
            )}
              {isEditing ? (
                <div className="bg-white p-4 rounded-2xl border-2 border-blue-100 shadow-sm mb-4 relative">
                  <button 
                    onClick={() => setEditingId(null)}
                    className="absolute -top-2 -right-2 bg-white border rounded-full p-1 text-slate-400 hover:text-red-500 z-10"
                  >
                    <X size={14} />
                  </button>
                  <CommentAction 
                    mode={isActivity ? 'activity' : 'comment'}
                    taskId={taskId}
                    propertyId={propertyId}
                    members={members}
                    initialData={log} 
                    isCompletingAction={isFinalizing}
                    onClose={() => setEditingId(null)}
                  />
                </div>
              ) : (
                <div className="relative">
                  {/* Botón lápiz para editar */}
                  {!isSystem && (
                    <button 
                      onClick={() => setEditingId(log.id)}
                      className="absolute -right-2 top-0 p-2 text-slate-400 hover:text-blue-600 transition-all lg:opacity-0 lg:group-hover:opacity-100"
                    >
                      <Pencil size={14} />
                    </button>
                  )}

                  {/* Renderizado normal según tipo (Sistema, Actividad o Comentario) */}
                  {isSystem ? (
                    <div className="flex flex-col gap-1">
                      <p className="text-sm text-slate-500 italic">
                        <span className="font-bold text-slate-700 not-italic">{log.author?.full_name}</span> {log.content}
                      </p>
                      <TimelineAttachments files={log.images} />
                      <time className="text-[10px] text-slate-400 font-mono">
                        {format(new Date(log.created_at), "d 'de' MMMM, HH:mm", { locale: es })}
                      </time>
                    </div>
                  ) : isActivity ? (
                    <Card className={`p-4 rounded-2xl shadow-none space-y-3 border-l-4 ${
                      log.is_completed ? 'border-l-green-500 bg-green-50/20' : 'border-l-blue-600 bg-blue-50/30'
                    }`}>
                      <div className="flex justify-between items-start">
                        <Badge className={log.is_completed ? "bg-green-600" : "bg-blue-600"}>
                          {log.is_completed ? 'Actividad Finalizada' : 'Actividad Programada'}
                        </Badge>
                        <time className="text-[10px] font-bold uppercase">
                          {format(new Date(log.activity_date), "eeee d 'de' MMM", { locale: es })}
                        </time>
                      </div>
                      <p className="text-sm font-medium text-slate-800">{log.content}</p>
                      {/* Aquí van los informes e imágenes si está completada */}
                      {log.is_completed ? (
                        <div className="bg-white/50 p-3 rounded-xl border border-green-100 mt-2">
                          <span className="text-[10px] font-bold text-green-700 uppercase tracking-widest">Resultado</span>
                          <p className="text-sm text-slate-700 mt-1 italic">"{log.result_notes}"</p>
                          <TimelineAttachments files={log.images} />
                        </div>
                      ) : (
                        <button 
                          onClick={() => {
                              setEditingId(log.id);
                              setIsFinalizing(true); // <--- Marcamos que queremos FINALIZAR
                          }}
                          className="w-full py-2.5 bg-white border border-blue-100 text-blue-600 text-[11px] font-black uppercase rounded-xl"
                        >
                          Completar Informe
                        </button>
                      )}
                    </Card>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-800">{log.author?.full_name}</span>
                        <time className="text-[10px] text-slate-400">
                          {format(new Date(log.created_at), "HH:mm", { locale: es })}
                        </time>
                      </div>
                      <div className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-2xl rounded-tl-none border border-slate-100 inline-block max-w-[90%]">
                        {log.content}
                      </div>
                      <TimelineAttachments files={log.images} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}