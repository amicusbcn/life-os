'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { 
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter 
} from "@/components/ui/dialog";
import { Share2, Building2, User } from 'lucide-react';
import { transferItemToProperty } from '../actions';
import { toast } from 'sonner';

export function ItemTransferDialog({ item, properties, onTransferSuccess }: any) {
    console.log("LOG 4 [TransferDialog] - properties:", properties);
    const [open, setOpen] = useState(false);
    const [selectedProp, setSelectedProp] = useState(item.property_id || 'personal');

    const handleTransfer = async () => {
        const targetPropId = selectedProp === 'personal' ? null : selectedProp;
        // Por simplicidad inicial lo mandamos sin ubicación específica (el usuario la pondrá luego)
        const res = await transferItemToProperty(item.id, targetPropId, null);
        
        if (res.success) {
            toast.success("Ítem trasladado correctamente");
            setOpen(false);
            onTransferSuccess();
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Share2 className="w-4 h-4" /> Mover
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Trasladar "{item.name}"</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <p className="text-sm text-slate-500">Selecciona el nuevo destino para este objeto:</p>
                    <div className="grid gap-2">
                        <Button 
                            variant={selectedProp === 'personal' ? 'default' : 'outline'}
                            className="justify-start gap-2"
                            onClick={() => setSelectedProp('personal')}
                        >
                            <User className="w-4 h-4" /> Mi Inventario Personal
                        </Button>
                        {properties.map((p: any) => (
                            <Button 
                                key={p.id}
                                variant={selectedProp === p.id ? 'default' : 'outline'}
                                className="justify-start gap-2"
                                onClick={() => setSelectedProp(p.id)}
                            >
                                <Building2 className="w-4 h-4" /> {p.name}
                            </Button>
                        ))}
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleTransfer}>Confirmar Traslado</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}