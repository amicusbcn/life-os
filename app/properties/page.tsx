import { getUserData } from '@/utils/security';
import { UnifiedAppSidebar } from '@/components/layout/UnifiedAppSidebar';
import { getProperties } from './data';
import { PropertiesMenu } from './components/PropertiesMenu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, MapPin, Wifi } from 'lucide-react';
import Link from 'next/link';

export default async function PropertiesPage() {
    const { profile, accessibleModules } = await getUserData('properties');
    const properties = await getProperties();
    
    return (
        <UnifiedAppSidebar
            title="Gestión de Propiedades"
            profile={profile}
            modules={accessibleModules}
            moduleMenu={<PropertiesMenu mode="operative" properties={properties} />}
            moduleSettings={<PropertiesMenu mode="settings" properties={properties} />}
        >
            <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-slate-800">Panel General</h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {properties.map((prop) => (
                        <Link key={prop.id} href={`/properties/${prop.slug}`} className="group">
                            <Card className="h-full hover:shadow-lg transition-all border-l-4 border-l-transparent hover:border-l-blue-500 cursor-pointer">
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex items-center gap-2 text-slate-800 group-hover:text-blue-700">
                                        <Home className="w-5 h-5 text-slate-400" />
                                        {prop.name}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3 text-sm text-slate-500">
                                        <div className="flex items-start gap-2">
                                            <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                                            <span className="line-clamp-2">{prop.address || 'Sin dirección'}</span>
                                        </div>
                                        
                                        {prop.wifi_info?.ssid && (
                                            <div className="flex items-center gap-2">
                                                <Wifi className="w-4 h-4 shrink-0" />
                                                <span className="font-mono bg-slate-100 px-1 rounded text-xs">
                                                    {prop.wifi_info.ssid}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                    
                    {properties.length === 0 && (
                        <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                            <Home className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                            <h3 className="text-lg font-medium text-slate-600">No hay propiedades</h3>
                            <p className="text-slate-400 text-sm">Usa el botón "Nueva Propiedad" en el menú lateral.</p>
                        </div>
                    )}
                </div>
            </div>
        </UnifiedAppSidebar>
    );
}