// app/travel/settings/mileage/page.tsx

import { getMileageTemplates } from '@/app/travel/data'; 
import { TravelMileageTemplate } from '@/types/travel';
import { CreateMileageTemplateForm } from './CreateMileageTemplateForm'; 
import { MileageTemplatesList } from './MileageTemplatesList';
import Link from 'next/link'; // <-- ¡Importar Link!
import { Button } from '@/components/ui/button'; // <-- ¡Importar Button!
import { ArrowLeft } from 'lucide-react'; // <-- ¡Importar ArrowLeft!


export default async function MileageSettingsPage() {
    const templates = await getMileageTemplates();
    
    return (
        <div className="min-h-screen bg-slate-100 font-sans pb-16">
            
            {/* ENCABEZADO: Replicando el patrón de app/travel/page.tsx */}
            <div className="sticky top-0 z-10 bg-white border-b border-slate-200/50 px-4 py-4 shadow-sm">
                <div className="max-w-2xl mx-auto flex items-center gap-3">
                    
                    {/* Botón de Vuelta a /travel */}
                    <Link href="/travel"> 
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-200 -ml-2 rounded-full">
                            <ArrowLeft className="h-5 w-5 text-slate-600" />
                        </Button>
                    </Link>
                    
                    <h1 className="text-xl font-bold text-slate-800">Configuración de Kilometraje</h1>
                </div>
            </div>
            
            {/* Contenido principal (anteriormente el cuerpo de la página) */}
            <div className="max-w-2xl mx-auto p-4 md:p-8">
                
                <p className="text-gray-600 mb-8">Gestión de recorridos fijos para la creación rápida de gastos de kilometraje.</p>
                
                {/* FORMULARIO DE CREACIÓN */}
                <h2 className="text-xl font-semibold mb-4">Añadir Nuevo Recorrido Fijo</h2>
                <CreateMileageTemplateForm />
                
                {/* LISTADO DE PLANTILLAS */}
                <MileageTemplatesList templates={templates} />

            </div>
        </div>
    );
}