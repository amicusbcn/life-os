// app/settings/holiday/components/HolidaySheet.tsx
'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { createHoliday } from '../actions';
import { toast } from "sonner"; // O tu sistema de notificaciones
import { Holiday } from '@/types/calendar';
import { updateHoliday } from '../data';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface HolidaySheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    localities: string[];
    holiday?:Holiday | null;
    initialDate?: Date | null;
    defaultLocality?: string;
}
export function HolidaySheet({ open, onOpenChange, localities,holiday, initialDate, defaultLocality }: HolidaySheetProps) {
    const [loading, setLoading] = useState(false);
    const [isNewLocality, setIsNewLocality] = useState(false);
    const isEditing = !!holiday;

    const { register, handleSubmit, watch, setValue, reset } = useForm();
    const selectedScope = watch('scope');
    const selectedLocality = watch('locality');
    useEffect(() => {
        if (holiday) {
            setIsNewLocality(false);
            const formattedDate = holiday.holiday_date 
                    ? new Date(holiday.holiday_date).toISOString().split('T')[0] 
                    : '';
            reset({ 
                    name: holiday.name, 
                    date: formattedDate, 
                    scope: holiday.scope, 
                    is_annual: holiday.is_annual,
                    locality: holiday.locality || '',
                    user_id: holiday.user_id || ''
                });
        } else {
            reset({ name: '', date: '', scope: 'national', is_annual: true });
        }
    }, [holiday, initialDate, open, defaultLocality]);

    

    const onSubmit = async (data: any) => {
        setLoading(true);
        try {
            let finalLocality = data.locality;
            if (data.locality === 'new_locality_trigger') {
                finalLocality = data.custom_locality;
            }
            const payload = {
                ...data,
                locality: finalLocality?.toLowerCase().trim() // Siempre a minúsculas para la BBDD
            };
            if (isEditing) {
                await updateHoliday(holiday.id, payload);
                toast.success("Festivo actualizado");
            } else {
                await createHoliday(payload);
                toast.success("Festivo creado");
            }
            onOpenChange(false);
        } catch (error) {
            toast.error("Error al guardar");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className={cn("sm:max-w-md p-4 border-l-2", isEditing ? "border-l-amber-500" : "border-l-indigo-300")}>
                <SheetHeader>
                    <SheetTitle className="text-2xl font-black uppercase tracking-tighter">
                        {isEditing ? 'Editar Festivo' : 'Nuevo Festivo'}
                    </SheetTitle>
                    <SheetDescription className="font-medium text-slate-500">
                        Añade una festividad al calendario global o personal.
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-8">
                    {/* Nombre */}
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nombre de la fiesta</Label>
                        <Input {...register('name', { required: true })} placeholder="Ej: San Juan" className="font-bold h-12 rounded-xl" />
                    </div>

                    {/* Fecha y Anualidad */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fecha</Label>
                            <Input type="date" {...register('date', { required: true })} className="font-bold h-12 rounded-xl" />
                        </div>
                        <div className="flex flex-col justify-center items-center p-2 bg-slate-50 rounded-xl border border-dashed">
                            <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">¿Es Anual?</Label>
                            <Switch 
                                checked={watch('is_annual')} 
                                onCheckedChange={(val) => setValue('is_annual', val)} 
                            />
                        </div>
                    </div>

                    {/* Ámbito (Scope) */}
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ámbito</Label>
                        <Select onValueChange={(val) => setValue('scope', val)} defaultValue="national">
                            <SelectTrigger className="h-12 rounded-xl font-bold">
                                <SelectValue placeholder="Seleccionar ámbito" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="national" className="font-bold">Nacional (Rojo)</SelectItem>
                                <SelectItem value="local" className="font-bold">Local (Azul)</SelectItem>
                                <SelectItem value="personal" className="font-bold text-purple-600">Personal (Violeta)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Condicional: Localidad */}
                    {selectedScope === 'local' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Localidad</Label>
                                <Select 
                                    onValueChange={(val) => {
                                        setValue('locality', val);
                                        setIsNewLocality(val === 'new_locality_trigger');
                                    }}
                                    value={selectedLocality}
                                >
                                    <SelectTrigger className="h-12 rounded-xl font-bold uppercase text-xs">
                                        <SelectValue placeholder="¿Dónde se celebra?" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {localities.map((loc: string) => (
                                            <SelectItem key={loc} value={loc.toLowerCase()} className="font-bold uppercase text-xs">
                                                {loc}
                                            </SelectItem>
                                        ))}
                                        <div className="h-px bg-slate-100 my-1" />
                                        <SelectItem value="new_locality_trigger" className="font-black text-indigo-600 uppercase text-[10px] bg-indigo-50/50">
                                            + Nueva Localidad
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Campo de texto extra para Nueva Localidad */}
                            {isNewLocality && (
                                <div className="space-y-2 animate-in zoom-in-95 duration-200">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Nombre de la nueva localidad</Label>
                                    <Input 
                                        {...register('custom_locality', { required: isNewLocality })}
                                        placeholder="Ej: Bilbao, Madrid..." 
                                        className="h-12 rounded-xl border-indigo-200 focus:border-indigo-500 font-bold"
                                    />
                                    <p className="text-[9px] text-slate-400 italic">Se añadirá automáticamente a la lista al guardar.</p>
                                </div>
                            )}
                        </div>
                    )}

                    <SheetFooter className="pt-8">
                        <Button type="submit" disabled={loading} className={isEditing ? "bg-amber-600" : "bg-indigo-600"}>
                        {loading ? "Procesando..." : isEditing ? "Guardar Cambios" : "Crear Festivo"}
                    </Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    );
}