// apps/finance/components/QuickCategoryDialog.tsx

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PlusCircle } from "lucide-react"

interface QuickCategoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    categories: any[];
    onCreated: (newCatId: string) => void;
}

export function QuickCategoryDialog({ open, onOpenChange, categories, onCreated }: QuickCategoryDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px] bg-white border-none shadow-2xl p-6">
                <DialogHeader className="mb-4">
                    <DialogTitle className="flex items-center gap-2 text-slate-800">
                        <PlusCircle className="h-5 w-5 text-indigo-500" /> Nueva Categoría Rápida
                    </DialogTitle>
                </DialogHeader>
                
                {/* Reutilizamos tu formulario existente con un pequeño tweak */}
                <NewCategoryForm 
                    categories={categories} 
                    onSuccess={(newId) => {
                        onCreated(newId);
                        onOpenChange(false);
                    }} 
                />
            </DialogContent>
        </Dialog>
    )
}