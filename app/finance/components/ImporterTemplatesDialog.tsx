// app/finance/components/ImporterTemplatesDialog.tsx
'use client'

import React, { useState, useMemo } from "react"
import { useRouter } from 'next/navigation'
import { NewTemplateForm} from "./NewTemplateForm"
import { 
    createImporterTemplate, 
    updateImporterTemplate, 
    deleteImporterTemplate 
} from "@/app/finance/actions" 

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from 'sonner'
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

import { 
    Settings2, History, Plus, Trash2, Check, X, FileText, 
    ArrowLeftRight, Hash, Type, Calendar, Info
} from "lucide-react"

// --- FILA DE PLANTILLA ---
function TemplateRow({ template }: { template: any }) {
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    // Estados para la configuración (JSON settings)
    const [name, setName] = useState(template.name);
    const [settings, setSettings] = useState(template.settings || {
        invert_sign: false,
        has_two_columns: false,
        column_map: { date: 0, concept: 1, amount: 2, charge: null, credit: null }
    });

    const updateSetting = (key: string, value: any) => {
        setSettings((prev: any) => ({ ...prev, [key]: value }));
    };

    const updateColumn = (col: string, val: string) => {
        const numVal = val === '' ? null : parseInt(val);
        setSettings((prev: any) => ({
            ...prev,
            column_map: { ...prev.column_map, [col]: numVal }
        }));
    };

    const handleSave = async () => {
        setLoading(true);
        const res = await updateImporterTemplate(template.id, name, settings);
        if (res.success) {
            toast.success('Plantilla actualizada');
            setIsEditing(false);
            router.refresh();
        } else {
            toast.error('Error al guardar');
        }
        setLoading(false);
    };

    return (
        <div className={cn(
            "group mb-3 p-3 rounded-xl border bg-white shadow-sm transition-all",
            isEditing ? "ring-2 ring-indigo-500/20 border-indigo-200" : "border-slate-100"
        )}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg">
                        <FileText className="h-4 w-4 text-slate-500" />
                    </div>
                    {isEditing ? (
                        <Input 
                            value={name} 
                            onChange={(e) => setName(e.target.value)}
                            className="h-7 text-sm font-bold border-slate-200"
                        />
                    ) : (
                        <span className="font-bold text-sm text-slate-700">{name}</span>
                    )}
                </div>
                <div className="flex gap-1">
                    {isEditing ? (
                        <>
                            <Button size="icon" variant="ghost" onClick={handleSave} className="h-8 w-8 text-emerald-600">
                                <Check className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => setIsEditing(false)} className="h-8 w-8 text-slate-400">
                                <X className="h-4 w-4" />
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button size="icon" variant="ghost" onClick={() => setIsEditing(true)} className="h-8 w-8 text-slate-400">
                                <Settings2 className="h-4 w-4" />
                            </Button>
                            <Button 
                                size="icon" variant="ghost" 
                                onClick={() => deleteImporterTemplate(template.id).then(() => router.refresh())}
                                className="h-8 w-8 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {isEditing && (
                <div className="mt-4 pt-4 border-t border-slate-50 space-y-4 animate-in slide-in-from-top-2">
                    {/* Configuración Lógica */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                            <div className="space-y-0.5">
                                <Label className="text-[10px] font-bold uppercase">Invertir Signo</Label>
                                <p className="text-[8px] text-slate-500 leading-tight">Gastos (+) e Ingresos (-)</p>
                            </div>
                            <Switch 
                                checked={settings.invert_sign} 
                                onCheckedChange={(val) => updateSetting('invert_sign', val)}
                                className="scale-75"
                            />
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                            <div className="space-y-0.5">
                                <Label className="text-[10px] font-bold uppercase">Doble Columna</Label>
                                <p className="text-[8px] text-slate-500 leading-tight">Cargos y Abonos separados</p>
                            </div>
                            <Switch 
                                checked={settings.has_two_columns} 
                                onCheckedChange={(val) => updateSetting('has_two_columns', val)}
                                className="scale-75"
                            />
                        </div>
                    </div>

                    {/* Mapeo de Columnas */}
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Mapeo de Columnas (Empezando en 0)</Label>
                        <div className="grid grid-cols-3 gap-2">
                            <ColumnInput label="Fecha" icon={<Calendar className="h-3 w-3"/>} value={settings.column_map?.date} onChange={(v: string) => updateColumn('date', v)} />
                            <ColumnInput label="Concepto" icon={<Type className="h-3 w-3"/>} value={settings.column_map?.concept} onChange={(v: string) => updateColumn('concept', v)} />
                            
                            {!settings.has_two_columns ? (
                                <ColumnInput label="Importe" icon={<Hash className="h-3 w-3"/>} value={settings.column_map?.amount} onChange={(v: string)=> updateColumn('amount', v)} />
                            ) : (
                                <>
                                    <ColumnInput label="Cargos" icon={<ArrowLeftRight className="h-3 w-3"/>} value={settings.column_map?.charge} onChange={(v: string) => updateColumn('charge', v)} />
                                    <ColumnInput label="Abonos" icon={<ArrowLeftRight className="h-3 w-3"/>} value={settings.column_map?.credit} onChange={(v: string)=> updateColumn('credit', v)} />
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ColumnInput({ label, icon, value, onChange }: any) {
    return (
        <div className="space-y-1">
            <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500 uppercase">
                {icon} {label}
            </div>
            <Input 
                type="number" 
                value={value ?? ''} 
                onChange={(e) => onChange(e.target.value)}
                className="h-8 bg-slate-50 border-none text-center font-mono text-xs" 
            />
        </div>
    );
}

// --- COMPONENTE PRINCIPAL ---
export function ImporterTemplatesDialog({ initialTemplates = [], history = [], children }: any) {
    const [open, setOpen] = useState(false);
    const [showNew, setShowNew] = useState(false);
    
    // Clonamos el trigger igual que en CategorySettingsDialog
    const child = React.Children.only(children) as React.ReactElement<any>;
    const trigger = React.cloneElement(child, {
        onClick: (e: React.MouseEvent) => {
            e.stopPropagation();
            setOpen(true);
        }
    });

    return (
        <>
            {trigger}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[480px] h-[85vh] flex flex-col bg-slate-50 p-0 overflow-hidden border-none shadow-2xl">
                    <DialogHeader className="p-6 pb-2 bg-white border-b">
                        <DialogTitle className="flex items-center gap-2 uppercase tracking-tighter font-black text-slate-700">
                            <Settings2 className="h-5 w-5 text-indigo-500" /> Plantillas de Importación
                        </DialogTitle>
                    </DialogHeader>

                    <Tabs defaultValue="templates" className="flex-1 flex flex-col overflow-hidden">
                        <TabsList className="grid w-[90%] mx-auto grid-cols-2 mt-4 bg-slate-200/50 p-1">
                            <TabsTrigger value="templates" className="gap-2 text-xs data-[state=active]:bg-white shadow-none">
                                <Settings2 className="h-3.5 w-3.5"/> Plantillas
                            </TabsTrigger>
                            <TabsTrigger value="history" className="gap-2 text-xs data-[state=active]:bg-white shadow-none">
                                <History className="h-3.5 w-3.5"/> Histórico
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="templates" className="flex-1 flex flex-col overflow-hidden p-4">
                            <Button 
                                variant="outline" 
                                className="w-full mb-4 border-dashed border-slate-300 bg-white hover:bg-slate-50 text-slate-500 gap-2 h-11 font-bold text-xs"
                                onClick={() => setShowNew(!showNew)}
                            >
                                {showNew ? <X className="h-4 w-4"/> : <Plus className="h-4 w-4" />}
                                {showNew ? "Cancelar" : "Nueva Plantilla"}
                            </Button>
                            {showNew && (
                                <NewTemplateForm onSuccess={() => setShowNew(false)} />
                            )}

                            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                {initialTemplates.map((t: any) => (
                                    <TemplateRow key={t.id} template={t} />
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="history" className="flex-1 overflow-y-auto p-4 space-y-2">
                            {history.length === 0 ? (
                                <div className="text-center py-20 text-slate-400 italic">
                                    <History className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                    <p className="text-sm">No hay registros de importación todavía.</p>
                                </div>
                            ) : (
                                history.map((log: any) => (
                                    <div key={log.id} className="p-3 bg-white rounded-xl border border-slate-100 flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-bold text-slate-700">{log.filename}</p>
                                            <p className="text-[10px] text-slate-400">{log.accounts?.name} • {new Date(log.created_at).toLocaleDateString()}</p>
                                        </div>
                                        <Badge variant="outline" className="text-[10px] bg-slate-50">
                                            {log.row_count} movs
                                        </Badge>
                                    </div>
                                ))
                            )}
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>
        </>
    );
}