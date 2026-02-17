'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarIcon, MessageSquare, UserPlus, Send, Zap } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

export function TimelineInput({ taskId, users, propertySlug }: any) {
    const [mode, setMode] = useState<'comentario' | 'actividad'>('comentario');
    const [content, setContent] = useState('');
    const [date, setDate] = useState<Date>();
    const [assignedTo, setAssignedTo] = useState<string>('');

    return (
        <div className="relative mt-4 ml-14"> {/* Alineado con el contenido del timeline */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400 transition-all">
                
                {/* SELECTOR DE MODO */}
                <div className="flex border-b border-slate-50 bg-slate-50/50 p-1">
                    <button 
                        onClick={() => setMode('comentario')}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors",
                            mode === 'comentario' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        <MessageSquare className="h-3.5 w-3.5" /> Comentario
                    </button>
                    <button 
                        onClick={() => setMode('actividad')}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors",
                            mode === 'actividad' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        <Zap className="h-3.5 w-3.5" /> Programar Actividad
                    </button>
                </div>

                <div className="p-4">
                    <Textarea 
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder={mode === 'comentario' ? "Escribe un mensaje..." : "Ej: Visita del técnico para revisar la caldera"}
                        className="min-h-[80px] border-none focus-visible:ring-0 p-0 text-sm resize-none"
                    />

                    {/* CAMPOS EXTRA PARA ACTIVIDAD */}
                    {mode === 'actividad' && (
                        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-100">
                            {/* Selector de Fecha */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" className="text-[11px] h-8 rounded-lg border-slate-200 gap-2">
                                        <CalendarIcon className="h-3 w-3" />
                                        {date ? format(date, "d MMM", { locale: es }) : "Cuándo"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                                </PopoverContent>
                            </Popover>

                            {/* Selector de Encargado Actividad */}
                            <select 
                                value={assignedTo}
                                onChange={(e) => setAssignedTo(e.target.value)}
                                className="text-[11px] h-8 rounded-lg border border-slate-200 bg-white px-2 focus:ring-blue-500"
                            >
                                <option value="">Asignar a...</option>
                                {users.map((u: any) => (
                                    <option key={u.id} value={u.id}>{u.full_name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex justify-end mt-4">
                        <Button 
                            disabled={!content || (mode === 'actividad' && !date)}
                            className="bg-blue-600 hover:bg-blue-700 rounded-xl h-9 px-5 gap-2"
                        >
                            <Send className="h-3.5 w-3.5" />
                            <span className="text-xs font-bold uppercase tracking-tight">
                                {mode === 'comentario' ? 'Publicar' : 'Programar'}
                            </span>
                        </Button>
                    </div>
                </div>
            </div>
            
            {/* Indicador visual de que esto sigue el timeline */}
            <div className="absolute -left-9 top-4 h-2 w-2 rounded-full bg-slate-200 ring-4 ring-white" />
        </div>
    );
}