'use client'

import { useImpersonation } from "./impersonationContext"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"

export function ImpersonationBar() {
    const { 
        isRealAdmin, 
        viewingAsProfileId, 
        setViewingAsProfileId, 
        profiles, 
        activeProfile, 
        realProfileId 
    } = useImpersonation()

    // Si no hay perfiles, no mostramos nada
    if (!profiles || profiles.length === 0) return null;

    return (
        <div className="relative z-[50] max-w-7xl mx-auto mb-6">
            <div className="bg-slate-900 text-slate-200 p-3 rounded-lg flex flex-wrap items-center justify-between text-sm shadow-xl border border-slate-700">
                
                {/* IZQUIERDA: Info */}
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold bg-indigo-600 px-2 py-0.5 rounded text-white uppercase tracking-wider shadow-sm">
                        Modo Desarrollo
                    </span>
                    <span className="flex flex-col sm:flex-row sm:gap-1 text-xs sm:text-sm">
                        <span className="opacity-70">Actuando como:</span>
                        <span 
                            className="font-bold text-white underline decoration-indigo-500 underline-offset-2 flex items-center gap-2"
                            style={{ color: activeProfile?.color }}
                        >
                             {/* Mostramos bolita de color para confirmar identidad visualmente */}
                            <span className="w-2 h-2 rounded-full bg-current inline-block" />
                            {activeProfile?.display_name || 'Selecciona perfil...'}
                        </span>
                    </span>
                </div>

                {/* DERECHA: Controles */}
                <div className="flex items-center gap-2 mt-2 sm:mt-0">
                    <span className="text-xs text-slate-400 hidden sm:inline">Cambiar identidad:</span>
                    
                    <Select value={viewingAsProfileId || ''} onValueChange={setViewingAsProfileId}>
                        <SelectTrigger className="h-8 w-[160px] bg-slate-800 border-slate-600 text-white text-xs focus:ring-offset-0 focus:ring-indigo-500">
                            <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                            {profiles.map((p) => (
                                <SelectItem key={p.id} value={p.id} className="text-xs cursor-pointer">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                                        {p.display_name}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    
                    {/* Botón para volver a la realidad (si estamos suplantando) */}
                    {viewingAsProfileId !== realProfileId && realProfileId && (
                        <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => setViewingAsProfileId(realProfileId)}
                            className="h-8 text-xs px-3"
                        >
                            Salir
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}