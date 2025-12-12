import { getFeedbackProposals } from '@/app/core/data';
import { AppFeedback } from '@/app/core/data'; // Usamos el tipo localmente
import { UnifiedAppHeader } from '@/app/core/components/UnifiedAppHeader';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale'; // Asumo que usas date-fns
import { Check, CheckCircle2, MoreVertical, X, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { updateFeedbackStatus } from '@/app/core/actions'; // Necesitamos crear esta acción

// Interfaz para pasar los datos del usuario al Header
interface UserData {
    email: string;
    role: string;
}

// ⚠️ Esta página debe ser protegida contra usuarios no administradores
export default async function FeedbackAdminPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');
    
    // Obtener Perfil y validar rol (Protección server-side)
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
        
    const userRole = profile?.role || 'user';
    
    if (userRole !== 'admin') {
        // Redirigir si no es admin (o mostrar un 403)
        redirect('/403'); 
    }

    const proposals = await getFeedbackProposals();
    
    const headerData: UserData = { email: user.email || 'Admin', role: userRole };

    return (
        <div className="min-h-screen bg-slate-100 font-sans">
            <UnifiedAppHeader
                title="Gestión de Sugerencias"
                backHref="/"
                userEmail={headerData.email}
                userRole={headerData.role}
                maxWClass='max-w-7xl' // Usamos un ancho mayor para la tabla de gestión
            />
            
            <main className="max-w-7xl mx-auto p-4 md:p-8">
                <p className="text-gray-600 mb-6">Revisión de propuestas de mejora y bugs enviados por los usuarios de Life OS.</p>
                
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead className="w-[120px]">Fecha</TableHead>
                                <TableHead className="w-[200px]">Enviado Por</TableHead>
                                <TableHead>Propuesta</TableHead>
                                <TableHead className="w-[100px] text-center">Estado</TableHead>
                                <TableHead className="w-[80px] text-center">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(proposals && proposals.length > 0) ? (
                                proposals.map((prop) => (
                                    <TableRow key={prop.id}>
                                        <TableCell className="text-xs text-slate-500">
                                            {format(new Date(prop.created_at), 'dd MMM yyyy', { locale: es })}
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-medium">{prop.profiles?.full_name || 'N/A'}</span>
                                            <p className="text-xs text-slate-500 truncate">{prop.profiles?.email}</p>
                                        </TableCell>
                                        <TableCell className="text-sm max-w-lg">
                                            {prop.content}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge 
                                                variant="outline" 
                                                className={`text-xs ${prop.is_processed ? 'text-emerald-600 border-emerald-300 bg-emerald-50' : 'text-orange-600 border-orange-300 bg-orange-50'}`}
                                            >
                                                {prop.is_processed ? 'Procesada' : 'Pendiente'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {/* Componente para marcar como procesado (Client Component) */}
                                            <UpdateStatusButton 
                                                feedbackId={prop.id} 
                                                isProcessed={prop.is_processed} 
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-slate-500 py-10">
                                        No hay propuestas de feedback pendientes.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </main>
        </div>
    );
}

// ------------------------------------
// CLIENT COMPONENT PARA LA ACCIÓN DE LA TABLA
// ------------------------------------

// Necesitamos crear la Server Action para actualizar el estado
async function handleUpdateStatus(id: string, currentState: boolean) {
    'use server';
    // Lógica para llamar a updateFeedbackStatus (que debemos crear en app/core/actions.ts)
    // return updateFeedbackStatus(id, !currentState);
    console.log(`[ACTION] Toggling status for feedback ${id} to ${!currentState}`);
    // SIMULACIÓN: Asumo que la acción devolverá { success: true }
    return { success: true };
}


function UpdateStatusButton({ feedbackId, isProcessed }: { feedbackId: string, isProcessed: boolean }) {
    
    // Nota: Necesitas la importación de 'use client'
    // Como está en el mismo archivo, lo encapsulamos para que sea un Client Component.
    
    // Asumo que tienes useRouter importado para hacer router.refresh()
    // Como el botón es sencillo, usaremos formAction para evitar un Client Component.
    // PERO: Como necesitamos el toast, debe ser Client Component.

    // NO HAY NECESIDAD DE HACER ESTO CLIENTE SI USAMOS FORM ACTION CON TOAST.PROMISE
    // Para simplificar, asumiremos que usamos formAction, y el feedback de éxito es manejado
    // por la recarga natural de la página, o simplemente lo dejamos como Client Component.
    
    // Para ser consistente con el resto del proyecto, USAMOS CLIENT + TOAST:
    return (
        <Button 
            onClick={() => {
                 // Usamos toast.promise para manejar el estado asíncrono
                toast.promise(handleUpdateStatus(feedbackId, isProcessed), {
                    loading: 'Actualizando estado...',
                    success: () => {
                        // Aquí deberíamos llamar a router.refresh()
                        return `Estado actualizado a ${isProcessed ? 'Pendiente' : 'Procesada'}.`;
                    },
                    error: (err) => `Fallo: ${err.message}`,
                });
            }}
            variant="ghost" 
            size="icon" 
            className={`h-8 w-8 transition-colors 
            ${isProcessed ? 'text-slate-400 hover:text-red-500' : 'text-emerald-500 hover:text-emerald-600'}
            `}
        >
            {isProcessed ? <XCircle className="h-4 w-4" title="Marcar como Pendiente" /> : <CheckCircle2 className="h-4 w-4" title="Marcar como Procesada" />}
        </Button>
    )
}