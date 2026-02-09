'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Settings, Home, Users, Box, Map, BellRing } from 'lucide-react';
import { PropertyForm } from "./PropertyForm";
import { LocationManager } from "./LocationManager";
import { MembersManager } from "./MembersManager";
import { useProperty } from "../context/PropertyContext";
import { DashboardAlerts } from "./DashboardAlerts";
import { PropertyAlert, ZoneWithRooms } from "@/types/properties";

// Props necesarias para pasar a los hijos
export function PropertySettings({ zones, alerts }: { zones: ZoneWithRooms[], alerts: PropertyAlert[] }) {
    const { property, can } = useProperty();

    return (
        <div className="flex flex-col md:flex-row gap-6">
            {/* 1. SIDEBAR DE NAVEGACIÓN (Izquierda) */}
            <Tabs defaultValue="general" orientation="vertical" className="w-full flex flex-col md:flex-row gap-6">
                <aside className="w-full md:w-64 shrink-0">
                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg">Configuración</CardTitle>
                            <CardDescription>Administra tu propiedad</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <TabsList className="flex flex-col h-auto bg-transparent p-2 space-y-1">
                                <TabsTrigger value="general" className="w-full justify-start px-4 py-2 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">
                                    <Settings className="w-4 h-4 mr-2" /> General
                                </TabsTrigger>
                                <TabsTrigger value="alerts" className="w-full justify-start px-4 py-2 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">
                                    <BellRing className="w-4 h-4 mr-2" /> Avisos y Tablón
                                </TabsTrigger>
                                
                                <TabsTrigger value="structure" className="w-full justify-start px-4 py-2 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">
                                    <Map className="w-4 h-4 mr-2" /> Estructura
                                </TabsTrigger>
                                
                                <TabsTrigger value="members" className="w-full justify-start px-4 py-2 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">
                                    <Users className="w-4 h-4 mr-2" /> Personas y Roles
                                </TabsTrigger>
                                <TabsTrigger value="modules" className="w-full justify-start px-4 py-2 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">
                                    <Box className="w-4 h-4 mr-2" /> Módulos
                                </TabsTrigger>
                            </TabsList>
                        </CardContent>
                    </Card>
                </aside>

                {/* 2. ÁREA DE CONTENIDO (Derecha) */}
                <div className="flex-1 min-w-0">
                    <TabsContent value="general" className="mt-0">
                        <div className="space-y-4">
                            <div className="mb-4">
                                <h3 className="text-lg font-medium">Información General</h3>
                                <p className="text-sm text-muted-foreground">Edita los detalles básicos de la casa.</p>
                            </div>
                            <PropertyForm />
                        </div>
                    </TabsContent>

                    <TabsContent value="structure" className="mt-0">
                         <div className="mb-4">
                            <h3 className="text-lg font-medium">Estructura y Zonas</h3>
                            <p className="text-sm text-muted-foreground">Define las plantas y habitaciones.</p>
                        </div>
                        <LocationManager propertyId={property.id} zones={zones} />
                    </TabsContent>

                    <TabsContent value="members" className="mt-0">
                        <div className="mb-4">
                            <h3 className="text-lg font-medium">Equipo y Accesos</h3>
                            <p className="text-sm text-muted-foreground">Gestiona quién tiene llaves de esta casa.</p>
                        </div>
                        <MembersManager />
                    </TabsContent>

                    <TabsContent value="modules" className="mt-0">
                        <Card>
                            <CardContent className="pt-6">
                                <p className="text-center text-slate-500">Gestor de módulos próximamente...</p>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="alerts" className="mt-0">
                        <div className="mb-6">
                            <h3 className="text-lg font-medium">Tablón de Anuncios</h3>
                            <p className="text-sm text-muted-foreground">Gestiona los avisos importantes que aparecen en el Dashboard.</p>
                        </div>
                        {/* Aquí ponemos el gestor completo (Crear/Borrar/Ver) */}
                        <DashboardAlerts alerts={alerts} />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}