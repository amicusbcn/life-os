'use client'

import { useImpersonation } from "./ImpersonationContext"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils" // Asegúrate de tener esto, si no quita cn()

export function ImpersonationBar() {
    const { isRealAdmin, viewingAsMemberId, setViewingAsMemberId, members, activeMember, realMemberId } = useImpersonation()

    // --- DEBUG: Comentamos esto para obligar a que se pinte ---
    // if (!isRealAdmin) return null 

    // --- DEBUG: Log para ver qué está pasando ---
    console.log("🕵️ ImpersonationBar:", { isRealAdmin, activeMember, membersCount: members.length })

    if (!members || members.length === 0) return null;

    return (
        // CAMBIOS CLAVE EN EL className DEL DIV PADRE:
        // 1. relative z-[100]: Para que esté por encima del Header si coinciden en espacio.
        // 2. mx-auto max-w-7xl: Para que se alinee con tu contenido.
        // 3. mt-2: Un poco de aire arriba.
        <div className="relative z-[100] max-w-7xl mx-auto px-4 sm:px-6 mb-4">
            <div className="bg-slate-900 text-slate-200 p-2 rounded-lg flex flex-wrap items-center justify-between text-sm shadow-xl border border-slate-700 animate-in slide-in-from-top-2">
                
                {/* IZQUIERDA: Info */}
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold bg-indigo-600 px-2 py-0.5 rounded text-white uppercase tracking-wider shadow-sm">
                        Modo Dios {isRealAdmin ? '' : '(Forzado)'}
                    </span>
                    <span className="flex flex-col sm:flex-row sm:gap-1 text-xs sm:text-sm">
                        <span className="opacity-70">Viendo como:</span>
                        <span className="font-bold text-white underline decoration-indigo-500 underline-offset-2">
                            {activeMember?.name || 'Cargando...'}
                        </span>
                    </span>
                </div>

                {/* DERECHA: Controles */}
                <div className="flex items-center gap-2 mt-2 sm:mt-0">
                    <span className="text-xs text-slate-400 hidden sm:inline">Emular a:</span>
                    
                    <Select value={viewingAsMemberId} onValueChange={setViewingAsMemberId}>
                        <SelectTrigger className="h-8 w-[140px] bg-slate-800 border-slate-600 text-white text-xs focus:ring-offset-0 focus:ring-indigo-500">
                            <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                            {members.map((m: any) => (
                                <SelectItem key={m.id} value={m.id} className="text-xs cursor-pointer">
                                    {m.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    
                    {viewingAsMemberId !== realMemberId && (
                        <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => setViewingAsMemberId(realMemberId)}
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