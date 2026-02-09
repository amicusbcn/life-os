'use client';

import { PropertyAlert } from '@/types/properties';
import { useProperty } from '../context/PropertyContext';
import { deletePropertyAlert } from '../actions';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
    AlertTriangle, Info, CheckCircle2, Megaphone, 
    X, CalendarClock, Trash2 
} from 'lucide-react';
import { toast } from 'sonner';
import { AlertSheet } from './AlertSheet'; // Reutilizamos el Sheet para crear desde aquí también

interface Props {
    alerts?: PropertyAlert[];
    isReadOnly?: boolean;
}

export function DashboardAlerts({ alerts = [], isReadOnly = false }: Props) {
    const { can, property } = useProperty();
    const isAdmin = can('edit_house'); 

    // Helper para borrar
    const handleDelete = async (id: string) => {
        if(confirm("¿Eliminar este aviso permanentemente?")) {
            try {
                await deletePropertyAlert(id, property.id);
                toast.success("Aviso eliminado");
            } catch (e) {
                toast.error("Error al eliminar");
            }
        }
    };

    // Helper para formatear fechas
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('es-ES', { 
            day: 'numeric', month: 'short', year: 'numeric' 
        });
    };

    // Configuración visual según tipo
    const getTypeConfig = (type: string) => {
        switch (type) {
            case 'critical': return { 
                icon: Megaphone, 
                style: "bg-red-50 border-red-200 text-red-900", 
                badge: "bg-red-200 text-red-800 hover:bg-red-200" 
            };
            case 'warning': return { 
                icon: AlertTriangle, 
                style: "bg-yellow-50 border-yellow-200 text-yellow-900", 
                badge: "bg-yellow-200 text-yellow-800 hover:bg-yellow-200" 
            };
            case 'success': return { 
                icon: CheckCircle2, 
                style: "bg-green-50 border-green-200 text-green-900", 
                badge: "bg-green-200 text-green-800 hover:bg-green-200" 
            };
            default: return { 
                icon: Info, 
                style: "bg-blue-50 border-blue-200 text-blue-900", 
                badge: "bg-blue-200 text-blue-800 hover:bg-blue-200" 
            };
        }
    };

    // --- CASO 1: NO HAY ALERTAS ---
    if (alerts.length === 0) {
        if (isReadOnly) return null; // En Dashboard no mostramos nada
        
        // En Settings mostramos estado vacío con botón de crear
        return (
            <div className="text-center py-10 border-2 border-dashed rounded-xl bg-slate-50/50">
                <Megaphone className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                <h3 className="text-sm font-medium text-slate-900">No hay avisos activos</h3>
                <p className="text-sm text-slate-500 mb-4">El tablón está limpio.</p>
                {isAdmin && (
                    <AlertSheet 
                        propertyId={property.id} 
                        trigger={<Button variant="outline">Publicar primer aviso</Button>}
                    />
                )}
            </div>
        );
    }

    // --- CASO 2: MODO LECTURA (DASHBOARD) - Compacto ---
    if (isReadOnly) {
        return (
            <div className="space-y-3 mb-6">
                {alerts.map(alert => {
                    const config = getTypeConfig(alert.type);
                    const Icon = config.icon;
                    return (
                        <div key={alert.id} className={`flex items-start p-4 rounded-lg border shadow-sm ${config.style}`}>
                            <Icon className="w-5 h-5 mt-0.5 mr-3 shrink-0 opacity-80"/>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-semibold text-sm">{alert.title}</h4>
                                    {alert.end_date && (
                                        <span className="flex items-center text-[10px] uppercase tracking-wide font-bold opacity-60 border px-1.5 rounded bg-white/30">
                                            <CalendarClock className="w-3 h-3 mr-1"/>
                                            Hasta {formatDate(alert.end_date)}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm opacity-90 leading-relaxed text-pretty">
                                    {alert.message}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    // --- CASO 3: MODO GESTIÓN (SETTINGS) - Completo ---
    return (
        <div className="space-y-4">
            
            {/* Cabecera con botón de crear */}
            <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-muted-foreground">
                    Mostrando {alerts.length} aviso{alerts.length !== 1 && 's'}.
                </p>
                {isAdmin && (
                    <AlertSheet 
                        propertyId={property.id} 
                        trigger={<Button size="sm">Nuevo Aviso</Button>}
                    />
                )}
            </div>

            {/* Lista detallada */}
            <div className="space-y-3">
                {alerts.map(alert => {
                    const config = getTypeConfig(alert.type);
                    const Icon = config.icon;
                    const isExpired = alert.end_date && new Date(alert.end_date) < new Date();

                    return (
                        <Alert key={alert.id} className={`relative transition-all ${isExpired ? 'opacity-60 bg-slate-50 border-slate-200 grayscale-[0.5]' : 'bg-white'}`}>
                            <div className="flex gap-4">
                                <div className={`p-2 rounded-full h-fit mt-1 ${config.badge} bg-opacity-20`}>
                                    <Icon className="w-4 h-4" />
                                </div>
                                
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <AlertTitle className="flex items-center gap-2 m-0">
                                            {alert.title}
                                            {isExpired && <Badge variant="secondary" className="text-[10px]">Caducado</Badge>}
                                        </AlertTitle>
                                    </div>
                                    
                                    <AlertDescription className="text-slate-600 mt-1">
                                        {alert.message}
                                    </AlertDescription>

                                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                                        <span>Publicado: {formatDate(alert.created_at)}</span>
                                        {alert.end_date && (
                                            <span className="flex items-center gap-1 text-slate-500 font-medium">
                                                <CalendarClock className="w-3 h-3"/>
                                                Fin: {formatDate(alert.end_date)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Botón Borrar */}
                            {isAdmin && (
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="absolute top-2 right-2 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                    onClick={() => handleDelete(alert.id)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            )}
                        </Alert>
                    );
                })}
            </div>
        </div>
    );
}