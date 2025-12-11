// app/users/user-actions.tsx
'use client'

import React, { useState, useTransition } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreVertical, Loader2, Trash2, Key, UserCheck, Users, Plus, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

// Importamos las acciones del Server Component (actions.ts)
import { toggleAdminRole, updateUserGroups, resetUserPassword, removeUserFromGroup } from './actions'; 
// Importamos tipos centrales
import { ActionResponse, AdminUserProfile, AppGroup } from '@/types/common'; 

// --- TIPOS DE PROPIEDADES ---
// El perfil que viene de la página (Server Component)
interface UserActionsProps {
    userProfile: AdminUserProfile;
    // Para la acción de quitar grupo (renderizada por cada grupo)
    groupToRemove?: AppGroup; 
    // Para la acción de añadir grupo (renderizada solo una vez)
    availableGroups?: AppGroup[];
    // Para la acción de reseteo (evitar que el admin se borre a sí mismo)
    isCurrentUser?: boolean;
}

// --- COMPONENTE DE ACCIONES ---
export function UserActions({ userProfile, groupToRemove, availableGroups, isCurrentUser }: UserActionsProps) {
    const [isPending, startTransition] = useTransition();

    // --------------------------------------------------------
    // FUNCIÓN CENTRAL PARA LLAMAR A LAS SERVER ACTIONS
    // Nota: El retorno se tipa como Promise<any> para evitar el conflicto 
    // de serialización de Next.js (boolean vs string)
    // --------------------------------------------------------
    const handleAction = async (actionFn: () => Promise<ActionResponse>) => {
        startTransition(async () => {
            try {
                const result = await actionFn() as ActionResponse;
                
                if (result.success) { // success es boolean
                    toast.success(result.message || "Acción completada con éxito.");
                } else if (result.error) {
                    toast.error(result.error || "Ocurrió un error.");
                }
            } catch (error) {
                console.error("Error en Server Action:", error);
                toast.error("Error inesperado en la comunicación con el servidor.");
            }
        });
    }

    // --- MANEJO DE GRUPOS (Renderizado dentro de la columna GRUPO) ---
    if (groupToRemove) {
        return (
            <Badge 
                key={groupToRemove.id} 
                className="cursor-pointer gap-1 group transition-all"
                onClick={() => handleAction(() => removeUserFromGroup(userProfile.id, groupToRemove.id))} // Llama a la acción
            >
                {groupToRemove.group}
                <Minus className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Badge>
        );
    }
    
    // --- MANEJO DE ACCIONES GLOBALES (Renderizado en la columna ACCIONES) ---
    
    // Función para añadir un grupo específico
    const handleAddGroup = (groupId: number) => {
        handleAction(() => updateUserGroups(userProfile.id, groupId));
    };

    // Renderizado del Dropdown de Acciones
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0" disabled={isPending}>
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{userProfile.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />

                {/* 1. Resetear Contraseña */}
                <DropdownMenuItem 
                    onClick={() => handleAction(() => resetUserPassword(userProfile.id))} // Llama a la acción
                    disabled={isPending}
                >
                    <Key className="mr-2 h-4 w-4" /> Resetear Contraseña
                </DropdownMenuItem>

                {/* 2. Cambiar Rol de Admin */}
                <DropdownMenuItem 
                    onClick={() => handleAction(() => toggleAdminRole(userProfile.id))}
                    disabled={isPending || isCurrentUser}
                    className={userProfile.role === 'admin' ? 'text-red-600' : 'text-green-600'}
                >
                    <UserCheck className="mr-2 h-4 w-4" /> 
                    {userProfile.role === 'admin' ? 'Quitar Admin' : 'Hacer Admin'}
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />

                {/* 3. Gestión de Grupos */}
                <DropdownMenuLabel>Añadir a Grupo</DropdownMenuLabel>
                {availableGroups?.length === 0 ? (
                    <DropdownMenuItem disabled>
                        <Users className="mr-2 h-4 w-4" /> Sin grupos disponibles
                    </DropdownMenuItem>
                ) : (
                    availableGroups?.map(group => (
                        <DropdownMenuItem key={group.id} onClick={() => handleAddGroup(group.id)} disabled={isPending}>
                            <Plus className="mr-2 h-4 w-4" /> {group.group}
                        </DropdownMenuItem>
                    ))
                )}
                
                <DropdownMenuSeparator />

                {/* 4. Borrar Usuario (Placeholder, no implementado aquí) */}
                <DropdownMenuItem disabled className="text-slate-400">
                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar Usuario
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}