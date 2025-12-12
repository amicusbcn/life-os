// app/settings/components/SettingsMenu.tsx (Server Component)

import Link from 'next/link';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { User, Users, Inbox } from 'lucide-react';
import { Fragment } from 'react';
import { createClient } from '@/utils/supabase/server';

// El componente debe recibir el userRole para ser condicional
export async function SettingsMenu() {
    
    // Necesitamos el rol. La forma más limpia es hacer el fetch aquí.
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    
    const isAdmin = profile?.role === 'admin';
    
    return (
        <Fragment>
            {/* Mi Perfil */}
            <Link href="/settings/profile" passHref key="profile">
                <DropdownMenuItem className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>Mi Perfil</span>
                </DropdownMenuItem>
            </Link>

            {/* Gestión de Usuarios (Admin) */}
            {isAdmin && (
                <Link href="/settings/users" passHref key="users-admin">
                    <DropdownMenuItem className="cursor-pointer">
                        <Users className="mr-2 h-4 w-4" />
                        <span>Gestión de Usuarios</span>
                    </DropdownMenuItem>
                </Link>
            )}
            
            {/* Gestión de Sugerencias (Admin) - Se inyecta aquí para que esté con los ajustes admin */}
            {isAdmin && (
                <Link href="/settings/feedback" passHref key="feedback-admin">
                    <DropdownMenuItem className="cursor-pointer">
                        <Inbox className="mr-2 h-4 w-4" />
                        <span>Gestionar Sugerencias</span>
                    </DropdownMenuItem>
                </Link>
            )}

            {/* Separador para separar de las utilidades CORE (FeedbackDialog, Changelog) */}
            <DropdownMenuSeparator /> 
        </Fragment>
    );
}