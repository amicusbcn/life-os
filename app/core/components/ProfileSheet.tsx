// components/profile/ProfileSheet.tsx
'use client';

import { useState, useEffect } from 'react';
import { updateProfile, updatePassword, updateEmail } from '../actions';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, BellRing, BellOff, ShieldCheck, Lock, Mail, User, MapPin, ChevronLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Definimos los modos para no liarnos con la lógica
type ProfileMode = 'view' | 'edit' | 'change_password' | 'change_email';

export function ProfileSheet({ open, onOpenChange, profile, localities }: any) {
    const [mode, setMode] = useState<ProfileMode>('view');
    const [loading, setLoading] = useState(false);
    
    // Estado del formulario unificado
    const [formData, setFormData] = useState({
        full_name: '',
        locality: '',
        email_preference: 'high_only',
        new_password: '',
        confirm_password: '',
        new_email: ''
    });

    // Sincronizar cuando el perfil cambia o se abre
    useEffect(() => {
        if (profile) {
            setFormData(prev => ({
                ...prev,
                full_name: profile.full_name || '',
                locality: profile.locality || '',
                email_preference: profile.email_preference || 'high_only',
            }));
        }
    }, [profile, open]);

    const handleSaveProfile = async () => {
        setLoading(true);
        try {
            await updateProfile(profile.id, {
                full_name: formData.full_name,
                locality: formData.locality,
                email_preference: formData.email_preference as any
            });
            toast.success("Perfil actualizado");
            setMode('view');
        } catch (e) {
            toast.error("Error al guardar");
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordUpdate = async () => {
        if (formData.new_password !== formData.confirm_password) return toast.error("No coinciden");
        setLoading(true);
        try {
            await updatePassword(formData.new_password);
            toast.success("Contraseña cambiada");
            setMode('view');
        } catch (e) { toast.error("Error"); }
        finally { setLoading(false); }
    };

    return (
        <Sheet open={open} onOpenChange={(o) => { onOpenChange(o); if(!o) setMode('view'); }}>
            <SheetContent className="sm:max-w-md bg-white border-l shadow-2xl p-0">
                
                {/* Header minimalista */}
                <div className="p-6 border-b flex items-center gap-4">
                    {mode !== 'view' && (
                        <Button variant="ghost" size="icon" onClick={() => setMode('view')} className="h-8 w-8 rounded-full">
                            <ChevronLeft size={20} />
                        </Button>
                    )}
                    <SheetTitle className="text-xl font-black uppercase tracking-tighter">
                        {mode === 'view' && "Mi Cuenta"}
                        {mode === 'edit' && "Editar Perfil"}
                        {mode === 'change_password' && "Nueva Contraseña"}
                        {mode === 'change_email' && "Cambiar Email"}
                    </SheetTitle>
                </div>

                <div className="p-8 space-y-8">
                    {/* --- MODO VISTA --- */}
                    {mode === 'view' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <section className="space-y-4">
                                <ViewItem label="Nombre" value={profile?.full_name} icon={<User size={14}/>} />
                                <ViewItem label="Correo Electrónico" value={profile?.email} icon={<Mail size={14}/>} />
                                <ViewItem label="Localidad" value={profile?.locality} icon={<MapPin size={14}/>} capitalize />
                                <ViewItem label="Notificaciones" 
                                    value={formData.email_preference === 'all' ? 'Todas' : formData.email_preference === 'none' ? 'Desactivadas' : 'Prioritarias'} 
                                    icon={<Bell size={14}/>} 
                                />
                            </section>

                            <div className="pt-4 space-y-3">
                                <Button onClick={() => setMode('edit')} className="w-full bg-slate-900 text-white h-12 rounded-xl font-bold uppercase text-[10px] tracking-widest">
                                    Editar Perfil
                                </Button>
                                <div className="grid grid-cols-2 gap-3">
                                    <Button variant="outline" onClick={() => setMode('change_password')} className="h-10 rounded-xl text-[10px] font-bold uppercase tracking-widest border-slate-200">
                                        <Lock size={14} className="mr-2" /> Password
                                    </Button>
                                    <Button variant="outline" onClick={() => setMode('change_email')} className="h-10 rounded-xl text-[10px] font-bold uppercase tracking-widest border-slate-200">
                                        <Mail size={14} className="mr-2" /> Email
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- MODO EDICIÓN --- */}
                    {mode === 'edit' && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-2">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Nombre Completo</Label>
                                <Input value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="h-12 border-slate-200 rounded-xl font-bold" />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Localidad</Label>
                                <Select value={formData.locality} onValueChange={v => setFormData({...formData, locality: v})}>
                                    <SelectTrigger className="h-12 border-slate-200 rounded-xl font-bold capitalize">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {localities.map((loc: string) => (
                                            <SelectItem key={loc} value={loc.toLowerCase()} className="capitalize">{loc}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Preferencias de Email</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    <PrefToggle 
                                        active={formData.email_preference === 'all'} 
                                        onClick={() => setFormData({...formData, email_preference: 'all'})}
                                        icon={<BellRing size={16}/>} label="Todas"
                                    />
                                    <PrefToggle 
                                        active={formData.email_preference === 'high_only'} 
                                        onClick={() => setFormData({...formData, email_preference: 'high_only'})}
                                        icon={<ShieldCheck size={16}/>} label="Prioridad"
                                    />
                                    <PrefToggle 
                                        active={formData.email_preference === 'none'} 
                                        onClick={() => setFormData({...formData, email_preference: 'none'})}
                                        icon={<BellOff size={16}/>} label="Off"
                                    />
                                </div>
                            </div>

                            <Button onClick={handleSaveProfile} disabled={loading} className="w-full bg-indigo-600 h-12 rounded-xl font-black uppercase text-[10px] tracking-widest mt-4">
                                <Save size={16} className="mr-2" /> Guardar Cambios
                            </Button>
                        </div>
                    )}

                    {/* --- MODO PASSWORD --- */}
                    {mode === 'change_password' && (
                        <div className="space-y-4 animate-in slide-in-from-right-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Nueva Password</Label>
                                <Input type="password" value={formData.new_password} onChange={e => setFormData({...formData, new_password: e.target.value})} className="h-12 border-slate-200 rounded-xl" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Confirmar</Label>
                                <Input type="password" value={formData.confirm_password} onChange={e => setFormData({...formData, confirm_password: e.target.value})} className="h-12 border-slate-200 rounded-xl" />
                            </div>
                            <Button onClick={handlePasswordUpdate} disabled={loading} className="w-full bg-slate-900 h-12 rounded-xl font-black uppercase text-[10px] tracking-widest">
                                Actualizar Contraseña
                            </Button>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}

// Auxiliares limpios
function ViewItem({ label, value, icon, capitalize }: any) {
    return (
        <div className="border-b border-slate-50 pb-4">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
                {icon} <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
            </div>
            <p className={cn("text-sm font-bold text-slate-800 ml-6", capitalize && "capitalize")}>{value || 'No definido'}</p>
        </div>
    );
}

function PrefToggle({ active, onClick, icon, label }: any) {
    return (
        <button onClick={onClick} className={cn(
            "flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all",
            active ? "border-indigo-600 bg-indigo-50 text-indigo-600" : "border-slate-100 text-slate-400 hover:border-slate-200"
        )}>
            {icon} <span className="text-[9px] font-black uppercase">{label}</span>
        </button>
    );
}