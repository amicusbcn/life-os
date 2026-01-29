// app/core/components/UnifiedAppSidebar.tsx
'use client'

import React from 'react'
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarSeparator, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSelector } from './AppSelector';
import { FeedbackDialog } from './FeedbackDialog';
import { NotificationCenter } from './NotificationCenter';
import { AppModule, UserProfile } from '@/types/users';
import { UserAccountMenu } from './UserAccountMenu';
import Link from 'next/link';
import { ChevronLeft, Grip } from 'lucide-react';

interface UnifiedAppSidebarProps {
    title: string;
    profile: UserProfile;
    moduleMenu: React.ReactNode;
    moduleSettings?: React.ReactNode;
    currentPath?: string |null;
    modules: AppModule[];
    backLink?:string | [string,string];
    children: React.ReactNode;
}


export function UnifiedAppSidebar({ 
    title, 
    profile, 
    moduleMenu,
    moduleSettings, 
    currentPath,
    modules,
    backLink,
    children
}: UnifiedAppSidebarProps) {

    return (
        <SidebarProvider defaultOpen={true}>
            <Sidebar collapsible="icon" className="border-slate-200">
                <SidebarHeader className="p-4 h-14 flex items-center border-b border-slate-50">
                    <Link href="/" className="flex items-center gap-3 group transition-opacity hover:opacity-80">
                        <div className="h-8 w-8 flex items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-200 group-data-[collapsible=icon]:h-7 group-data-[collapsible=icon]:w-7 transition-all">
                            <Grip className="h-5 w-5" />
                        </div>
                        <h2 className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent group-data-[collapsible=icon]:hidden">
                            Life<span className="text-indigo-600">-</span>OS
                        </h2>
                    </Link>
                </SidebarHeader>
                <SidebarContent>
                    <SidebarGroup className='mt-4'>
                        <SidebarMenu>{moduleMenu}</SidebarMenu>
                    </SidebarGroup>
                    {backLink && (
                      <>  
                        <div className="px-4 py-2">
                            <SidebarSeparator className="mx-auto w-1/2 opacity-50" />
                        </div>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild>
                                <Link href={Array.isArray(backLink)?backLink[0]:backLink}>
                                    <ChevronLeft className="h-4 w-4" />
                                    <span className="font-bold text-sm">{Array.isArray(backLink)?backLink[1]:"Volver"}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                      </>
                    )}
                </SidebarContent>

                <SidebarFooter className="p-2 border-t border-slate-100">
                    <SidebarMenu>
                        {/* Slot para configuración del módulo */}
                        {moduleSettings}
                        
                        {/* Feedback (Common para todos) */}
                        <SidebarMenuItem>
                            <FeedbackDialog/>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarFooter>
            </Sidebar>

            <div className="flex flex-col flex-1 min-h-screen">
                <header className="h-14 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-4 sticky top-0 z-20 shrink-0">
                    {/* LADO IZQUIERDO: Trigger y Título */}
                    <div className="flex items-center gap-3">
                        <SidebarTrigger />
                        <div className="h-6 w-px bg-slate-200 mx-1" />
                        {/* Título dinámico que viene por props */}
                        <h1 className="text-sm font-bold text-slate-700 uppercase tracking-wider truncate">
                            {title}
                        </h1>
                    </div>

                    {/* LADO DERECHO: Acciones globales */}
                    <div className="flex items-center gap-1 sm:gap-3">                        
                        {/* Menú tipo Google */}
                        <AppSelector modules={modules} />
                        
                        {/* Centro de Notificaciones */}
                        <NotificationCenter />
                        
                        {/* Menú de Usuario (Avatar) */}
                        <UserAccountMenu user={profile} />
                    </div>
                </header>
                
                {/* EL CHILDREN DEBE IR AQUÍ DENTRO */}
                <main className="flex-1 bg-slate-50/30 overflow-y-auto">
                    <div className="px-0 py-4 md:p-8"> {/* Padding controlado desde aquí */}
                        {children}
                    </div>
                </main>
            </div>
        </SidebarProvider>
    );
}