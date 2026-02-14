'use client';

import { useState } from 'react';
import { useProperty } from '../context/PropertyContext';
import { uploadPropertyDocument, deletePropertyDocument, getDocumentUrl } from '../actions';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet"; // <--- SHEET
import { FileText, Trash2, Upload, Eye, File, Loader2, Lock, Globe } from 'lucide-react';
import { toast } from "sonner";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { PropertyDocument } from '@/types/properties';

interface Props {
    documents: PropertyDocument[];
}

export function DocumentsManager({ documents }: Props) {
    const { property, can } = useProperty();
    const [isUploading, setIsUploading] = useState(false);
    const [isOpen, setIsOpen] = useState(false); // Controla el Sheet

    const handleView = async (url: string) => {
        const signedUrl = await getDocumentUrl(url);
        if (signedUrl) window.open(signedUrl, '_blank');
        else toast.error("No se pudo abrir el documento");
    };

    const handleDelete = async (doc: PropertyDocument) => {
        if (!confirm("¿Eliminar documento?")) return;
        try {
            await deletePropertyDocument(doc.id, doc.file_url, property.id);
            toast.success("Eliminado");
        } catch (error) {
            toast.error("Error al eliminar");
        }
    };

    const categories = [
        { id: 'legal', label: 'Legal / Escrituras', color: 'bg-blue-100 text-blue-700' },
        { id: 'insurance', label: 'Seguros', color: 'bg-green-100 text-green-700' },
        { id: 'contract', label: 'Contratos', color: 'bg-purple-100 text-purple-700' },
        { id: 'manual', label: 'Manuales', color: 'bg-orange-100 text-orange-700' },
        { id: 'invoice', label: 'Facturas', color: 'bg-slate-100 text-slate-700' },
        { id: 'other', label: 'Otros', color: 'bg-gray-100 text-gray-700' },
    ];

    const getCategoryBadge = (catId: string | null) => {
        const safeCatId = catId || 'other';
        const cat = categories.find(c => c.id === safeCatId) || categories[5];
        return <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${cat.color}`}>{cat.label}</span>;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Documentación</h2>
                    <p className="text-sm text-slate-500">Gestión de archivos, contratos y manuales.</p>
                </div>
                
                {/* --- NUEVO: SHEET EN LUGAR DE DIALOG --- */}
                {can('edit_house') && (
                    <Sheet open={isOpen} onOpenChange={setIsOpen}>
                        <SheetTrigger asChild>
                            <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-sm">
                                <Upload className="w-4 h-4 mr-2" /> Subir Archivo
                            </Button>
                        </SheetTrigger>
                        <SheetContent className="w-[400px] sm:w-[540px]">
                            <SheetHeader>
                                <SheetTitle>Añadir Documento</SheetTitle>
                                <SheetDescription>
                                    Sube archivos PDF, imágenes o contratos.
                                </SheetDescription>
                            </SheetHeader>
                            
                            <form action={async (formData) => {
                                setIsUploading(true);
                                formData.append('propertyId', property.id);
                                try {
                                    await uploadPropertyDocument(formData);
                                    toast.success("Documento guardado");
                                    setIsOpen(false);
                                } catch (e) {
                                    toast.error("Error al subir");
                                    console.error(e);
                                } finally {
                                    setIsUploading(false);
                                }
                            }} className="space-y-6 pt-6">
                                
                                <div className="space-y-2">
                                    <Label>Archivo</Label>
                                    <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors cursor-pointer relative">
                                        <Input type="file" name="file" required className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                                        <span className="text-sm text-slate-500">Click para seleccionar archivo</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Nombre</Label>
                                    <Input name="name" placeholder="Ej: Factura Luz Enero" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Categoría</Label>
                                        <Select name="category" defaultValue="other">
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {categories.map(c => (
                                                    <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* --- NUEVO: SELECTOR DE VISIBILIDAD --- */}
                                    <div className="space-y-2">
                                        <Label>Visibilidad</Label>
                                        <Select name="visibility" defaultValue="admins_only">
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="public">
                                                    <div className="flex items-center gap-2">
                                                        <Globe className="w-3 h-3 text-slate-500"/> <span>Todos</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="admins_only">
                                                    <div className="flex items-center gap-2">
                                                        <Lock className="w-3 h-3 text-amber-500"/> <span>Solo Admins</span>
                                                    </div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Notas</Label>
                                    <Input name="notes" placeholder="Detalles adicionales..." />
                                </div>

                                <div className="pt-4">
                                    <Button type="submit" disabled={isUploading} className="w-full">
                                        {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                        {isUploading ? 'Subiendo...' : 'Guardar Documento'}
                                    </Button>
                                </div>
                            </form>
                        </SheetContent>
                    </Sheet>
                )}
            </div>

            {/* LISTADO */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {documents.map((doc) => (
                    <Card key={doc.id} className="group hover:shadow-md transition-all border-slate-200">
                        <CardContent className="p-4 flex flex-col gap-3">
                            <div className="flex justify-between items-start">
                                <div className="p-2.5 bg-slate-50 rounded-xl text-slate-500 border border-slate-100">
                                    <FileText className="w-6 h-6" />
                                </div>
                                
                                <div className="flex gap-1">
                                    {/* INDICADOR DE PRIVACIDAD */}
                                    {doc.visibility === 'admins_only' && (
                                        <div className="p-1.5 rounded-full bg-amber-50 text-amber-600" title="Solo visible para administradores">
                                            <Lock className="w-3 h-3" />
                                        </div>
                                    )}
                                    
                                    {can('edit_house') && (
                                        <Button 
                                            variant="ghost" size="icon" 
                                            className="h-8 w-8 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => handleDelete(doc)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                            
                            <div>
                                <h4 className="font-semibold text-sm truncate text-slate-900" title={doc.name}>{doc.name}</h4>
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    {getCategoryBadge(doc.category)}
                                    <span className="text-[10px] text-slate-400 border-l pl-2 border-slate-200">
                                        {format(new Date(doc.created_at), "d MMM yy", { locale: es })}
                                    </span>
                                </div>
                                {doc.notes && (
                                    <p className="text-xs text-slate-400 mt-2 line-clamp-1">{doc.notes}</p>
                                )}
                            </div>

                            <Button variant="outline" size="sm" className="w-full mt-2 bg-slate-50 hover:bg-white hover:border-indigo-200 text-slate-600" onClick={() => handleView(doc.file_url)}>
                                <Eye className="w-3 h-3 mr-2" /> Ver Documento
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {documents.length === 0 && (
                <div className="text-center py-16 border-2 border-dashed rounded-2xl bg-slate-50/30">
                    <File className="w-12 h-12 mx-auto text-slate-200 mb-4" />
                    <h3 className="text-slate-900 font-medium">No hay documentos</h3>
                    <p className="text-slate-500 text-sm mt-1">Sube manuales, contratos o facturas.</p>
                </div>
            )}
        </div>
    );
}