'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Archive, Edit3, UserPlus, MessageSquare, Zap, CheckCircle2, RotateCcw } from "lucide-react";
import { ActionWrapper } from './TimelineActions/ActionWrapper';
import { AssignAction } from './TimelineActions/AssignAction';
import { RejectAction } from './TimelineActions/RejectAction';
import { CommentAction } from './TimelineActions/CommentAction'; // El antiguo TimelineInput refactorizado
import { assignTaskResponsable, updateTaskStatus,archiveTask } from '../actions';

export function TimelineContextActions({ task, isAdmin, isResponsable, members, propertySlug }: any) {
  const [activeForm, setActiveForm] = useState<string | null>(null);

  // --- HANDLERS PARA SERVER ACTIONS ---
  
  const handleAssign = async (memberId: string, memberName: string) => {
    await assignTaskResponsable({ taskId: task.id, memberId, memberName, propertySlug });
    setActiveForm(null);
  };

  const handleReject = async (reason: string) => {
      // result ahora será { success: boolean, error?: string } en lugar de void
      const result = await updateTaskStatus({ 
        taskId: task.id, 
        newStatus: 'cancelada', 
        propertyId: task.property_id, 
        comment: reason 
    });
    
    if (result?.success) {
        setActiveForm(null);
    } else {
        // Opcional: mostrar un toast o alerta con result.error
        console.error(result?.error);
    }
  };

  const handleClose = async (comment: string) => {
  const result = await updateTaskStatus({ 
      taskId: task.id, 
      newStatus: 'cerrada', 
      propertyId: task.property_id, 
      comment: comment 
    });
    
    if (result?.success) {
        setActiveForm(null);
    } else {
        console.error(result?.error);
    }
  };
  // --- RENDERIZADO DE BOTONES (ESTADOS) ---

  const renderButtons = () => {
    if (task.status === 'pendiente') {
      return (
        <div className="flex flex-wrap gap-2 animate-in fade-in">
          {isAdmin && (
            <>
              <Button onClick={() => setActiveForm('reject')} variant="outline" size="sm" className="rounded-xl border-red-100 text-red-600 hover:bg-red-50 gap-2">
                <Archive className="h-3.5 w-3.5" /> Rechazar
              </Button>
              <Button onClick={() => setActiveForm('edit')} variant="outline" size="sm" className="rounded-xl gap-2">
                <Edit3 className="h-3.5 w-3.5" /> Editar
              </Button>
              <Button onClick={() => setActiveForm('assign')} variant="outline" size="sm" className="rounded-xl gap-2">
                <UserPlus className="h-3.5 w-3.5" /> Asignar
              </Button>
            </>
          )}
          <Button onClick={() => setActiveForm('comment')} variant="default" size="sm" className="bg-blue-600 rounded-xl gap-2">
            <MessageSquare className="h-3.5 w-3.5" /> Comentar
          </Button>
        </div>
      );
    }

    if (task.status === 'en_proceso' || task.status === 'en_espera') {
    return (
      <div className="flex flex-wrap gap-2 animate-in fade-in">
        {(isAdmin || isResponsable) && (
          <>
            <Button onClick={() => setActiveForm('activity')} variant="outline" size="sm" className="rounded-xl border-blue-100 text-blue-600 hover:bg-blue-50 gap-2">
              <Zap className="h-3.5 w-3.5" /> Registrar Actividad
            </Button>
            {/* BOTÓN DE FINALIZAR TAREA */}
            <Button onClick={() => setActiveForm('close')} variant="outline" size="sm" className="rounded-xl border-green-100 text-green-600 hover:bg-green-50 gap-2">
              <CheckCircle2 className="h-3.5 w-3.5" /> Finalizar Tarea
            </Button>
          </>
        )}
        <Button onClick={() => setActiveForm('comment')} variant="default" size="sm" className="bg-blue-600 rounded-xl gap-2">
          <MessageSquare className="h-3.5 w-3.5" /> Comentar
        </Button>
      </div>
    );
  }
if (task.status === 'cerrada') {
    return (
      <div className="flex flex-wrap gap-2 animate-in fade-in">
        {isAdmin && (
           <Button onClick={() => setActiveForm('archive')} variant="outline" size="sm" className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 gap-2">
             <Archive className="h-3.5 w-3.5" /> Archivar para Limpiar
           </Button>
        )}
        <Button onClick={() => setActiveForm('comment')} variant="default" size="sm" className="bg-blue-600 rounded-xl gap-2">
          <MessageSquare className="h-3.5 w-3.5" /> Comentar
        </Button>
      </div>
    )
  }

  return null;
};

  return (
    <div className="relative ml-14 mt-8 pb-20">
      <div className="absolute -left-9 top-4 h-2 w-2 rounded-full bg-blue-500 ring-4 ring-white shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
      
      <div className="space-y-4">
        {!activeForm ? (
          renderButtons()
        ) : (
          /* RENDERIZADO DE SUBCOMPONENTES SEGÚN EL FORM ACTIVO */
          <>
            {activeForm === 'assign' && (
              <ActionWrapper title="Asignar Responsable" onClose={() => setActiveForm(null)}>
                <AssignAction members={members} onConfirm={handleAssign} />
              </ActionWrapper>
            )}

            {activeForm === 'reject' && (
              <ActionWrapper title="Rechazar y Archivar" onClose={() => setActiveForm(null)}>
                <RejectAction onConfirm={handleReject} />
              </ActionWrapper>
            )}

            {(activeForm === 'comment' || activeForm === 'activity') && (
              <ActionWrapper title={activeForm === 'comment' ? "Añadir Comentario" : "Programar Actividad"} onClose={() => setActiveForm(null)}>
                <CommentAction 
                  mode={activeForm} 
                  taskId={task.id} 
                  members={members} 
                  onClose={() => setActiveForm(null)}
                />
              </ActionWrapper>
            )}
            {activeForm === 'close' && (
              <ActionWrapper title="Finalizar Tarea e Informe" onClose={() => setActiveForm(null)}>
                <RejectAction 
                  onConfirm={handleClose} 
                  label="Nota de cierre (opcional)" 
                  buttonText="Finalizar Tarea" 
                />
              </ActionWrapper>
            )}
            {activeForm === 'archive' && (
              <ActionWrapper title="Mover al Archivo Histórico" onClose={() => setActiveForm(null)}>
                <div className="p-4 space-y-4">
                  <p className="text-sm text-slate-500">¿Estás seguro de que quieres archivar esta tarea? Dejará de aparecer en el listado activo.</p>
                  <div className="flex justify-end gap-2">
                    <Button onClick={() => setActiveForm(null)} variant="ghost" size="sm">Cancelar</Button>
                    <Button 
                      onClick={async () => {
                        await archiveTask({ taskId: task.id, propertyId: task.property_id });
                        setActiveForm(null);
                      }} 
                      className="bg-slate-800 text-white" 
                      size="sm"
                    >
                      Confirmar Archivo
                    </Button>
                  </div>
                </div>
              </ActionWrapper>
            )}
            {/* El EditAction lo podemos crear luego con calma */}
          </>
        )}
      </div>
    </div>
  );
}