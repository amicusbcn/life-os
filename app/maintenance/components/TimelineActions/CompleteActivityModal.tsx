// app/maintenance/components/TimelineActions/CompleteActivityModal.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, Loader2, X } from 'lucide-react';
import { completeActivityAction } from '@/app/maintenance/actions';
import { createClient } from '@/utils/supabase/client';
import { uploadFile } from '@/utils/uploads';


export function CompleteActivityModal({ log, isOpen, onClose }: { log: any, isOpen: boolean, onClose: () => void }) {
    const [notes, setNotes] = useState('');
    const [uploading, setUploading] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    
    const supabase = createClient();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const files = Array.from(e.target.files);
        setSelectedFiles(prev => [...prev, ...files]);
        
        const newPreviews = files.map(file => URL.createObjectURL(file));
        setPreviews(prev => [...prev, ...newPreviews]);
    };

    const handleSave = async () => {
        if (!notes) return;
        setUploading(true);

        try {
            // 1. Subir archivos de verdad a Supabase y obtener sus URLs públicas
            // Usamos Promise.all para subir todas las fotos en paralelo
            const uploadedUrls = await Promise.all(
                selectedFiles.map(file => 
                    uploadFile(file, { 
                        bucket: 'maintenance', 
                        folder: `logs/${log.id}` 
                    })
                )
            );

            console.log("URLs subidas con éxito:", uploadedUrls);

            // 2. Llamar a la acción del servidor con las URLs reales
            await completeActivityAction(log.id, notes, log.task_id, uploadedUrls);
            
            onClose();
        } catch (error) {
            console.error("Error completo en el proceso:", error);
            alert("Fallo al subir imágenes o guardar el informe");
        } finally {
            setUploading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black italic">Informe de Resultado</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">¿Qué se ha hecho?</label>
                        <Textarea 
                            value={notes} 
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Describe el resultado del trabajo..."
                            className="rounded-2xl mt-1 min-h-[100px] border-slate-100 focus:border-green-500 transition-all"
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Fotos del trabajo</label>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                            {previews.map((src, i) => (
                                <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-slate-100">
                                    <img src={src} className="object-cover h-full w-full" />
                                    <button 
                                        onClick={() => {
                                            setPreviews(p => p.filter((_, idx) => idx !== i));
                                            setSelectedFiles(f => f.filter((_, idx) => idx !== i));
                                        }} 
                                        className="absolute top-1 right-1 bg-black/50 rounded-full p-1 text-white hover:bg-red-500 transition-colors"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                            <label className="aspect-square rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors text-slate-400">
                                <Camera size={20} />
                                <span className="text-[10px] mt-1 font-bold">Añadir foto</span>
                                <input type="file" multiple className="hidden" onChange={handleFileChange} accept="image/*" />
                            </label>
                        </div>
                    </div>
                </div>

                <Button 
                    onClick={handleSave} 
                    disabled={uploading || !notes} 
                    className="w-full rounded-2xl bg-green-600 hover:bg-green-700 h-12 font-bold shadow-lg shadow-green-100 transition-all"
                >
                    {uploading ? <Loader2 className="animate-spin mr-2" /> : null}
                    {uploading ? 'Guardando...' : 'Finalizar Actividad'}
                </Button>
            </DialogContent>
        </Dialog>
    );
}