// /utils/LoadIcon.tsx (CORRECCIÓN HIDRATACIÓN)
'use client';

import dynamic from 'next/dynamic';
import { type LucideProps, Utensils } from 'lucide-react';
import React, { ComponentType } from 'react';

// --- TIPOS ---
interface LoadIconProps extends LucideProps {
    name: string;
}

// 1. Fallback estático (siempre debe ser renderizado igual en servidor y cliente)
const StaticFallback: ComponentType<LucideProps> = (props) => (
    <Utensils aria-label="Loading icon" {...props} />
);

// Función para obtener el componente Lucide
const getIconComponent = (iconName: string): ComponentType<LucideProps> => {
    
    // 🚨 El dynamic loader DEBE ser simple y DEBE usar ssr: false
    const IconLoader = dynamic(
        () => 
            import('lucide-react').then(mod => {
                const Icon = mod[iconName as keyof typeof mod];
                
                // Devuelve el componente encontrado o el FallbackIcon (que es un componente React)
                return (Icon || StaticFallback) as ComponentType<LucideProps>;
            }),
        { 
            loading: () => <div className="h-8 w-8 animate-pulse bg-gray-200 rounded-full" />, // Placeholder visible
            ssr: false, // 🚨 CRÍTICO: Forzar que la carga del SVG solo ocurra en el cliente
        }
    );
    
    return IconLoader;
};


export default function LoadIcon({ name, ...props }: LoadIconProps) {
    
    // Si no hay nombre, devolvemos el icono estático de fallback
    if (!name || name.trim() === '') {
        return <StaticFallback {...props} />;
    }
    
    const IconComponent = getIconComponent(name);

    // Renderizamos el componente dinámico
    return <IconComponent {...props} />;
}