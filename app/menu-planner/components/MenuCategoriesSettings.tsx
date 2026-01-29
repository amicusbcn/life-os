// app/menu-planner/components/MenuCategoriesSettings.tsx
'use client'

import React, { useState } from 'react'
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Props {
    children: React.ReactNode;
    // Aquí puedes añadir tus props de datos (categories, etc.) cuando las tengas
}

export default function MenuCategoriesSettings({ children }: Props) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {/* Usamos DialogTrigger con asChild. 
                Esto inyectará automáticamente el onClick necesario 
                al SidebarMenuButton que pasamos como children.
            */}
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Gestionar Categorías</DialogTitle>
                </DialogHeader>
        
                <div className="py-4">
                    <p className="text-sm text-slate-500">
                        Aquí podrás crear, editar y asignar colores/iconos a categorías como: Carnes, Pescados, Vegan, Rápido, etc.
                    </p>
                    <Button 
                        className="mt-4 w-full" 
                        onClick={() => toast.info('Funcionalidad de gestión de categorías en desarrollo.')}
                    >
                        Abrir CRUD de Categorías
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}