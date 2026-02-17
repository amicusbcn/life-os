// app/maintenance/task/[id]/page.tsx
import { getTaskWithTimeline } from '../../data';
import { getUserData } from '@/utils/security';
import { TaskDetailView } from './TaskDetailView';
import { notFound } from 'next/navigation';
import { getPropertyMembers } from '@/app/properties/data';

// Definimos la interfaz para Next.js 15
interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function TaskPage({ params }: PageProps) {
    // 1. Desenvolvemos los params (Obligatorio en Next 15)
    const { id } = await params;

    // 2. Obtenemos datos de usuario y módulos
    const { 
        profile, 
        isAdminGlobal, 
        modulePermission, 
        accessibleModules 
    } = await getUserData('maintenance');

    try {
        // 3. Cargamos la tarea
        const { task, timeline } = await getTaskWithTimeline(id);

        if (!task) return notFound();
        const members = await getPropertyMembers(task.property_id);
        return (
            <TaskDetailView 
                task={task}
                initialTimeline={timeline}
                members={members}
                profile={profile}
                isAdmin={isAdminGlobal || modulePermission === 'admin'}
                accessibleModules={accessibleModules}
            />
        );
    } catch (e) {
        console.error("Error cargando tarea:", e);
        notFound();
    }
}