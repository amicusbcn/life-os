'use client';

import { useState, useMemo } from 'react';
import { BookingMember, BookingProfile, MemberRole, MemberResponsibility } from '@/types/booking';
import { upsertMembership, removeMember } from '../../actions/settings';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// UI
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  Search, Shield, User, UserX, Loader2, 
  Calendar, Package, Wrench, Wallet, PlusCircle 
} from 'lucide-react';

// --- CONFIGURACIÓN DE RESPONSABILIDADES ---
const RESPONSIBILITY_OPTIONS = [
  { id: 'booking', label: 'Gestión de Turnos', icon: Calendar },
  { id: 'logistics', label: 'Logística', icon: Package },
  { id: 'maintenance', label: 'Mantenimiento', icon: Wrench },
  { id: 'financial', label: 'Finanzas', icon: Wallet },
] as const;

interface MembersTabProps {
  propertyId: string;
  members: BookingMember[];
  allProfiles: BookingProfile[];
  currentUserId: string;
}

// Tipo extendido para la tabla unificada
type MergedProfile = BookingProfile & {
  membershipId?: string;
  role?: MemberRole | 'no_access';
  responsibilities: MemberResponsibility[]; // <--- Añadido
  is_current_user: boolean;
};

export function MembersTab({ propertyId, members, allProfiles, currentUserId }: MembersTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // 1. FUSIÓN DE DATOS
  const processedProfiles = useMemo(() => {
    const list: MergedProfile[] = allProfiles.map(globalProfile => {
      const localMember = members.find(m => m.profile_id === globalProfile.id);
      const isCurrentUser = globalProfile.user_id === currentUserId; // Ojo: user_id puede ser null en fantasmas

      return {
        ...globalProfile,
        membershipId: localMember?.id,
        role: localMember ? localMember.role : 'no_access',
        responsibilities: localMember?.responsibilities || [],
        is_current_user: isCurrentUser
      };
    });

    const filtered = list.filter(p => 
      p.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.initials.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Ordenar: Owner > Admin > Member > No Access
    return filtered.sort((a, b) => {
      const roleScore = (role?: string) => {
        switch (role) {
          case 'owner': return 0;
          case 'admin': return 1;
          case 'member': return 2;
          default: return 3;
        }
      };
      const scoreA = roleScore(a.role);
      const scoreB = roleScore(b.role);
      if (scoreA !== scoreB) return scoreA - scoreB;
      return a.display_name.localeCompare(b.display_name);
    });

  }, [allProfiles, members, searchTerm, currentUserId]);

  // 2. MANEJADOR UNIFICADO (ROL O RESPONSABILIDADES)
  const handleUpdate = async (
    profile: MergedProfile, 
    changes: { role?: string; responsibilities?: MemberResponsibility[] }
  ) => {
    setLoadingId(profile.id);

    try {
      const newRole = changes.role !== undefined ? changes.role : profile.role;
      const newResponsibilities = changes.responsibilities !== undefined ? changes.responsibilities : profile.responsibilities;

      if (newRole === 'no_access') {
        // BORRAR
        if (profile.membershipId) {
          const res = await removeMember(profile.membershipId);
          if (res.success) toast.success("Acceso revocado");
          else toast.error(res.message);
        }
      } else {
        // ACTUALIZAR / CREAR
        const res = await upsertMembership({
          propertyId,
          profileId: profile.id,
          memberId: profile.membershipId,
          role: newRole as MemberRole,
          responsibilities: newResponsibilities, // Enviamos las responsabilidades actualizadas
        });
        
        if (res.success) toast.success("Permisos actualizados");
        else toast.error(res.message);
      }
    } catch (e) {
      toast.error("Error actualizando miembro");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* HEADER */}
      <div className="p-4 border-b space-y-3 bg-white sticky top-0 z-10">
        <div className="flex justify-between items-end">
           <div>
               <h3 className="font-bold text-sm text-slate-900">Control de Acceso</h3>
               <p className="text-xs text-muted-foreground">Define roles y tareas.</p>
           </div>
           <Badge variant="outline" className="text-xs font-mono">
             {members.length} miembros
           </Badge>
        </div>
        <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
                placeholder="Buscar..." 
                className="pl-9 bg-slate-50 border-slate-200"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
        </div>
      </div>

      {/* LISTA */}
      <div className="flex-1 overflow-y-auto p-2">
         {processedProfiles.length === 0 ? (
             <div className="text-center py-8 text-xs text-muted-foreground">Sin resultados.</div>
         ) : (
             <div className="space-y-1">
                 {processedProfiles.map((p) => {
                     const isActive = p.role !== 'no_access';
                     const isLoading = loadingId === p.id;
                     const showResponsibilities = isActive && (p.role === 'admin' || p.role === 'owner');

                     return (
                         <div 
                           key={p.id} 
                           className={cn(
                               "flex items-center justify-between p-3 rounded-lg border transition-all",
                               isActive ? "bg-white border-slate-200 shadow-sm" : "bg-slate-50/50 border-transparent opacity-60 hover:opacity-100"
                           )}
                         >
                            {/* IZQ: INFO USUARIO */}
                            <div className="flex items-center gap-3 overflow-hidden flex-1">
                                <Avatar className={cn("h-9 w-9 border", isActive ? "bg-indigo-50 text-indigo-700" : "bg-slate-100 text-slate-400")}>
                                    <AvatarFallback className="text-xs font-bold">{p.initials}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className={cn("font-medium text-sm truncate", isActive ? "text-slate-900" : "text-slate-500")}>
                                          {p.display_name}
                                          {p.is_current_user && <span className="ml-2 text-[10px] text-indigo-500 font-bold">(Tú)</span>}
                                      </p>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground truncate">{p.email || '-'}</p>
                                </div>
                            </div>

                            {/* DER: CONTROLES */}
                            <div className="flex items-center gap-2 shrink-0">
                                {isLoading && <Loader2 className="h-4 w-4 animate-spin text-slate-400 mr-2"/>}

                                {/* A. MULTI-SELECT DE RESPONSABILIDADES (Solo si es Admin/Owner) */}
                                {showResponsibilities && !isLoading && (
                                  <ResponsibilitiesSelector 
                                    selected={p.responsibilities}
                                    onChange={(newResp) => handleUpdate(p, { responsibilities: newResp })}
                                  />
                                )}

                                {/* B. SELECTOR DE ROL */}
                                <div className="w-[110px]">
                                    <Select 
                                        value={p.role} 
                                        onValueChange={(val) => handleUpdate(p, { role: val })}
                                        disabled={isLoading || (p.is_current_user && p.role === 'owner')}
                                    >
                                        <SelectTrigger className={cn("h-8 text-xs", !isActive && "text-muted-foreground bg-transparent border-slate-200")}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent align="end">
                                            <SelectItem value="owner" className="text-xs font-medium text-amber-700">Owner</SelectItem>
                                            <SelectItem value="admin" className="text-xs font-medium text-blue-700">Admin</SelectItem>
                                            <SelectItem value="member" className="text-xs text-slate-700">Miembro</SelectItem>
                                            <div className="my-1 border-t" />
                                            <SelectItem value="no_access" className="text-xs text-muted-foreground">Sin acceso</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                         </div>
                     );
                 })}
             </div>
         )}
      </div>
    </div>
  );
}

// --- SUB-COMPONENTE: SELECTOR MULTIPLE CON POPOVER ---
function ResponsibilitiesSelector({ 
  selected, 
  onChange 
}: { 
  selected: MemberResponsibility[], 
  onChange: (vals: MemberResponsibility[]) => void 
}) {
  const count = selected.length;
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={cn(
            "h-8 px-2 text-xs border-dashed flex gap-1.5",
            count > 0 ? "bg-blue-50 text-blue-700 border-blue-200" : "text-slate-500"
          )}
        >
          {count > 0 ? (
            <><Wrench className="h-3 w-3"/> {count}</>
          ) : (
            <><PlusCircle className="h-3 w-3"/> Tareas</>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="end">
        <div className="space-y-1">
            <h4 className="font-medium text-xs text-muted-foreground px-2 py-1 mb-1 uppercase tracking-wider">
              Asignar Tareas
            </h4>
            {RESPONSIBILITY_OPTIONS.map((opt) => {
              const isChecked = selected.includes(opt.id as MemberResponsibility);
              return (
                <div 
                  key={opt.id} 
                  className="flex items-center space-x-2 p-2 hover:bg-slate-50 rounded-md cursor-pointer transition-colors"
                  onClick={() => {
                    if (isChecked) onChange(selected.filter(s => s !== opt.id));
                    else onChange([...selected, opt.id as MemberResponsibility]);
                  }}
                >
                  <Checkbox 
                    id={`resp-${opt.id}`} 
                    checked={isChecked}
                    // El clic lo maneja el div padre para mejor UX
                    onCheckedChange={() => {}} 
                  />
                  <div className="grid gap-0.5 leading-none select-none">
                    <label 
                      htmlFor={`resp-${opt.id}`} 
                      className="text-sm font-medium flex items-center gap-2 cursor-pointer"
                    >
                      <opt.icon size={14} className="text-slate-500"/>
                      {opt.label}
                    </label>
                  </div>
                </div>
              );
            })}
        </div>
      </PopoverContent>
    </Popover>
  );
}