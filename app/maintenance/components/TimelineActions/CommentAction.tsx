// app/maintenance/task/[id]/components/actions/CommentAction.tsx
'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon, Send, Paperclip, X, FileText, Loader2, RefreshCw, Reply } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { addMonths, format } from "date-fns";
import { es } from "date-fns/locale";
import { submitTimelineEntry,updateTimelineEntry } from '../../actions';
import { uploadFile } from '@/utils/uploads'; // Tu utilidad unificada
import { cn } from '@/lib/utils';

export function CommentAction({ mode, taskId, members,is_recurring=false, next, onClose, initialData, isCompletingAction, propertyId,parentLogId }: any) {
    const isEditing = !!initialData;
    const showReportUI = initialData?.is_completed || isCompletingAction;
    const [content, setContent] = useState(
        showReportUI ? (initialData?.result_notes || '') : (initialData?.content || '')
    );
    const [date, setDate] = useState<Date | undefined>(
        initialData?.activity_date ? new Date(initialData.activity_date) : undefined
    );
    const [assignedMemberId, setAssignedMemberId] = useState(initialData?.assigned_to || '');
    const [loading, setLoading] = useState(false);
    const [replyToId, setReplyToId] = useState<string | null>(null);

    // Dentro de CommentAction
    const [nextIterationDate, setNextIterationDate] = useState<Date | undefined>(next);
    
    // Estados para archivos
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    
    // Almacenamos las URLs que ya existen en la base de datos
    const [existingImages, setExistingImages] = useState<string[]>(initialData?.images || []);

    // Las previsualizaciones mezclan las existentes y las nuevas
    const [previews, setPreviews] = useState<{url: string, isPDF: boolean, isNew: boolean}[]>(
        Array.isArray(initialData?.images) 
            ? initialData.images.map((url: string) => ({
                url,
                isPDF: url?.toLowerCase().endsWith('.pdf') || false,
                isNew: false
            }))
            : [] // Si no es array o es undefined, empezamos con vacío
    );

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const files = Array.from(e.target.files);
        setSelectedFiles(prev => [...prev, ...files]);
        
        const newPreviews = files.map(file => ({
            url: URL.createObjectURL(file),
            isPDF: file.type === 'application/pdf',
            isNew: true // Marcamos como nuevo
        }));
        setPreviews(prev => [...prev, ...newPreviews]);
    };

    const removeFile = (index: number) => {
        const previewToRemove = previews[index];
        if (!previewToRemove) return; // Seguridad extra

        if (previewToRemove.isNew) {
            URL.revokeObjectURL(previewToRemove.url);
            // Filtramos de forma segura
            const currentPreviews = previews || [];
            const newFilesIndex = currentPreviews
                .slice(0, index)
                .filter(p => p?.isNew).length;
                
            setSelectedFiles(prev => (prev || []).filter((_, i) => i !== newFilesIndex));
        } else {
            setExistingImages(prev => (prev || []).filter(url => url !== previewToRemove.url));
        }
        
        setPreviews(prev => (prev || []).filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            // 1. Subir solo los archivos NUEVOS
            let newUrls: string[] = [];
            if (selectedFiles.length > 0) {
                newUrls = await Promise.all(
                    selectedFiles.map(file => uploadFile(file, { 
                        bucket: 'maintenance', 
                        folder: `tasks/${taskId}/comments` 
                    }))
                );
            }

            // 2. Unir las que se mantienen con las nuevas subidas
            const finalImages = [...existingImages, ...newUrls];

            // 3. Definir el contenido final (Evitar vacíos en cierres)
            const isFinalizing = isCompletingAction || initialData?.is_completed;
            const cleanedContent = content.trim();
            const finalContent = (cleanedContent === '' && isFinalizing) 
                ? "Actividad completada" 
                : cleanedContent;

            if (isEditing) {
                await updateTimelineEntry({
                    logId: initialData.id,
                    taskId,
                    content: isFinalizing ? initialData.content : finalContent,
                    resultNotes: initialData.is_completed ? content : null, 
                    activityStatus: isFinalizing ? 'realizada' : initialData.activity_status,
                    images: finalImages,
                    propertyId,
                    activityDate: date,
                    assignedMemberId: assignedMemberId || null,
                    nextIterationDate: is_recurring && isFinalizing ? nextIterationDate : null
                });
            } else {
                // Llamamos a la acción de creación normal
                await submitTimelineEntry({
                    taskId,
                    content,
                    entryType: mode === 'activity' ? 'actividad' : 'comentario',
                    activityDate: date,
                    assignedMemberId: assignedMemberId || null,
                    images: finalImages,
                    parentLogId: parentLogId || null,
                });
            }
            
            onClose(); 
        } catch (error) {
            console.error(error);
            alert("Error: " + (error as Error).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            <div className="relative bg-white rounded-xl border border-slate-100 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all shadow-sm">
                <Textarea 
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={showReportUI ? "Describe el resultado de la actividad..." : "Escribe un mensaje o adjunta documentación..."}
                    className="min-h-[100px] border-0 focus-visible:ring-0 rounded-xl resize-none bg-transparent text-sm p-4"
                />
                
                {/* Previsualización de adjuntos (Tu lógica se mantiene) */}
                {previews.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-3 pt-0">
                        {previews.map((preview, i) => (
                            <div key={i} className="relative h-16 w-16 rounded-xl overflow-hidden border border-slate-200 group shadow-sm">
                                {preview.isPDF ? (
                                    <div className="flex flex-col items-center justify-center h-full bg-red-50 text-red-600">
                                        <FileText size={20} />
                                        <span className="text-[7px] font-black uppercase mt-1">PDF</span>
                                    </div>
                                ) : (
                                    <img src={preview.url} className="object-cover h-full w-full" alt="preview" />
                                )}
                                <button 
                                    type="button"
                                    onClick={(e) => { e.preventDefault(); removeFile(i); }}
                                    className="absolute top-1 right-1 bg-slate-900/80 hover:bg-red-600 text-white rounded-full p-1 shadow-md backdrop-blur-sm transition-colors z-20"
                                >
                                    <X size={12} strokeWidth={3} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ZONA DE CONTROLES INFERIOR */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                    {/* Botón Adjuntar */}
                    <label className="flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors text-slate-500 bg-white">
                        <Paperclip className="h-4 w-4" />
                        <input type="file" multiple className="hidden" onChange={handleFileChange} accept="image/*,application/pdf" />
                    </label>

                    {mode === 'activity' && (
                        <>
                            {!showReportUI ? (
                                <>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" size="sm" className="bg-white text-[11px] h-9 rounded-xl border-slate-200 gap-2 font-bold uppercase tracking-tight">
                                                <CalendarIcon className="h-3 w-3 text-blue-500" />
                                                {date ? format(date, "d MMM", { locale: es }) : "Fecha"}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                                        </PopoverContent>
                                    </Popover>
                                    <select 
                                        value={assignedMemberId}
                                        onChange={(e) => setAssignedMemberId(e.target.value)}
                                        className="text-[11px] h-9 rounded-xl border border-slate-200 bg-white px-3 focus:ring-blue-500 outline-none font-bold uppercase tracking-tight"
                                    >
                                        <option value="">¿Responsable?</option>
                                        {members.map((m: any) => (
                                            <option key={m.id} value={m.id}>{m.name}</option>
                                        ))}
                                    </select>
                                </>
                            ) : (
                                <div className="bg-blue-50/50 px-3 py-1.5 rounded-xl border border-blue-100 flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                                    <span className="text-[10px] font-black text-blue-700 uppercase">Editando Informe</span>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="flex items-center gap-2 ml-auto">
                    {/* BOTÓN CANCELAR (EL QUE FALTABA) */}
                    <Button 
                        type="button"
                        variant="ghost" 
                        onClick={onClose}
                        className="text-[11px] h-9 px-4 rounded-xl font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    >
                        Cancelar
                    </Button>

                    <Button 
                        onClick={handleSubmit}
                        disabled={loading || !content || (mode === 'activity' && !date)}
                        className={cn(
                            "rounded-xl px-6 h-9 gap-2 shadow-lg transition-all active:scale-95",
                            showReportUI ? "bg-green-600 hover:bg-green-700 shadow-green-100" : "bg-blue-600 hover:bg-blue-700 shadow-blue-100"
                        )}
                    >
                        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        <span className="text-[11px] font-black uppercase tracking-widest">
                            {loading ? 'Subiendo...' : showReportUI ? 'Finalizar' : isEditing ? 'Guardar' : parentLogId?'Responder': 'Publicar'}
                        </span>
                    </Button>
                </div>
            </div>

            {/* Si es reporte, mostramos un recordatorio visual de lo que se está cerrando */}
            {/* Sección de contexto al finalizar actividad */}
            {showReportUI && !initialData?.is_completed && (
                <div className="flex flex-col md:flex-row gap-3 mt-2 animate-in slide-in-from-top-1">
                    
                    {/* Bloque 1: Actividad Original (60% de ancho aprox) */}
                    <div className="flex-1 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-[9px] text-slate-400 font-black uppercase mb-1">Actividad original</p>
                        <p className="text-xs text-slate-600 italic">"{initialData.content}"</p>
                    </div>

                    {/* Bloque 2: Próxima Iteración (Editable) */}
                    {is_recurring && (
                        <Popover>
                            <PopoverTrigger asChild>
                                <button className="flex-1 p-3 bg-purple-50/50 rounded-xl border border-purple-100 flex items-center gap-3 hover:bg-purple-100/50 transition-all text-left group">
                                    <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 shrink-0 group-hover:scale-110 transition-transform">
                                        <RefreshCw size={14} className="animate-spin-slow" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[9px] font-black text-purple-700 uppercase leading-none mb-1">Próxima Iteración</p>
                                            <CalendarIcon size={10} className="text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                        <p className="text-xs text-purple-900 font-bold">
                                            {nextIterationDate ? format(nextIterationDate, "dd/MM/yyyy") : "Sin fecha"}
                                        </p>
                                    </div>
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <Calendar 
                                    mode="single" 
                                    selected={nextIterationDate} 
                                    onSelect={setNextIterationDate} 
                                    initialFocus 
                                />
                            </PopoverContent>
                        </Popover>
                    )}
                </div>
            )}
        </div>
    );
}