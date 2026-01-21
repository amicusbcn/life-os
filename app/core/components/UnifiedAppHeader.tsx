'use client'

import { usePathname } from 'next/navigation';
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Grip } from 'lucide-react'
import { UserMenu } from './UserMenu'
import { NotificationCenter } from './NotificationCenter' // <--- IMPORTANTE
import { UnifiedAppHeaderProps } from '@/types/common'

export function UnifiedAppHeader({ 
    title, 
    backHref, 
    rightAction, 
    userEmail, 
    userRole,
    moduleMenu, 
    maxWClass = 'max-w-xl' 
}: UnifiedAppHeaderProps) {
    const currentPath = usePathname(); 
    
    const showBackButton = backHref !== null && backHref !== undefined;
    const BackIcon = backHref === '/' ? Grip : ArrowLeft;
    
    return (
        <div className="sticky top-0 z-20 bg-white border-b border-slate-200/50 px-4 py-4 shadow-sm">
            <div className={`mx-auto flex items-center justify-between ${maxWClass}`}>
                
                {/* LADO IZQUIERDO */}
                <div className="flex items-center gap-3">
                    {backHref && (
                        <Link href={backHref} passHref>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-200 -ml-2 rounded-full">
                                <BackIcon className="h-5 w-5 text-slate-600" />
                            </Button>
                        </Link>
                    )}
                    <h1 className="text-xl font-bold text-slate-800 truncate">{title}</h1>
                </div>
                
                {/* LADO DERECHO */}
                <div className="flex items-center gap-1 sm:gap-2">
                    {/* Acción específica de la página */}
                    {rightAction} 

                    {/* Separador visual sutil (opcional) */}
                    {(rightAction) && <div className="h-6 w-px bg-slate-200 mx-1" />}

                    {/* Centro de Notificaciones (NUEVO) */}
                    <NotificationCenter />
                    
                    {/* Menú de Usuario */}
                    <UserMenu 
                        userEmail={userEmail} 
                        userRole={userRole} 
                        additionalItems={moduleMenu ? [moduleMenu] : []}
                        currentPath={currentPath}
                    />
                </div>
            </div>
        </div>
    );
}