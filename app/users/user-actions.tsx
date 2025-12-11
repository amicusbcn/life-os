// app/users/user-actions.tsx
'use client';

import { useState, useTransition } from 'react';
import { MoreHorizontal, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';

import { toggleAdminRole, updateUserGroups, resetUserPassword, removeUserFromGroup } from './actions';

interface UserActionsProps {
  userProfile: {
    id: string;
    email: string | null;
    role: string | null;
    profiles_groups: {
      app_groups: { id: number; group: string } | null;
    }[];
  };
  availableGroups?: { id: number; group: string }[];
  isCurrentUser?: boolean;
  groupToRemove?: { id: number; group: string };
}

export function UserActions({ userProfile, availableGroups, isCurrentUser, groupToRemove }: UserActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<{ type: 'reset' | 'role'; isOpen: boolean }>({ type: 'reset', isOpen: false });

  const handleAction = (action: () => Promise<{ success?: string; error?: string } | void>) => {
    startTransition(async () => {
      const result = await action();
      if (result?.success) toast.success(result.success);
      if (result?.error) toast.error(result.error);
      setDialog({ ...dialog, isOpen: false });
    });
  };

  const onRemoveFromGroup = () => {
    if (!groupToRemove) return;
    handleAction(() => removeUserFromGroup(userProfile.id, String(groupToRemove.id)));
  };

  // Si este componente se usa para mostrar una píldora de grupo, renderiza solo eso.
  if (groupToRemove) {
    return (
      <Badge variant="outline" className="flex items-center gap-1 pr-1">
        {groupToRemove.group}
        <button onClick={onRemoveFromGroup} disabled={isPending} className="rounded-full p-0.5 hover:bg-destructive/20 text-destructive">
          <X className="h-3 w-3" />
        </button>
      </Badge>
    );
  }

  const onResetPassword = () => {
    if (!userProfile.email) return;
    handleAction(() => resetUserPassword(userProfile.email!));
  };

  const onToggleAdmin = () => {
    handleAction(() => toggleAdminRole(userProfile.id));
  };

  // Esta función ahora maneja un array de IDs de grupo
  const onUpdateGroups = (groupIds: number[]) => {
    // Por ahora, la UI solo permite seleccionar un grupo, así que el array solo tendrá un elemento.
    // Pero la acción está preparada para manejar múltiples grupos.
    handleAction(() => updateUserGroups(userProfile.id, groupIds.map(String)));
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Abrir menú</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Cambiar Grupo</DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => onUpdateGroups([])}>
                  Ninguno
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {availableGroups?.map((group) => (
                  <DropdownMenuItem key={group.id} onClick={() => onUpdateGroups([group.id])}>
                    {group.group}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          {!isCurrentUser && (
            <DropdownMenuItem onClick={() => setDialog({ type: 'role', isOpen: true })}>
              {userProfile.role === 'admin' ? 'Quitar Admin' : 'Hacer Admin'}
            </DropdownMenuItem>
          )}

          <DropdownMenuItem className="text-destructive" onClick={() => setDialog({ type: 'reset', isOpen: true })}>
            Resetear Contraseña
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={dialog.isOpen} onOpenChange={(isOpen: boolean) => setDialog({ ...dialog, isOpen })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              {dialog.type === 'reset'
                ? `Se enviará un email a ${userProfile.email} para resetear su contraseña. Esta acción no se puede deshacer.`
                : `Esto cambiará los permisos del usuario ${userProfile.email}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={dialog.type === 'reset' ? onResetPassword : onToggleAdmin}
              disabled={isPending}
            >
              {isPending ? 'Procesando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}