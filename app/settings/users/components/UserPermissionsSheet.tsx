// /app/settings/users/components/UserPermissionSheet.tsx
'use client'

import { useState } from 'react'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Settings2, Shield, Trash2, Key, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

// TUS IMPORTS:
import LoadIcon from '@/utils/LoadIcon' // <--- TU UTILIDAD
import { AdminUserRow, AppRole, AppModule } from '@/types/users'
import { setModulePermission, removeModulePermission, toggleGlobalAdmin, resetUserPassword } from '@/app/settings/users/actions'

interface Props {
  user: AdminUserRow;
  availableModules: AppModule[]; // <--- NUEVA PROP: La verdad viene de la BD
}

export function UserPermissionsSheet({ user, availableModules }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const isGlobalAdmin = user.role === 'admin';

  // --- HANDLERS (Igual que antes) ---
  const handleRoleChange = async (moduleKey: string, newRole: string) => {
    toast.promise(setModulePermission(user.id, moduleKey, newRole as AppRole), {
      loading: 'Actualizando permiso...',
      success: 'Permiso actualizado',
      error: 'Error al actualizar'
    })
  }

  const handleRemoveAccess = async (moduleKey: string) => {
    toast.promise(removeModulePermission(user.id, moduleKey), {
      loading: 'Revocando acceso...',
      success: 'Acceso revocado',
      error: 'Error al revocar'
    })
  }

  const handleGlobalAdminToggle = async () => {
    const action = isGlobalAdmin ? 'Quitar Admin' : 'Hacer Admin';
    if(!confirm(`⚠️ ¿Seguro que quieres ${action} Global a este usuario?`)) return;
    const res = await toggleGlobalAdmin(user.id);
    if(res.success) toast.success(res.message); else toast.error(res.error);
  }

  const handleResetPassword = async () => {
    const res = await resetUserPassword(user.id);
    if(res.success) toast.success(res.message); else toast.error(res.error);
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600">
          <Settings2 className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto p-6 bg-slate-50/50">
        <SheetHeader className="mb-8">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xl">
                {user.email?.[0].toUpperCase()}
            </div>
            <div>
                <SheetTitle className="text-xl">{user.full_name || 'Usuario'}</SheetTitle>
                <SheetDescription>{user.email}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-8">
            {/* 1. ZONA GLOBAL (Sin cambios) */}
            <section className={`p-5 rounded-xl border ${isGlobalAdmin ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-lg ${isGlobalAdmin ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                            <Shield className="h-5 w-5" />
                        </div>
                        <div>
                            <Label className="font-bold text-base block">Super Admin</Label>
                            <span className="text-xs text-slate-500">Acceso total al sistema</span>
                        </div>
                    </div>
                    <Switch checked={isGlobalAdmin} onCheckedChange={handleGlobalAdminToggle} />
                </div>
                {isGlobalAdmin && (
                    <div className="flex items-start gap-2 text-xs text-indigo-700 bg-indigo-100/50 p-3 rounded-md">
                        <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                        <p>Permisos implícitos de Administrador en todos los módulos.</p>
                    </div>
                )}
                <div className="mt-4 pt-4 border-t border-slate-100/50">
                    <Button variant="outline" size="sm" onClick={handleResetPassword} className="w-full text-xs h-8">
                        <Key className="w-3 h-3 mr-2 text-slate-500" /> Reset Password
                    </Button>
                </div>
            </section>

            {/* 2. PERMISOS POR MÓDULO (DINÁMICO) */}
            <section>
                <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Settings2 className="h-4 w-4" />
                    Permisos Modulares
                </h4>
                
                {availableModules.length === 0 ? (
                    <p className="text-sm text-slate-500 italic">No hay módulos activos definidos en app_modules.</p>
                ) : (
                    <div className="space-y-3">
                        {availableModules.map((mod) => {
                            const dbRole = user.permissions[mod.key]; 
                            const effectiveRole = isGlobalAdmin ? 'admin' : dbRole;
                            const hasAccess = !!effectiveRole;

                            return (
                                <div 
                                    key={mod.key} 
                                    className={`
                                        flex items-center justify-between p-3 rounded-lg border transition-all
                                        ${hasAccess ? 'bg-white border-green-200 shadow-sm' : 'bg-slate-50 border-transparent opacity-80 hover:opacity-100'}
                                    `}
                                >
                                    {/* Info Módulo + Icono Dinámico */}
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-md ${hasAccess ? 'bg-green-50 text-green-600' : 'bg-slate-200 text-slate-400'}`}>
                                            {/* AQUÍ USAMOS TU COMPONENTE */}
                                            <LoadIcon name={mod.icon || 'HelpCircle'} size={20} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className={`text-sm font-medium ${hasAccess ? 'text-slate-800' : 'text-slate-500'}`}>
                                                {mod.name}
                                            </span>
                                            <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                                                {hasAccess ? (
                                                    <span className="text-green-600 flex items-center gap-1">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Activo
                                                    </span>
                                                ) : 'Sin Acceso'}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {/* Controles (Sin cambios lógicos, solo estéticos) */}
                                    <div className="flex items-center gap-2">
                                        {hasAccess ? (
                                            <>
                                                <Select 
                                                    value={effectiveRole} 
                                                    disabled={isGlobalAdmin}
                                                    onValueChange={(val) => handleRoleChange(mod.key, val)}
                                                >
                                                    <SelectTrigger className="w-[100px] h-8 text-xs bg-white">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="viewer">Viewer</SelectItem>
                                                        <SelectItem value="editor">Editor</SelectItem>
                                                        <SelectItem value="admin">Admin</SelectItem>
                                                    </SelectContent>
                                                </Select>

                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                                    disabled={isGlobalAdmin}
                                                    onClick={() => handleRemoveAccess(mod.key)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </>
                                        ) : (
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className="h-8 text-xs border-dashed text-slate-500 hover:text-indigo-600 hover:border-indigo-300"
                                                disabled={isGlobalAdmin}
                                                onClick={() => handleRoleChange(mod.key, 'viewer')}
                                            >
                                                Habilitar
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}