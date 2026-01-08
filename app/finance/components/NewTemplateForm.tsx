// app/finance/components/ImporterTemplatesDialog.tsx
'use client'

import React, { useState, useMemo } from "react"
import { useRouter } from 'next/navigation'
import { 
    createImporterTemplate, 
    updateImporterTemplate, 
    deleteImporterTemplate 
} from "@/app/finance/actions" 

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from 'sonner'
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"


export function NewTemplateForm({ onSuccess }: { onSuccess: () => void }) {
    const [name, setName] = useState("");
    const [pending, setPending] = useState(false);

    const handleSubmit = async () => {
        setPending(true);
        // Configuración inicial por defecto
        const defaultSettings = {
            delimiter: ";",
            skip_rows: 1,
            invert_sign: false,
            has_two_columns: false,
            column_map: { date: 0, concept: 1, amount: 2, charge: null, credit: null }
        };
        const res = await createImporterTemplate(name, defaultSettings);
        if (res.success) {
            toast.success("Plantilla creada");
            onSuccess();
        }
        setPending(false);
    };

    return (
        <div className="mb-6 p-4 bg-white rounded-xl border border-indigo-100 shadow-md animate-in slide-in-from-top-2">
            <Label className="text-[10px] font-bold uppercase text-slate-400">Nombre de la Plantilla</Label>
            <div className="flex gap-2 mt-1">
                <Input 
                    placeholder="Ej: Visa Santander CSV" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    className="h-9 bg-slate-50 border-none"
                />
                <Button onClick={handleSubmit} disabled={pending || !name} className="bg-indigo-600 h-9">
                    {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear"}
                </Button>
            </div>
        </div>
    );
}