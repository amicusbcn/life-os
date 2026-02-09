'use client';

import { useProperty } from '../context/PropertyContext';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from '@/components/ui/badge';
import { ScanFace, Ghost, X } from 'lucide-react';

interface Props {
  isAuthorized: boolean; // <--- NUEVA PROP: El servidor nos dice si podemos verlo
}

export function GodModeSwitcher({ isAuthorized }: Props) {
  const { members, currentUser, emulatedUser, setEmulatedUserId } = useProperty();

  // 1. SI NO ESTOY AUTORIZADO, NO RENDERIZO NADA
  if (!isAuthorized) return null;

  const isEmulating = !!emulatedUser;

  return (
    <div className="absolute top-8 right-6 z-50">
        <Popover>
            <PopoverTrigger asChild>
                <Button 
                    variant={isEmulating ? "destructive" : "outline"} 
                    size={isEmulating ? "default" : "icon"}
                    className={`gap-2 shadow-sm transition-all ${isEmulating ? 'animate-pulse' : 'text-slate-400 opacity-50 hover:opacity-100'}`}
                >
                    {isEmulating ? (
                        <>
                            <ScanFace className="w-4 h-4" />
                            <span className="text-xs font-mono">EMULANDO</span>
                        </>
                    ) : (
                        <Ghost className="w-4 h-4" />
                    )}
                </Button>
            </PopoverTrigger>
            
            <PopoverContent className="w-80 mr-4" align="end">
                <div className="space-y-4">
                    <div className="space-y-2 border-b pb-2">
                        <h4 className="font-medium leading-none flex items-center gap-2 text-red-600">
                            <Ghost className="w-4 h-4"/> 
                            MODO DIOS
                        </h4>
                        <p className="text-xs text-muted-foreground">
                            Herramienta de administración.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Suplantar Identidad</label>
                        <Select 
                            value={emulatedUser?.id || 'me'} 
                            onValueChange={(val) => setEmulatedUserId(val === 'me' ? null : val)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona usuario..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="me">
                                    <span className="font-medium text-slate-600">🚫 Sin Emulación (Soy Yo)</span>
                                </SelectItem>
                                <div className="h-px bg-slate-100 my-1 mx-2"/>
                                {members.filter(m => m.id !== currentUser?.id).map(m => (
                                    <SelectItem key={m.id} value={m.id}>
                                        <div className="flex items-center gap-2 w-full">
                                            <span className="truncate text-sm">{m.name}</span>
                                            <Badge variant="secondary" className="ml-auto text-[9px] h-4">
                                                {m.role}
                                            </Badge>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {isEmulating && (
                         <Button 
                            variant="destructive" 
                            size="sm" 
                            className="w-full text-xs"
                            onClick={() => setEmulatedUserId(null)}
                        >
                            <X className="w-3 h-3 mr-2"/> Salir del Modo Dios
                        </Button>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    </div>
  );
}