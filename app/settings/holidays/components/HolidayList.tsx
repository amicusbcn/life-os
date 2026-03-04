// app/settings/holidays/components/HolidayList.tsx
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { RefreshCcw, Globe, MapPin, Trash2, Edit2 } from "lucide-react";
import { deleteHoliday } from "../actions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Holiday } from "@/types/calendar";

interface Props {
    holidays: Holiday[];
    onEdit: (holiday: any) => void;
}
   
export function HolidayList({ holidays, onEdit }: Props) {
    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`¿Seguro que quieres eliminar "${name}"?`)) return;
        
        try {
            await deleteHoliday(id);
            toast.success("Festivo eliminado");
        } catch (e) {
            toast.error("No se pudo eliminar");
        }
    };
    
    return (
        <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
            <div className="hidden md:grid grid-cols-[140px_1fr_120px_100px_80px] gap-4 bg-slate-50/50 border-b px-6 py-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Fecha</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Festividad</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">Ámbito</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">Tipo</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Acción</span>
            </div>

            <div className="divide-y divide-slate-100">
                {holidays.map((h: any) => (
                    <div key={h.id} className="grid grid-cols-1 md:grid-cols-[140px_1fr_120px_100px_80px] gap-4 px-6 py-4 items-center hover:bg-slate-50/30 transition-colors">
                        
                        {/* Fecha */}
                        <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-900 leading-none">
                                {format(new Date(h.holiday_date), "d 'de' MMMM", { locale: es })}
                            </span>
                            {!h.is_annual && (
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1">
                                    Solo {format(new Date(h.holiday_date), "yyyy")}
                                </span>
                            )}
                        </div>

                        {/* Nombre */}
                        <span className="font-bold text-slate-700 text-sm italic">"{h.name}"</span>

                        {/* Ámbito: Rojo vs Azul */}
                        <div className="flex justify-center">
                            {h.scope === 'national' ? (
                                <Badge className="bg-rose-50 text-rose-700 border-rose-100 shadow-none px-2 py-0.5 text-[9px] font-black uppercase tracking-widest gap-1.5">
                                    <Globe size={10} />
                                    Nacional
                                </Badge>
                            ) : (
                                <Badge className="bg-blue-50 text-blue-700 border-blue-100 shadow-none px-2 py-0.5 text-[9px] font-black uppercase tracking-widest gap-1.5">
                                    <MapPin size={10} />
                                    {h.locality}
                                </Badge>
                            )}
                        </div>

                        {/* Anualidad */}
                        <div className="flex justify-center">
                            {h.is_annual ? (
                                <div className="flex items-center gap-1.5 text-emerald-600" title="Recurre cada año">
                                    <RefreshCcw size={12} className="stroke-[3px]" />
                                    <span className="text-[9px] font-black uppercase tracking-widest">Anual</span>
                                </div>
                            ) : (
                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Puntual</span>
                            )}
                        </div>

                        {/* Menú de Acciones (Eliminar/Editar) */}<div className="flex justify-end items-center gap-1">
                            {/* Botón Editar */}
                            <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => onEdit(h)}
                                className="h-9 w-9 p-0 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                            >
                                <Edit2 size={16} />
                            </Button>

                            {/* Botón Borrar */}
                            <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDelete(h.id, h.name)}
                                className="h-9 w-9 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            >
                                <Trash2 size={16} />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}