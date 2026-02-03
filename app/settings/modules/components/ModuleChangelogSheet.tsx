'use client'

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { History, Save, Activity, Hash, Rocket } from 'lucide-react';
import { getModuleChangelog, updateModuleRelease } from '../actions';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

export function ModuleChangelogSheet({ module }: { module: any }) {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const loadLogs = async () => {
        setLoading(true);
        const res = await getModuleChangelog(module.id);
        if (res.success) setLogs(res.data || []);
        setLoading(false);
    };

    async function handleRelease(formData: FormData) {
        const data = {
            version: formData.get('version') as string,
            status: formData.get('status') as any,
            title: formData.get('title') as string,
            type: formData.get('type') as any,
            is_breaking: formData.get('is_breaking') === 'on'
        };

        toast.promise(updateModuleRelease(module.id, data), {
            loading: 'Publicando nueva versión...',
            success: () => {
                loadLogs(); // Recargamos la lista
                (document.getElementById('release-form') as HTMLFormElement)?.reset();
                return 'Release desplegado con éxito';
            },
            error: 'Error al actualizar el ciclo de vida'
        });
    }

    return (
        <Sheet onOpenChange={(open) => open && loadLogs()}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-600">
                    <History className="h-4 w-4" />
                </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto bg-slate-50 border-l shadow-2xl p-0">
                <div className="p-6 bg-white border-b sticky top-0 z-20">
                    <SheetHeader>
                        <SheetTitle className="text-xl font-black flex items-center gap-2">
                            <Rocket className="w-5 h-5 text-indigo-600" />
                            Gestión de Release: {module.name}
                        </SheetTitle>
                    </SheetHeader>
                </div>

                <div className="p-6 space-y-8">
                    {/* FORMULARIO DE NUEVA VERSIÓN */}
                    <form id="release-form" action={handleRelease} className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Activity className="h-4 w-4 text-indigo-500" />
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Nueva Versión</h4>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold text-slate-500 uppercase">Versión</Label>
                                <Input name="version" defaultValue={module.current_version} placeholder="1.0.0" className="h-8 text-xs font-mono" required />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold text-slate-500 uppercase">Estado</Label>
                                <select name="status" defaultValue={module.status} className="w-full h-8 px-2 rounded-md border border-slate-200 bg-slate-50 text-[10px] font-bold outline-none">
                                    <option value="development">🛠 Desarrollo</option>
                                    <option value="beta">🧪 Beta</option>
                                    <option value="stable">✅ Estable</option>
                                    <option value="deprecated">⚠️ Deprecated</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase">Cambios Realizados</Label>
                            <Input name="title" placeholder="Ej: Añadido soporte para exportación PDF" className="h-8 text-xs" required />
                        </div>

                        <div className="flex items-center justify-between gap-4">
                            <select name="type" className="h-8 px-2 rounded-md border border-slate-100 bg-slate-50 text-[10px] font-bold">
                                <option value="feat">✨ Feature</option>
                                <option value="fix">🐛 Fix</option>
                                <option value="refactor">♻️ Refactor</option>
                            </select>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" name="is_breaking" id="breaking_sheet" className="rounded text-red-500 h-3 w-3" />
                                <label htmlFor="breaking_sheet" className="text-[10px] font-bold text-red-500 cursor-pointer">Breaking Change</label>
                            </div>
                            <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 h-8 px-4 text-[10px] font-bold">
                                <Save className="w-3 h-3 mr-2" /> PUSH RELEASE
                            </Button>
                        </div>
                    </form>

                    <hr className="border-slate-200" />

                    {/* LÍNEA DE TIEMPO (HISTORIAL) */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2">
                            <History className="w-4 h-4 text-slate-400" />
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Historial de Cambios</h4>
                        </div>

                        {loading ? (
                            <div className="text-center py-10 text-xs text-slate-400 italic">Consultando registros...</div>
                        ) : logs.length === 0 ? (
                            <div className="text-center py-10 text-xs text-slate-400 italic">No hay historial para este módulo.</div>
                        ) : (
                            <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-slate-200">
                                {logs.map((log) => (
                                    <div key={log.id} className="relative flex items-start gap-4">
                                        <div className="absolute left-0 mt-1.5 h-10 w-10 flex items-center justify-center">
                                            <div className="h-2.5 w-2.5 rounded-full bg-white border-2 border-indigo-500 z-10" />
                                        </div>
                                        <div className="ml-10 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <Badge variant="outline" className="text-[9px] font-mono bg-slate-50 px-1 h-4">v{log.version}</Badge>
                                                <span className="text-[8px] text-slate-400 font-bold uppercase">
                                                    {format(new Date(log.created_at), "dd MMM yyyy", { locale: es })}
                                                </span>
                                            </div>
                                            <p className="text-xs font-bold text-slate-700 leading-tight">{log.title}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}