'use client';

import { useState } from 'react';
import { format, addDays, isWeekend } from 'date-fns';
import { es } from 'date-fns/locale';
import { Trash2, UserMinus, PlusCircle, Calendar as CalendarIcon, X, Lock, Hammer, AlertTriangle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'; // Ajusta a tu ruta de shadcn
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { BookingEvent, BookingProfile, BookingProperty } from '@/types/booking';
import { useImpersonation } from './impersonationContext';
import { createBooking, releaseTurn, cancelBooking } from '../actions';
import { parseBookingRange } from '@/utils/range-parser';
import { toast } from 'sonner';
import { createMaintenanceBlock } from '../actions/admin';

interface BookingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  events: BookingEvent[]; // Eventos QUE COINCIDEN con este día
  property: BookingProperty;
}

export default function BookingDialog({ isOpen, onClose, date, events, property }: BookingDialogProps) {
  const { activeProfile } = useImpersonation();
  const [isCreating, setIsCreating] = useState(false);
  // Permisos
  const isGlobalAdmin = activeProfile?.role === 'admin';
  const isLocalOwner = property.members?.some(m => 
    m.profile_id === activeProfile?.id && m.role === 'owner'
  );
  const isLocalAdmin = property.members?.some(m => 
    m.profile_id === activeProfile?.id && m.role === 'admin'
  );
  const canManage = isGlobalAdmin || isLocalOwner|| isLocalAdmin;
  // Estado para formulario de reserva nueva
  // Por defecto, sugerimos el fin de semana si es finde, o el día suelto si es entre semana
  const defaultEnd = isWeekend(date) ? addDays(date, 2) : addDays(date, 1);
  const [newStartDate, setNewStartDate] = useState(format(date, 'yyyy-MM-dd'));
  const [newEndDate, setNewEndDate] = useState(format(defaultEnd, 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(false);

  const [isBlockLoading, setIsBlockLoading] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [showBlockForm, setShowBlockForm] = useState(false);

  // Filtramos eventos activos (no cancelados ni liberados para el conteo de capacidad)
  const activeEvents = events.filter(e => e.status === 'confirmed');
  const slotsTaken = activeEvents.length;
  const isFull = slotsTaken >= property.max_slots;

  // Acciones
  const handleRelease = async (eventId: string) => {
    if (!confirm('¿Seguro que quieres liberar este turno? Quedará disponible para otros.')) return;
    setLoading(true);
    await releaseTurn(eventId);
    setLoading(false);
    onClose();
  };

  const handleCancel = async (eventId: string) => {
    if (!confirm('¿Borrar esta reserva?')) return;
    setLoading(true);
    await cancelBooking(eventId);
    setLoading(false);
    onClose();
  };

  const handleCreate = async () => {
    if (!activeProfile) return;
    setLoading(true);
    
    // Parse fechas locales a objetos Date
    const start = new Date(newStartDate);
    const end = new Date(newEndDate);

    const res = await createBooking(property.id, activeProfile.id, start, end);
    
    setLoading(false);
    if (res.error) {
        alert(res.error);
    } else {
        setIsCreating(false);
        onClose();
    }
  };
  const handleBlock = async () => {
    if (!activeProfile) return toast.error("No se ha identificado el usuario"); // 🛡️ Guard Clause
    if (!blockReason) return toast.error("Escribe una razón para el bloqueo");
    
    setIsBlockLoading(true);
    const res = await createMaintenanceBlock(property.id, date, blockReason, activeProfile.id);
    setIsBlockLoading(false);

    if (res.success) {
      toast.success(res.message);
      onClose(); // Cerramos al terminar
    } else {
      toast.error(res.message);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="capitalize flex items-center gap-2">
            <span>{format(date, 'EEEE d MMMM', { locale: es })}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${isFull ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {slotsTaken}/{property.max_slots} Ocupados
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* LISTA DE OCUPANTES */}
          {activeEvents.length === 0 ? (
            <p className="text-slate-500 text-sm italic text-center py-4">
                La casa está vacía este día.
            </p>
          ) : (
            <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-500 uppercase">Ocupantes</h4>
                {activeEvents.map(evt => {
                    const isMe = evt.user_id === activeProfile?.id;
                    const range = parseBookingRange(evt.stay_range);
                    const rangeTxt = range ? `${format(range.start, 'd MMM')} - ${format(range.end, 'd MMM')}` : '';

                    return (
                        <div key={evt.id} className="flex items-center justify-between bg-slate-50 p-2 rounded border">
                            <div className="flex items-center gap-3">
                                <div 
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm"
                                    style={{ backgroundColor: evt.user?.color || '#ccc' }}
                                >
                                    {evt.user?.initials}
                                </div>
                                <div>
                                    <p className="text-sm font-medium">{evt.user?.display_name}</p>
                                    <p className="text-[10px] text-slate-500">{rangeTxt} • {evt.type === 'turn' ? 'Turno' : 'Reserva'}</p>
                                </div>
                            </div>

                            {/* Acciones si SOY YO */}
                            {isMe && (
                                <div>
                                    {evt.type === 'turn' ? (
                                        <Button 
                                            variant="ghost" size="icon" 
                                            className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                            onClick={() => handleRelease(evt.id)}
                                            title="Liberar Turno"
                                            disabled={loading}
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                    ) : (
                                        <Button 
                                            variant="ghost" size="icon" 
                                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => handleCancel(evt.id)}
                                            title="Cancelar Reserva"
                                            disabled={loading}
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
          )}

          {/* FORMULARIO DE RESERVA */}
          {isCreating ? (
             <div className="bg-slate-50 p-3 rounded-lg border border-indigo-100 space-y-3 animate-in fade-in zoom-in-95">
                <div className="flex justify-between items-center">
                    <h4 className="text-sm font-semibold text-indigo-700">Nueva Reserva</h4>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setIsCreating(false)}><X size={14}/></Button>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <Label className="text-xs">Llegada</Label>
                        <Input type="date" value={newStartDate} onChange={e => setNewStartDate(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Salida</Label>
                        <Input type="date" value={newEndDate} onChange={e => setNewEndDate(e.target.value)} className="h-8 text-sm" />
                    </div>
                </div>
                
                <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" size="sm" onClick={handleCreate} disabled={loading}>
                    {loading ? 'Confirmando...' : 'Confirmar Reserva'}
                </Button>
             </div>
          ) : (
            /* BOTÓN PARA ABRIR FORMULARIO (Si hay sitio) */
            !isFull && !activeEvents.find(e => e.user_id === activeProfile?.id) && (
                <Button 
                    variant="outline" 
                    className="w-full border-dashed border-slate-300 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50"
                    onClick={() => setIsCreating(true)}
                >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Me apunto aquí
                </Button>
            )
          )}
        </div>
        {canManage && (
          <div className="mt-6 pt-4 border-t border-slate-100">
             {!showBlockForm ? (
                <Button 
                  variant="outline" 
                  className="w-full border-dashed border-slate-300 text-slate-500 hover:text-red-600 hover:border-red-200"
                  onClick={() => setShowBlockForm(true)}
                >
                  <Lock className="w-4 h-4 mr-2" /> Bloquear día por Mantenimiento
                </Button>
             ) : (
                <div className="bg-red-50 p-3 rounded-lg space-y-3 border border-red-100 animate-in fade-in slide-in-from-top-2">
                   <div className="flex items-center gap-2 text-red-800 font-bold text-sm">
                      <Hammer className="w-4 h-4" /> Bloquear Día
                   </div>
                   
                   {events.length > 0 && (
                      <div className="text-xs text-red-600 flex items-start gap-2 bg-white/50 p-2 rounded">
                        <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                        <span>
                          <b>¡OJO!</b> Hay {events.length} reservas. Si bloqueas, se enviará un aviso a los usuarios, pero las reservas NO se borrarán.
                        </span>
                      </div>
                   )}

                   <Input 
                      placeholder="Motivo (ej: Fontanero, Pintura...)" 
                      value={blockReason}
                      onChange={(e) => setBlockReason(e.target.value)}
                      className="bg-white"
                   />
                   
                   <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setShowBlockForm(false)}>Cancelar</Button>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={handleBlock}
                        disabled={isBlockLoading}
                      >
                        {isBlockLoading ? <Loader2 className="animate-spin h-4 w-4"/> : 'Confirmar Bloqueo'}
                      </Button>
                   </div>
                </div>
             )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}