'use client';

import { useState } from 'react';
import { ChevronRight, MapPin } from 'lucide-react';
import { 
    Collapsible, 
    CollapsibleContent, 
    CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { 
    SidebarMenuButton, 
    SidebarMenuItem, 
    SidebarMenuSub, 
    SidebarMenuSubItem, 
    SidebarMenuSubButton 
} from '@/components/ui/sidebar';

interface Location {
    id: string;
    name: string;
    parent_id?: string | null;
}

interface Props {
    locations: Location[];
    activeLocation?: string | null;
    onLocationChange: (id: string | null) => void;
}

export function LocationTree({ locations, activeLocation, onLocationChange }: Props) {
    // 1. Separar padres de hijos
    const parents = locations.filter(l => !l.parent_id);
    
    const getChildren = (parentId: string) => 
        locations.filter(l => l.parent_id === parentId);

    return (
        <div className="space-y-1">
            {parents.map(parent => {
                const children = getChildren(parent.id);
                const hasChildren = children.length > 0;

                if (!hasChildren) {
                    return (
                        <SidebarMenuItem key={parent.id}>
                            <SidebarMenuButton 
                                isActive={activeLocation === parent.id}
                                onClick={() => onLocationChange(parent.id)}
                            >
                                <MapPin className="h-4 w-4 mr-2 opacity-50" />
                                <span>{parent.name}</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    );
                }

                return (
                    <Collapsible key={parent.id} className="group/collapsible">
                        <SidebarMenuItem>
                            <CollapsibleTrigger asChild>
                                <SidebarMenuButton 
                                    isActive={activeLocation === parent.id}
                                    className="w-full justify-between"
                                >
                                    <div className="flex items-center" onClick={(e) => {
                                        e.preventDefault(); // Evitamos que el trigger colapse si solo queremos filtrar
                                        onLocationChange(parent.id);
                                    }}>
                                        <MapPin className="h-4 w-4 mr-2 opacity-50" />
                                        <span>{parent.name}</span>
                                    </div>
                                    <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                </SidebarMenuButton>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <SidebarMenuSub className="ml-4 border-l border-slate-100 pl-2">
                                    {children.map(child => (
                                        <SidebarMenuSubItem key={child.id}>
                                            <SidebarMenuSubButton 
                                                isActive={activeLocation === child.id}
                                                onClick={() => onLocationChange(child.id)}
                                            >
                                                {child.name}
                                            </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                    ))}
                                </SidebarMenuSub>
                            </CollapsibleContent>
                        </SidebarMenuItem>
                    </Collapsible>
                );
            })}
        </div>
    );
}