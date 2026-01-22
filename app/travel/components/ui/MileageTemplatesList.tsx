// app/travel/settings/mileage/MileageTemplatesList.tsx
'use client' 

import { deleteMileageTemplate } from '@/app/travel/actions'; 
import { TravelMileageTemplate } from '@/types/travel';
import { formatNumber } from '@/utils/formatters'; 
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

/**
 * COMPONENTE CLIENTE: Botón de borrar
 * Maneja la interacción con la Server Action y el feedback visual.
 */
function DeleteButtonClient({ templateId, name }: { templateId: string, name: string }) {
    const router = useRouter();

    const handleDelete = () => {
        toast.promise(deleteMileageTemplate(templateId), { 
            loading: `Eliminando plantilla '${name}'...`,
            success: (res) => {
                // CORRECCIÓN: TypeScript exige comprobar el discriminante 'success' antes de acceder a 'error'
                if (!res.success) {
                    throw new Error(res.error); 
                }
                router.refresh(); 
                return 'Plantilla eliminada con éxito.';
            },
            error: (err) => err.message,
        });
    };

    return (
        <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleDelete}
            className="text-red-500 hover:text-red-600"
        >
            <Trash2 className="h-4 w-4" />
        </Button>
    )
}

/**
 * LISTADO DE PLANTILLAS DE KILOMETRAJE
 * Muestra una tabla con las rutas guardadas.
 */
interface MileageTemplatesListProps {
    templates: TravelMileageTemplate[];
}

export function MileageTemplatesList({ templates }: MileageTemplatesListProps) {
    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold">Recorridos Fijos ({templates.length})</h2>
            {templates.length === 0 ? (
                <div className="p-8 border rounded-lg text-center text-gray-500 bg-white shadow-sm">
                    Aún no tienes recorridos fijos guardados.
                </div>
            ) : (
                 <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre del Recorrido</TableHead>
                                <TableHead className="text-right">Distancia (km)</TableHead>
                                <TableHead className="w-[80px] text-center">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {templates.map((template: TravelMileageTemplate) => (
                                <TableRow key={template.id}>
                                    <TableCell className="font-medium">{template.name}</TableCell>
                                    <TableCell className="text-right font-mono">{formatNumber(template.distance)}</TableCell>
                                    <TableCell className="text-center">
                                        <DeleteButtonClient 
                                            templateId={template.id} 
                                            name={template.name} 
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                 </div>
            )}
        </div>
    );
}