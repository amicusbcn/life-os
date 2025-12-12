import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Zap } from 'lucide-react';

export default function ChangelogPage() {
    return (
        <div className="min-h-screen bg-slate-100 font-sans pb-16">
            
            {/* ENCABEZADO: Navegación de Vuelta */}
            <div className="sticky top-0 z-10 bg-white border-b border-slate-200/50 px-4 py-4 shadow-sm">
                <div className="max-w-2xl mx-auto flex items-center gap-3">
                    <Link href="/">
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-200 -ml-2 rounded-full">
                            <ArrowLeft className="h-5 w-5 text-slate-600" />
                        </Button>
                    </Link>
                    <h1 className="text-xl font-bold text-slate-800">Historial de Versiones</h1>
                </div>
            </div>
            
            {/* CONTENIDO PRINCIPAL */}
            <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-10">

                <div className="space-y-4 border-l-4 border-indigo-500 pl-4 bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-3xl font-black text-indigo-700 flex items-center gap-2">
                        <Zap className="h-6 w-6" /> v1.0.0 (Lanzamiento Inicial)
                    </h2>
                    <p className="text-sm text-slate-500">
                        *Lanzamiento inicial de la plataforma Life-OS, estableciendo el core de la arquitectura y la base de los módulos principales.*
                    </p>
                    
                    <h3 className="text-lg font-bold text-slate-800 pt-4">🚀 Nuevas Características</h3>
                    <ul className="list-disc ml-6 space-y-3 text-sm text-slate-700">
                        <li>
                            <p className="font-semibold text-base mb-1">Módulo Travel Expenses (Gastos de Viaje)</p>
                            <ul className="list-square ml-4 space-y-1">
                                <li><b>Plantillas de Kilometraje</b> Se añade la capacidad de crear, guardar y usar recorridos fijos para la creación rápida de gastos.</li>
                                <li><b>Eliminación de Viajes</b> Implementada la funcionalidad para eliminar viajes en estado 'open', con limpieza en cascada de gastos y recibos.</li>
                                <li><b>Mejoras UX</b> Ocultación condicional del campo de comprobante en gastos de kilometraje.</li>
                            </ul>
                        </li>
                        <li>
                            <p className="font-semibold text-base mb-1 pt-2">Módulo Home Inventory (Inventario Doméstico)</p>
                            <ul className="list-circle ml-4 space-y-1">
                                <li><b>Control de Mantenimientos</b> Funcionalidad para planificar y registrar tareas de mantenimiento.</li>
                                <li><b>Control de Préstamos</b> Capacidad para registrar el préstamo de artículos.</li>
                            </ul>
                        </li>
                        <li>
                            <p className="font-semibold text-base mb-1 pt-2">Módulo Timeline (Hitos)</p>
                            <ul className="list-circle ml-4 space-y-1">
                                <li>Lanzamiento de la estructura de datos base para el registro de hitos personales y familiares.</li>
                            </ul>
                        </li>
                        <li>
                            <p className="font-semibold text-base mb-1 pt-2">Módulo Core</p>
                            <ul className="list-circle ml-4 space-y-1">
                                <li>Estructura base para la Gestión de Usuarios y roles.</li>
                            </ul>
                        </li>
                    </ul>
                </div>
                
                {/* Aquí se añadirían futuras versiones (v1.0.1, v1.1.0, etc.) */}

            </div>
        </div>
    );
}