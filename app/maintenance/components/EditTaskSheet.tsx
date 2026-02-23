'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { updateMaintenanceTask } from '../actions';
import { toast } from "sonner";
import { ShieldAlert, User, Tag, Info, AlertTriangle, Circle, AlertCircle, CheckCircle2, PlayCircle, XCircle, Zap } from "lucide-react";
import { IconPicker } from '@/components/layout/IconPicker';
import LoadIcon from '@/utils/LoadIcon';


// Opciones estáticas (puedes moverlas a constantes si prefieres)

const TYPE_OPTIONS = [
    { value: 'averia', label: 'Avería / Reparación', icon: <Circle className="text-slate-400" size={14} /> },
    { value: 'mantenimiento', label: 'Mantenimiento Preventivo', icon: <PlayCircle className="text-blue-500" size={14} /> },
    { value: 'mejora', label: 'Mejora / Instalación', icon: <CheckCircle2 className="text-green-500" size={14} /> },
];

const STATUS_OPTIONS = [
    { value: 'pendiente', label: 'Pendiente', icon: <Circle className="text-slate-400" size={14} /> },
    { value: 'en_proceso', label: 'En Proceso', icon: <PlayCircle className="text-blue-500" size={14} /> },
    { value: 'completada', label: 'Completada', icon: <CheckCircle2 className="text-green-500" size={14} /> },
];

const PRIORITY_OPTIONS = [
    { value: "1", label: 'Baja', icon: <AlertCircle className="text-slate-400" size={14} /> },
    { value: "2", label: 'Normal', icon: <AlertCircle className="text-blue-400" size={14} /> },
    { value: "3", label: 'Alta', icon: <AlertCircle className="text-orange-500" size={14} /> },
    { value: "4", label: 'Urgente', icon: <Zap className="text-red-600" size={14} /> },
];

export function EditTaskSheet({ task, isOpen, onClose, members,categories }: any) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: task.title,
        description: task.description || '',
        status: task.status || 'pendiente',
        priority: task.priority?.toString() || '2',
        type: task.type || 'averia',
        category_id: task.category_id || '', // <--- Cambiado de 'category' a 'category_id'
        insurance_status: task.insurance_status || false,
        insurance_ref: task.insurance_ref || '',
        assigned_to: task.assigned_to || 'none'
    });
    const categoryOptions = categories?.map((cat: { id: string, name: string, icon: string }) => ({
        value: cat.id,
        label: cat.name,
        icon: <LoadIcon name={cat.icon || "Tag"} size={14} />
    })) || [];
    const candidates = task.is_personal 
        ? [{ id: task.created_by, full_name: "Mi Inventario (Privado)" }] 
        : members;

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await updateMaintenanceTask(task.id, formData);
            toast.success("Cambios aplicados");
            onClose();
        } catch (e) {
            toast.error("Error al guardar");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-full sm:max-w-md flex flex-col p-0 border-l border-slate-200 shadow-2xl">
                {/* Header con padding */}
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <SheetHeader>
                        <SheetTitle className="text-xl font-black italic uppercase tracking-tighter text-slate-800">
                            Editar Detalles
                        </SheetTitle>
                        <SheetDescription className="text-xs font-medium">
                            Actualiza la información técnica y de gestión de la incidencia.
                        </SheetDescription>
                    </SheetHeader>
                </div>

                {/* Cuerpo con scroll y padding generoso */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-32">
                    
                    {/* 1. INFORMACIÓN BÁSICA */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                <Info size={12}/> Título de la tarea
                            </Label>
                            <Input 
                                value={formData.title} 
                                onChange={(e) => setFormData({...formData, title: e.target.value})}
                                className="rounded-xl border-slate-200 focus:ring-2 focus:ring-blue-500 font-bold"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Descripción detallada</Label>
                            <Textarea 
                                value={formData.description} 
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                className="rounded-xl border-slate-200 min-h-[100px] text-sm leading-relaxed"
                            />
                        </div>
                    </div>

                    {/* 2. ESTADO Y PRIORIDAD */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Estado</Label>
                            <IconPicker 
                                options={STATUS_OPTIONS} 
                                value={formData.status} 
                                onChange={(v) => setFormData({...formData, status: v})} 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Prioridad</Label>
                            <IconPicker 
                                options={PRIORITY_OPTIONS} 
                                value={formData.priority} 
                                onChange={(v) => setFormData({...formData, priority: v})} 
                            />
                        </div>
                    </div>

                    {/* 3. CLASIFICACIÓN */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Prioridad</Label>
                            <IconPicker 
                                options={TYPE_OPTIONS} 
                                value={formData.type} 
                                onChange={(v) => setFormData({...formData, type: v})} 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Categoría</Label>
                            <IconPicker 
                                options={categoryOptions} 
                                value={formData.category_id} 
                                onChange={(v) => setFormData({...formData, category_id: v})}
                                placeholder="Seleccionar categoría..."
                            />
                        </div>
                    </div>

                    {/* 4. ASIGNACIÓN */}
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                            <User size={10}/> Responsable de la tarea
                        </Label>
                        <Select value={formData.assigned_to} onValueChange={(v) => setFormData({...formData, assigned_to: v})}>
                            <SelectTrigger className="rounded-xl border-slate-200 bg-white">
                                <SelectValue placeholder="Seleccionar miembro..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Sin asignar</SelectItem>
                                {members?.map((m: any) => (
                                    <SelectItem key={m.id} value={m.user_id || m.id}>
                                        {m.full_name || m.profiles?.full_name || 'Usuario'}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* 5. SEGURO (Bloque destacado) */}
                    <div className="p-4 rounded-2xl border border-orange-100 bg-orange-50/30 space-y-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-orange-100 rounded-lg text-orange-600">
                                    <ShieldAlert size={16} />
                                </div>
                                <div>
                                    <Label className="text-xs font-black uppercase tracking-tighter text-orange-700 leading-none">Tramitar con Seguro</Label>
                                    <p className="text-[9px] text-orange-400 font-bold uppercase tracking-widest">Avería en el hogar</p>
                                </div>
                            </div>
                            <Switch 
                                checked={formData.insurance_status}
                                onCheckedChange={(checked) => setFormData({...formData, insurance_status: checked})}
                            />
                        </div>

                        {formData.insurance_status && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-orange-400">Nº de Parte / Referencia</Label>
                                <Input 
                                    placeholder="Ej: SIN-2024-0891"
                                    value={formData.insurance_ref}
                                    onChange={(e) => setFormData({...formData, insurance_ref: e.target.value})}
                                    className="bg-white border-orange-200 focus:ring-orange-500 rounded-xl font-mono text-xs"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer fijo con botón de acción */}
                <div className="p-6 bg-white border-t border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                    <Button 
                        onClick={handleSubmit} 
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest rounded-2xl h-14 shadow-lg shadow-blue-200 transition-all active:scale-[0.98]"
                    >
                        {loading ? "Guardando cambios..." : "Actualizar Tarea"}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}