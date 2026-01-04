// /utils/LoadIcon.tsx
'use client';

import dynamic from 'next/dynamic';
import { type LucideProps, HelpCircle } from 'lucide-react';
import React, { ComponentType, useMemo } from 'react';

interface LoadIconProps extends LucideProps {
    name: string;
}

// 1. Fallback consistente: un div vacío con el tamaño del icono
// Evitamos el "StaticFallback" de cubiertos para que no parpadee un tenedor antes de un banco.
const IconPlaceholder = ({ size = 20, className }: LucideProps) => (
    <div style={{ width: size, height: size }} className={className} />
);

// 2. Cache de componentes para evitar re-crear el componente dynamic en cada render
const iconCache: Record<string, ComponentType<LucideProps>> = {};

const getIconComponent = (iconName: string): ComponentType<LucideProps> => {
    if (iconCache[iconName]) return iconCache[iconName];

    const IconLoader = dynamic(
        async () => {
            try {
                const mod = await import('lucide-react');
                // @ts-ignore
                const Icon = mod[iconName];
                return Icon || HelpCircle;
            } catch (e) {
                return HelpCircle;
            }
        },
        { 
            // 🚨 El secreto: el loading debe tener el mismo tamaño que el icono
            loading: () => <IconPlaceholder />, 
            ssr: false,
        }
    );
    
    iconCache[iconName] = IconLoader;
    return IconLoader;
};

export default function LoadIcon({ name, size, ...props }: LoadIconProps) {
    // Memorizamos la búsqueda del componente para que no parpadee al escribir en otros inputs
    const IconComponent = useMemo(() => {
        if (!name || name.trim() === '') return HelpCircle;
        return getIconComponent(name);
    }, [name]);

    return <IconComponent size={size} {...props} />;
}