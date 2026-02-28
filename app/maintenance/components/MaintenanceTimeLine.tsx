'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Calendar, CheckCircle2, MessageSquare, Settings, User,FileText,X, RefreshCw, Reply } from "lucide-react";
import { addMonths, format } from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";
import { CommentAction } from "./TimelineActions/CommentAction";
import { Pencil } from "lucide-react";
import { TimelineAttachments } from "./TimelineAttachments";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { updateTimelineEntry } from "../actions";
import { MaintenanceLog, MaintenanceTask } from "@/types/maintenance";
import { TimelineContextActions } from "./TimelineContextActions";


export function MaintenanceTimeline({ logs, task,  members, currentUser }: { 
  logs: any[], 
  task: MaintenanceTask, 
  members: any[],
  currentUser?: any,
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFinalizing, setIsFinalizing] = useState<boolean>(false);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  // Ordenamos: Lo más nuevo (o futuro) arriba
  const sortedLogs = [...logs].sort((a, b) => {
    const dateA = new Date(a.activity_date || a.created_at).getTime();
    const dateB = new Date(b.activity_date || b.created_at).getTime();
    return dateB - dateA;
  });
  
  const handleQuickClose = async (log: MaintenanceLog,next:Date) => {
    if (!confirm("¿Cerrar actividad ahora sin comentarios adicionales?")) return;
    
    try {
        // Llamamos a la misma Server Action pero con datos por defecto
        await updateTimelineEntry({
            logId: log.id,
            taskId: task.id,
            content: log.content, // Mantenemos el original
            resultNotes: "Actividad completada (Cierre rápido).", 
            activityStatus: 'realizada',
            images: [], // Sin fotos nuevas
            propertyId: task.property_id,
            activityDate: new Date(log.activity_date||""),
            nextIterationDate: task.is_recurring?next:null
        });
        
        // El revalidatePath de la action se encargará de refrescar la UI
    } catch (error) {
        alert("Error al cerrar: " + (error as Error).message);
    }
};
  return (
    <>

      <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-slate-200">
        <TimelineContextActions 
                          task={task} 
                          isAdmin={currentUser?.isAdmin} 
                          isResponsible={task.assigned_to === currentUser?.id} 
                          members={members} 
                      />  
        {sortedLogs.map((log, index) => {
          const isSystem = log.entry_type === 'sistema';
          const isActivity = log.entry_type === 'actividad';
          const isEditing = editingId === log.id;
          const isReply = !!log.parent_log_id;
          const isTaskResponsable = log.user_id === task.assigned_to;
          const isLogAuthor = log.user_id === currentUser?.id;
          const isHouseAdmin = members.find((m: any) => m.profile_id === log.user_id)?.role === 'admin';
          const shouldHighlight = isTaskResponsable || isHouseAdmin;
          const logDate = new Date(log.activity_date || log.created_at);
          const nextIterationDate = addMonths(new Date(), task.frequency_months || 1);
          const nextLog = sortedLogs[index - 1];
          const showTodayLine = nextLog && 
                              new Date(nextLog.activity_date || nextLog.created_at) > new Date() && 
                              logDate <= new Date();

          return (
            <div key={log.id} className={cn(
              "relative group transition-all",
              isReply ? "ml-10 mb-2" : "mb-4",
              shouldHighlight && !isSystem && !isActivity ? "z-10" : "" 
            )}>
              {/* Si es respuesta, dibujamos un conector visual */}
              {isReply && (
                <div className="absolute -left-5 top-5 border-l-2 border-b-2 border-slate-200 w-4 h-4 rounded-bl-xl" />
              )}      
              {showTodayLine && (
                <div className="flex items-center my-10 ml-14">
                  <div className="absolute left-5 w-2 h-2 rounded-full bg-blue-500 -translate-x-1/2 ring-4 ring-blue-50" />
                  <div className="flex-grow border-t-2 border-dashed border-blue-100" />
                  <div className="mx-4 bg-blue-50 text-blue-600 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100 shadow-sm">
                    Hoy
                  </div>
                  <div className="flex-grow border-t-2 border-dashed border-blue-100" />
                </div>
              )}

              <div className="flex items-start gap-6">
                {/* ICONO CON ESTADO DINÁMICO */}
                <div className={cn(
                  "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-white shadow-sm transition-transform group-hover:scale-110",
                  isSystem ? 'bg-slate-100' : 
                  isActivity ? (log.is_completed ? 'bg-green-500' : 'bg-blue-600') : 
                  'bg-white'
                )}>
                  {isSystem ? (
                    <Settings className="h-4 w-4 text-slate-500" />
                  ) : isActivity ? (
                    log.is_completed ? <CheckCircle2 className="h-4 w-4 text-white" /> : <Calendar className="h-4 w-4 text-white" />
                  ) : (
                    <Avatar className="h-full w-full border-2 border-white">
                      <AvatarImage src={log.author?.avatar_url} />
                      <AvatarFallback className="bg-slate-100 text-[10px] font-bold uppercase">
                        {log.author?.full_name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>

                {/* CONTENIDO */}
                <div className="flex-1 pt-1.5 min-w-0">
                  {isEditing ? (
                    <div className="bg-blue-50/50 p-4 rounded-3xl border-2 border-blue-100 animate-in fade-in zoom-in-95">
                      <CommentAction 
                        mode={isActivity ? 'activity' : 'comment'}
                        taskId={task.id}
                        propertyId={task.property_id}
                        members={members}
                        initialData={log} 
                        isCompletingAction={isFinalizing}
                        is_recurring={task.is_recurring}
                        next={nextIterationDate}
                        onClose={() => { setEditingId(null); setIsFinalizing(false); }}
                      />
                    </div>
                  ) : (
                    <div className="relative">
                      {/* BOTONES INTEGRADOS (Dentro de la zona de contenido) */}
                      {!isSystem && !task.is_archived &&(
                        <div className="absolute -right-1 -top-1 flex gap-1 bg-white/90 backdrop-blur-sm p-1 rounded-xl shadow-sm border border-slate-100 z-20 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => setReplyToId(log.id)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                          >
                            <Reply size={14} />
                          </button>
                          {(isLogAuthor || isHouseAdmin) && (
                            <button 
                              onClick={() => {
                                setEditingId(log.id);
                                setIsFinalizing(log.is_completed);
                              }} 
                              className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                            >
                              <Pencil size={14} />
                            </button>
                          )}
                        </div>
                      )}
                      {/* Fecha a la derecha para desktop, arriba para mobile */}
                      <div className="flex flex-col mb-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                          {format(logDate, "eeee d 'de' MMMM", { locale: es })}
                        </span>
                      </div>
                      
                      {isSystem ? (
                        <p className="text-sm text-slate-500 italic leading-snug">
                          <span className="font-bold text-slate-700 not-italic">{log.author?.full_name}</span> {log.content}
                        </p>
                      ) : isActivity ? (
                        <Card className={cn(
                          "p-4 rounded-3xl shadow-none border-none ring-1 transition-all gap-2",
                          log.is_completed ? "bg-green-50/30 ring-green-100" : "bg-blue-50/30 ring-blue-100"
                        )}>
                          <div className="flex justify-between items-start mb-2">
                            <Badge variant="outline" className={cn(
                              "text-[9px] font-black uppercase border-none",
                              log.is_completed ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                            )}>
                              {log.is_completed ? 'Finalizada' : 'Programada'}
                            </Badge>
                            <span className="text-[10px] font-mono text-slate-400">
                              {format(logDate, "HH:mm")}
                            </span>
                          </div>
                          <p className="text-sm font-bold text-slate-800 leading-tight">{log.content}</p>
                          
                          {log.is_completed ? (
                            <div className="p-3 bg-white/60 rounded-2xl border border-green-100/50">
                              <p className="text-xs text-slate-600 italic">"{log.result_notes}"</p>
                              <TimelineAttachments files={log.images} />
                            </div>
                          ) : (
                            <div className="flex flex-col sm:flex-row gap-2 mt-4">
                                {/* OPCIÓN 1: CIERRE RÁPIDO (Un solo click) */}
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleQuickClose(log,nextIterationDate)}
                                  className="flex-1 bg-green-50 hover:bg-green-600 hover:text-white text-green-700 text-[10px] font-black uppercase rounded-xl h-9 border-green-200 transition-all gap-2 shadow-sm"
                                >
                                  <CheckCircle2 size={14} />
                                  Cierre Rápido
                                </Button>

                                {/* OPCIÓN 2: INFORME DETALLADO (Abre el editor) */}
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                      setEditingId(log.id);
                                      setIsFinalizing(true);
                                  }}
                                  className="flex-1 bg-white hover:bg-blue-600 hover:text-white text-blue-600 text-[10px] font-black uppercase rounded-xl h-9 border-blue-100 transition-all gap-2 shadow-sm"
                                >
                                  <FileText size={14} />
                                  Rellenar Informe
                                </Button>
                              </div>
                              
                          )}
                          
                                {task.is_recurring && !log.is_completed && (
                                    <p className="text-[9px] text-purple-500 font-bold uppercase tracking-tight mt-2 flex items-center gap-1 opacity-70">
                                        <RefreshCw size={10} className="animate-spin-slow" />
                                        Si cierras rápido, la actividad se reprogramará automáticamente para el {format(nextIterationDate, "dd/MM/yyyy")}.
                                    </p>
                                )}  
                        </Card>
                      ) : (
                        /* COMENTARIO ESTILO CHAT CON DESTACADO */
                        <div className="flex flex-col gap-1 items-start">
                          <div className={cn(
                            "p-3 rounded-2xl rounded-tl-none border text-sm  w-full shadow-sm transition-all",
                            isReply ? "bg-white border-slate-100" : "bg-slate-100 border-slate-200/50",
                            shouldHighlight && "ring-2 ring-blue-500/10 border-blue-200 bg-blue-50/30" // Destacado sutil
                          )}>
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className={cn(
                                  "text-[9px] font-black uppercase tracking-tight",
                                  shouldHighlight ? "text-blue-700" : "text-slate-500"
                              )}>
                                  {log.author?.full_name}
                              </span>
                              {isTaskResponsable && (
                                  <span className="bg-blue-600 text-white text-[7px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest">
                                      Responsable
                                  </span>
                              )}
                              {!isTaskResponsable && isHouseAdmin && (
                                  <span className="bg-slate-700 text-white text-[7px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest">
                                      Admin
                                  </span>
                              )}
                              <time className="text-[9px] text-slate-400 ml-auto">{format(new Date(log.created_at), "HH:mm")}</time>
                            </div>
                            <p className="text-slate-700 leading-relaxed italic">{log.content}</p>
                            <TimelineAttachments files={log.images} />
                          </div>
                        </div>
                      )}
                      {/* --- NUEVO: FORMULARIO DE RESPUESTA ESPECÍFICO --- */}
                      {replyToId === log.id && (
                          <div className="mt-3 ml-2 animate-in fade-in slide-in-from-top-2">
                              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 px-4 py-2 rounded-t-xl border-b-0">
                                  <div className="flex items-center gap-2">
                                      <Reply size={12} className="text-blue-600" />
                                      <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Respuesta rápida</span>
                                  </div>
                                  <button onClick={() => setReplyToId(null)} className="text-slate-400 hover:text-red-500">
                                      <X size={14} />
                                  </button>
                              </div>
                              <div className="bg-white rounded-b-xl border border-blue-200 shadow-sm overflow-hidden p-4">
                                  <CommentAction 
                                      mode="comment"
                                      taskId={task.id}
                                      propertyId={task.property_id}
                                      members={members}
                                      parentLogId={log.id} // Aquí pasamos el ID del log que respondemos
                                      onClose={() => setReplyToId(null)}
                                  />
                              </div>
                          </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
            </div>
          );
        })}                      
      </div>
    </>
  );
}