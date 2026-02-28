// app/maintenance/task/[id]/page.tsx
import { getMaintenanceCategories, getTaskWithTimeline } from '../../data';
import { getUserData } from '@/utils/security';
import { TaskDetailView } from './TaskDetailView';
import { notFound } from 'next/navigation';
import { getPropertyMembers } from '@/app/properties/data';

// Definimos la interfaz para Next.js 15
interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function TaskPage({ params }: PageProps) {
    const { id } = await params;

    try {
        // 1. Cargamos la tarea PRIMERO para tener el property_id
        const { task, timeline } = await getTaskWithTimeline(id);
        if (!task) return notFound();

        // 2. Ahora pedimos los datos de usuario con CONTEXTO
        // Al pasarle la tabla 'property_members', getUserData nos dirá si somos owner/admin en esa casa
        const { 
            profile, 
            isAdminGlobal, 
            modulePermission, 
            contextRole,    // <--- El rol en la propiedad (owner, member...)
            accessibleModules 
        } = await getUserData('maintenance',task.property_id ? {
                table: 'property_members',
                column: 'property_id',
                id: task.property_id
            } : undefined);
        const categories = await getMaintenanceCategories();

        // 3. Calculamos el permiso de edición (Nivel 4: Ítem)
        const isCreator = task.created_by === profile.id;
        const isResponsible = task.assigned_to === profile.id || task.assigned_member?.user_id === profile.id;
        const isHouseAdmin = contextRole === 'owner' || contextRole === 'admin';
        const isPersonalOwner = !task.property_id && task.created_by === profile.id;
        const canEdit = isAdminGlobal || modulePermission === 'admin' || isHouseAdmin || isCreator || isResponsible || isPersonalOwner;

        // 4. Obtenemos los miembros para el selector del responsable
        const members = await getPropertyMembers(task.property_id);

        return (
            <TaskDetailView 
                task={task}
                initialTimeline={timeline}
                members={members}
                profile={profile}
                // Mantenemos isAdmin para lógica de borrado/archivo fuerte
                isAdmin={isAdminGlobal || modulePermission === 'admin' || isHouseAdmin}
                // Pasamos canEdit para el botón de edición general
                canEdit={canEdit} 
                accessibleModules={accessibleModules}
                categories={categories}
            />
        );
    } catch (e) {
        console.error("Error cargando tarea:", e);
        notFound();
    }
}