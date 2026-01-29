'use client'

import { MoreVertical, Key, ShieldAlert, MailCheck, UserX, UserCheck, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { cancelInvitation, impersonateUser, resendInvitation, resetUserPassword, toggleUserStatus } from "../actions"
import { toast } from "sonner"

interface Props {
  userId: string;
  email: string;
  status: 'pending' | 'active' | 'inactive';
  isActive: boolean;
}

export function UserActionsMenu({ userId, email,status,isActive }: Props) {
  const handleReset = async () => {
    const res = await resetUserPassword(userId)
    // Ahora TS sí sabrá que res tiene success porque estamos en cliente
    if (res.success) {
      toast.success(res.message || "Email enviado")
    } else {
      toast.error(res.error || "Error al resetear")
    }
  }

  const handleImpersonate = async () => {
    const toastId = toast.loading("Generando llave maestra...")
    const res = await impersonateUser(userId)
    toast.dismiss(toastId)

    if (res.success && res.url) {
      await navigator.clipboard.writeText(res.url)
      toast.success("Enlace de acceso copiado 📋", {
        description: "⚠️ Abre este link en Incógnito para no cerrar tu sesión de Admin.",
        duration: 6000,
      })
    } else {
      toast.error("Error al generar acceso", { description: res.error })
    }
  }
  const handleResendInvite = async () => {
    toast.promise(resendInvitation(email, userId), {
      loading: 'Reenviando invitación...',
      success: (res: any) => res.message,
      error: (err) => err.message || "Error al reenviar"
    });
  }

  const handleToggleStatus = async () => {
    const nextActive = !isActive;
    console.log("Vamos a ",nextActive?"activar":"bloquear"," al usuario ",email)
    toast.promise(toggleUserStatus(userId, nextActive), {
      loading: 'Actualizando estado...',
      success: (res: any) => res.message,
      error: 'Error al cambiar estado'
    });
  }

  const handleCancelInvite = async () => {
  if(!confirm("¿Estás seguro de que quieres retirar la invitación? El usuario no podrá acceder.")) return;
  
  toast.promise(cancelInvitation(userId), {
    loading: 'Cancelando invitación...',
    success: 'Invitación retirada correctamente',
    error: 'No se pudo cancelar la invitación'
  });
}
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreVertical className="h-4 w-4 text-slate-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-[10px] uppercase text-slate-400">Acciones de Cuenta</DropdownMenuLabel>
        {/* REENVIAR (Solo si está pendiente) */}
        {status === 'pending' ? (
            <>
                <DropdownMenuItem onClick={handleResendInvite} className="cursor-pointer text-amber-600">
                    <MailCheck className="w-4 h-4 mr-2" /> 
                    <span>Reenviar Invitación</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCancelInvite} className="cursor-pointer text-red-600 focus:text-red-700">
                    <Trash2 className="w-4 h-4 mr-2" />
                    <span>Retirar Invitación</span>
                </DropdownMenuItem>
            </>
        ):(
          <>
            <DropdownMenuItem onClick={handleImpersonate} className="text-indigo-600 focus:text-indigo-700 cursor-pointer">
            <Key className="w-4 h-4 mr-2" /> 
            <div className="flex flex-col">
                <span>Impersonar</span>
                <span className="text-[10px] opacity-70">Generar link de acceso</span>
            </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleReset} className="cursor-pointer">
            <ShieldAlert className="w-4 h-4 mr-2 text-slate-400" /> 
            <span>Reset Password</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={handleToggleStatus} className="cursor-pointer font-medium">
                {isActive ? (
                <>
                    <UserX className="w-4 h-4 mr-2 text-red-500" />
                    <span className="text-red-600">Bloquear Acceso</span>
                </>
                ) : (
                <>
                    <UserCheck className="w-4 h-4 mr-2 text-emerald-500" />
                    <span className="text-emerald-600">Activar Acceso</span>
                </>
                )}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}