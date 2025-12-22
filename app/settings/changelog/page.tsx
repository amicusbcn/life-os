import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    ArrowLeft, Zap, Wallet, Plane, Home, 
    Calendar, Utensils, History, Sparkles, Split 
} from 'lucide-react';
import { cn } from "@/lib/utils";

export default function ChangelogPage() {
    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-20">
            {/* ENCABEZADO */}
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-4 shadow-sm">
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/">
                            <Button variant="ghost" size="icon" className="rounded-full">
                                <ArrowLeft className="h-5 w-5 text-slate-600" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">Changelog</h1>
                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Evolución de Life-OS</p>
                        </div>
                    </div>
                    <Badge className="bg-indigo-600 hover:bg-indigo-600">v1.0.0 Stable</Badge>
                </div>
            </div>

            <div className="max-w-3xl mx-auto p-6 md:p-12 space-y-12">
                
                {/* VERSION 1.0.0 */}
                <div className="relative pl-8 border-l-2 border-indigo-500 space-y-8">
                    {/* Indicador de hito */}
                    <div className="absolute -left-[11px] top-0 h-5 w-5 rounded-full bg-indigo-500 border-4 border-white shadow-sm" />
                    
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-indigo-600">
                            <Zap className="h-5 w-5 fill-current" />
                            <span className="font-mono font-bold tracking-tighter text-2xl">v1.0.0</span>
                        </div>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tight">The Big Bang</h2>
                        <p className="text-slate-500 text-lg leading-relaxed">
                            Lanzamiento oficial de la suite completa Life-OS. Una arquitectura unificada para centralizar finanzas, logística doméstica, viajes y legado familiar.
                        </p>
                    </div>

                    <div className="grid gap-6">
                        {/* MÓDULO FINANZAS */}
                        <ModuleChange 
                            icon={<Wallet className="h-5 w-5" />}
                            title="Personal Finance (Cuentas Personales)"
                            color="bg-emerald-50 text-emerald-700 border-emerald-100"
                            features={[
                                "Motor de importación inteligente para archivos Norma 43 (C43) y CSV.",
                                "Gestión de Desgloses (Splits): Capacidad para dividir un único gasto en múltiples categorías.",
                                "Sistema de Reglas Mágicas: Auto-categorización basada en patrones de texto aprendidos.",
                                "Modo Privacidad: Ocultación instantánea de saldos y movimientos con un clic.",
                                "Filtros Jerárquicos: Navegación por categorías padre e hijo con visualización de iconos."
                            ]}
                        />

                        {/* MÓDULO VIAJES */}
                        <ModuleChange 
                            icon={<Plane className="h-5 w-5" />}
                            title="Travel Expenses (Gestor de Viajes)"
                            color="bg-blue-50 text-blue-700 border-blue-100"
                            features={[
                                "Flujo de aprobación y cierre de viajes de negocio.",
                                "Cálculo automático de kilometraje con plantillas de rutas frecuentes.",
                                "Gestión de recibos digitales vinculados a cada gasto del viaje."
                            ]}
                        />

                        {/* MÓDULO INVENTARIO */}
                        <ModuleChange 
                            icon={<Home className="h-5 w-5" />}
                            title="Home Inventory (Inventario Doméstico)"
                            color="bg-amber-50 text-amber-700 border-amber-100"
                            features={[
                                "Registro de ítems por ubicación y categoría.",
                                "Sistema de alertas para mantenimientos preventivos.",
                                "Módulo de préstamos para trazar objetos cedidos a terceros."
                            ]}
                        />

                        {/* MÓDULO COCINA */}
                        <ModuleChange 
                            icon={<Utensils className="h-5 w-5" />}
                            title="Kitchen & Food (Menú y Recetas)"
                            color="bg-orange-50 text-orange-700 border-orange-100"
                            features={[
                                "Recetario familiar con gestión de ingredientes y pasos.",
                                "Planificador de menú semanal dinámico.",
                                "Generación automática de lista de la compra basada en el menú."
                            ]}
                        />

                        {/* MÓDULO TIMELINE */}
                        <ModuleChange 
                            icon={<History className="h-5 w-5" />}
                            title="Timeline (Línea de Vida)"
                            color="bg-purple-50 text-purple-700 border-purple-100"
                            features={[
                                "Registro cronológico de hitos personales y familiares.",
                                "Categorización de eventos (salud, carrera, familia)."
                            ]}
                        />
                    </div>
                </div>

                {/* FOOTER CHANGELOG */}
                <div className="pt-10 border-t border-slate-200 text-center">
                    <p className="text-slate-400 text-sm italic">
                        "Estructurando el caos, una versión a la vez."
                    </p>
                </div>
            </div>
        </div>
    );
}

function ModuleChange({ icon, title, features, color }: { icon: any, title: string, features: string[], color: string }) {
    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-xl border", color)}>
                    {icon}
                </div>
                <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
            </div>
            <ul className="space-y-3">
                {features.map((f, i) => (
                    <li key={i} className="flex gap-3 text-sm text-slate-600 leading-snug">
                        <Sparkles className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                        {f}
                    </li>
                ))}
            </ul>
        </div>
    );
}