'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tag, MapPin, Plus, Trash2, Loader2 } from 'lucide-react';
import { createCategory, deleteCategory, createLocation, deleteLocation } from '../actions';
import { toast } from "sonner";

interface Props {
    categories: any[];
    locations: any[];
}

export function InventorySettingsContent({ categories, locations }: Props) {
    const [newCat, setNewCat] = useState('');
    const [newLoc, setNewLoc] = useState('');
    const [loading, setLoading] = useState(false);

    // Los handlers deben usar FormData para ser compatibles con tus nuevas actions
    const handleAddCategory = async () => {
        if(!newCat) return;
        setLoading(true);
        const formData = new FormData();
        formData.append('name', newCat);
        const res = await createCategory(formData);
        if(res.success) {
            setNewCat('');
            toast.success("Categoría creada");
        }
        setLoading(false);
    };

    const handleAddLocation = async () => {
        if(!newLoc) return;
        setLoading(true);
        const formData = new FormData();
        formData.append('name', newLoc);
        const res = await createLocation(formData);
        if(res.success) {
            setNewLoc('');
            toast.success("Ubicación creada");
        }
        setLoading(false);
    };

    return (
        <div className="space-y-6 px-6">
            <Tabs defaultValue="categories">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="categories" className="gap-2"><Tag className="w-4 h-4"/> Categorías</TabsTrigger>
                    <TabsTrigger value="locations" className="gap-2"><MapPin className="w-4 h-4"/> Ubicaciones</TabsTrigger>
                </TabsList>

                <TabsContent value="categories" className="space-y-4 pt-4">
                    <div className="flex gap-2">
                        <Input placeholder="Nueva categoría..." value={newCat} onChange={e => setNewCat(e.target.value)} />
                        <Button onClick={handleAddCategory} disabled={loading} size="icon">
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>
                    <div className="border rounded-md divide-y max-h-[300px] overflow-auto">
                        {categories.map(cat => (
                            <div key={cat.id} className="p-2 flex justify-between items-center bg-white group">
                                <span className="text-sm">{cat.name}</span>
                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => deleteCategory(cat.id)}>
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="locations" className="space-y-4 pt-4">
                    <div className="flex gap-2">
                        <Input placeholder="Nueva ubicación..." value={newLoc} onChange={e => setNewLoc(e.target.value)} />
                        <Button onClick={handleAddLocation} disabled={loading} size="icon">
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>
                    <div className="border rounded-md divide-y max-h-[300px] overflow-auto">
                        {locations.map(loc => (
                            <div key={loc.id} className="p-2 flex justify-between items-center bg-white group">
                                <span className="text-sm">{loc.name}</span>
                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => deleteLocation(loc.id)}>
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}