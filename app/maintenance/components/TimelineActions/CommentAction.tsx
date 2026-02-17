// app/maintenance/task/[id]/components/actions/CommentAction.tsx
'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon, Send, Paperclip, X, FileText, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { submitTimelineEntry,updateTimelineEntry } from '../../actions';
import { uploadFile } from '@/utils/uploads'; // Tu utilidad unificada

export function CommentAction({ mode, taskId, members, onClose, initialData, isCompletingAction, propertyId }: any) {
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

            if (isEditing) {
                // Llamamos a la nueva acción de edición
                const finalize = isCompletingAction || initialData?.is_completed;
                await updateTimelineEntry({
                    logId: initialData.id,
                    taskId,
                    // Lógica inteligente: 
                    // Si editamos actividad finalizada, el texto va a 'result_notes'
                    // Si no, va al 'content' normal
                    content: finalize ? initialData.content : content,
                    resultNotes: initialData.is_completed ? content : null, 
                    isCompleted: finalize ? true : false,
                    images: finalImages,
                    propertyId,
                    activityDate: date,
                    assignedMemberId: assignedMemberId || null
                });
            } else {
                // Llamamos a la acción de creación normal
                await submitTimelineEntry({
                    taskId,
                    content,
                    entryType: mode === 'activity' ? 'actividad' : 'comentario',
                    activityDate: date,
                    assignedMemberId: assignedMemberId || null,
                    images: finalImages
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
        <div className="space-y-4">
            <div className="relative bg-white rounded-xl border border-slate-100 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                <Textarea 
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={mode === 'comment' ? "Escribe un mensaje o adjunta documentación..." : "Ej: Visita del técnico para revisar la caldera"}
                    className="min-h-[100px] border-0 focus-visible:ring-0 rounded-xl resize-none bg-transparent"
                />
                
                {/* Previsualización de adjuntos */}
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
                                
                                {/* BOTÓN X: Visible al hacer hover (o siempre en móvil) */}
                                <button 
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        removeFile(i);
                                    }}
                                    className="absolute top-1 right-1 bg-slate-900/80 hover:bg-red-600 text-white rounded-full p-1 shadow-md backdrop-blur-sm transition-colors z-20"
                                    title="Eliminar archivo"
                                >
                                    <X size={12} strokeWidth={3} />
                                </button>

                                {/* Overlay oscuro para que la X resalte más */}
                                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                    {/* Botón Adjuntar */}
                    <label className="flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors text-slate-500">
                        <Paperclip className="h-4 w-4" />
                        <input type="file" multiple className="hidden" onChange={handleFileChange} accept="image/*,application/pdf" />
                    </label>

                    {mode === 'activity' && (
                        <>
                            {!showReportUI ? (
                              <>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" size="sm" className="bg-white text-[11px] h-9 rounded-xl border-slate-200 gap-2">
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
                                    className="text-[11px] h-9 rounded-xl border border-slate-200 bg-white px-3 focus:ring-blue-500 outline-none"
                                >
                                    <option value="">¿Responsable?</option>
                                    {members.map((m: any) => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                              </>
                            ) : (
                            <div className="bg-slate-50 p-2 rounded-lg mb-2 border border-slate-100">
                                <p className="text-[10px] text-slate-400 uppercase font-black">Actividad original</p>
                                <p className="text-xs text-slate-600 font-medium">{initialData.content}</p>
                                <p className="text-[10px] text-blue-500 font-mono">
                                Programada para el {format(new Date(initialData.activity_date), "dd/MM/yyyy")}
                                </p><p className="text-[10px] text-blue-500 font-mono">
                                Responsable: {initialData.assigned_to_name}
                                </p>
                            </div>
                            )}
                        </>
                    )}
                </div>

                <Button 
                    onClick={handleSubmit}
                    disabled={loading || !content || (mode === 'activity' && !date)}
                    className="bg-blue-600 hover:bg-blue-700 rounded-xl px-6 gap-2 shadow-lg shadow-blue-100"
                >
                    {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    <span className="text-xs font-bold uppercase tracking-tight">
                        {loading ? 'Subiendo...' : 'Publicar'}
                    </span>
                </Button>
            </div>
        </div>
    );
}