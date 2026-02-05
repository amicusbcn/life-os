'use client'
// app\finance\components\AccountFormFields.tsx
import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FinanceAccountType, ACCOUNT_TYPES_META } from "@/types/finance";
import { cn } from "@/lib/utils";
import LoadIcon from "@/utils/LoadIcon";

interface AccountFormFieldsProps {
    data: {
        name: string;
        slug: string;
        number: string;
        balance: number | string;
        type: FinanceAccountType;
        autoMirror: boolean;
        importerId: string;
    };
    onChange: (field: string, value: any) => void;
    templates: any[];
}


export function AccountFormFields({ data, onChange, templates }: any) {
    const handleIBANChange = (val: string) => {
        const raw = val.replace(/\s/g, '');
        if (raw.length <= 24) onChange('number', raw);
    };

    const formatIBAN = (val: string) => {
        return val.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim().toUpperCase();
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            {/* CABECERA EDITABLE: COLOR + LETRA + NOMBRE */}
            <div className="flex items-center gap-3">
                <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-slate-200 shadow-sm">
                    <input 
                        type="color" 
                        value={data.color} 
                        onChange={(e) => onChange('color', e.target.value)}
                        className="absolute inset-0 scale-150 cursor-pointer"
                    />
                </div>
                <Input 
                    value={data.letter} 
                    onChange={(e) => onChange('letter', e.target.value.charAt(0).toUpperCase())}
                    className="h-9 w-9 p-0 text-center font-black uppercase bg-slate-50 border-slate-200"
                    maxLength={1}
                />
                <Input 
                    value={data.name} 
                    onChange={(e) => onChange('name', e.target.value)}
                    className="h-9 flex-1 text-sm font-bold bg-slate-50 border-slate-200"
                    placeholder="Nombre de la cuenta"
                />
            </div>

            {/* FILA 1: IBAN */}
            <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 px-1 italic">IBAN / Nº Cuenta</label>
                <Input 
                    value={formatIBAN(data.number || '')} 
                    onChange={(e) => handleIBANChange(e.target.value)}
                    className="h-9 text-[11px] bg-slate-50 border-none font-mono tracking-wider"
                    placeholder="ES00 0000..."
                />
            </div>

            {/* FILA 2: SLUG + SALDO */}
            <div className="flex gap-3">
                <div className="w-[70%] space-y-1">
                    <label className="text-[9px] font-black uppercase text-indigo-400 px-1 flex justify-between">
                        Slug URL <span className="text-[8px] lowercase opacity-50 italic">/transactions/{data.slug}</span>
                    </label>
                    <Input 
                        value={data.slug}
                        onChange={(e) => onChange('slug', e.target.value)} 
                        className="h-9 text-[10px] bg-slate-50 border-none font-mono text-indigo-600" 
                    />
                </div>
                <div className="w-[30%] space-y-1">
                     <label className="text-[9px] font-black uppercase text-slate-400 px-1 text-right block italic">Saldo Inic.</label>
                     <Input 
                        value={data.balance.toString().replace('.', ',')} 
                        onChange={(e) => onChange('balance', e.target.value.replace(',', '.'))}
                        className="h-9 text-[11px] bg-slate-50 border-none font-mono font-bold text-right"
                    />
                </div>
            </div>

            {/* FILA 3: PLANTILLA + ESPEJO */}
            <div className="grid grid-cols-2 gap-3 items-end">
                <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 px-1 italic">Plantilla Importación</label>
                    <Select value={data.importerId} onValueChange={(val) => onChange('importerId', val)}>
                        <SelectTrigger className="h-9 bg-slate-50 border-none text-[10px] font-bold">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none" className="text-xs font-bold uppercase">Manual</SelectItem>
                            {templates.map((t: any) => (
                                <SelectItem key={t.id} value={t.id} className="text-xs font-bold uppercase">{t.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center justify-between h-9 px-3 rounded-lg bg-slate-50 border border-slate-100/50">
                    <Label className="text-[9px] font-black uppercase text-slate-500 italic">Espejo</Label>
                    <Switch checked={data.autoMirror} onCheckedChange={(val) => onChange('autoMirror', val)} className="scale-75 data-[state=checked]:bg-emerald-500" />
                </div>
            </div>

            {/* FILA 4: TIPO */}
            <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 px-1 italic">Tipo de patrimonio</label>
                <div className="grid grid-cols-4 gap-2 p-1 bg-slate-100/50 rounded-xl">
                    {Object.entries(ACCOUNT_TYPES_META).map(([key, meta]: [any, any]) => (
                        <button
                            key={key} type="button"
                            onClick={() => onChange('type', key)}
                            className={cn(
                                "flex flex-col items-center justify-center p-2 rounded-lg border transition-all gap-1",
                                data.type === key ? "bg-white border-indigo-500 text-indigo-600 shadow-xs" : "bg-transparent border-transparent text-slate-400"
                            )}
                        >
                            <LoadIcon name={meta.icon} className="h-4 w-4" />
                            <span className="text-[7px] font-bold uppercase">{meta.label.split(' ')[0]}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}