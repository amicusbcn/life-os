// app/travel/components/dialogs/CategorySettingsDialog.tsx
'use client'

import React, { useState } from "react"
import { useRouter } from 'next/navigation'
import { TravelCategory, TravelContext } from "@/types/travel"
import { updateTravelCategory, deleteTravelCategory, createTravelCategory } from "../../actions"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from 'sonner'
import LoadIcon from "@/utils/LoadIcon"
import { Tag, Trash2, Plus, Check, Search, Settings, Car } from "lucide-react"
import { cn } from "@/lib/utils"

const QUICK_ICONS = ['Tag', 'Bed', 'ShoppingCart', 'Plane', 'Hotel', 'ParkingCircle', 'Ticket', 'Bus', 'Coffee', 'Fuel'];

export function CategorySettingsDialog({ 
    initialCategories, 
    context, 
    children 
}: { 
    initialCategories: TravelCategory[], 
    context: TravelContext, 
    children: React.ReactNode 
}) {
    const [open, setOpen] = useState(false)
    const [showNewForm, setShowNewForm] = useState(false)
    const router = useRouter()

    // Manejador de apertura para el DropdownMenuItem
    const trigger = React.cloneElement(children as React.ReactElement<any>, {
        onClick: (e: React.MouseEvent) => {
            e.stopPropagation();
            setOpen(true);
        }
    });

    return (
        <>
            {trigger}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[450px] h-[80vh] flex flex-col bg-slate-50 p-0 overflow-hidden border-none shadow-2xl">
                    <DialogHeader className="p-6 pb-4 bg-white border-b">
                        <DialogTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5 text-slate-500" /> 
                            Categorías {context === 'work' ? 'Trabajo' : 'Personal'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        <Button 
                            variant="outline" 
                            className="w-full border-dashed border-slate-300 bg-white hover:bg-slate-50 text-slate-500 gap-2 h-11"
                            onClick={() => setShowNewForm(!showNewForm)}
                        >
                            <Plus className="h-4 w-4" /> Nueva Categoría
                        </Button>

                        {showNewForm && (
                            <NewCategoryForm context={context} onSuccess={() => setShowNewForm(false)} />
                        )}

                        <div className="space-y-2">
                            {initialCategories.map(cat => (
                                <CategoryRow key={cat.id} category={cat} />
                            ))}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}

function CategoryRow({ category }: { category: TravelCategory }) {
    const [isEditing, setIsEditing] = useState(false)
    const [name, setName] = useState(category.name)
    const [icon, setIcon] = useState(category.icon_key || 'Tag')
    const [rate, setRate] = useState(category.current_rate?.toString() || '0')
    const [isChanged, setIsChanged] = useState(false)
    const router = useRouter()

    const handleSave = async () => {
        const formData = new FormData()
        formData.append('id', category.id)
        formData.append('name', name)
        formData.append('icon_name', icon)
        if (category.is_mileage) formData.append('current_rate', rate)
        
        const res = await updateTravelCategory(formData)
        if (res.success) {
            toast.success('Guardado')
            setIsChanged(false)
            setIsEditing(false)
            router.refresh()
        }
    }

    return (
        <div className="group bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-3 flex items-center gap-3">
                <Button 
                    variant="ghost" size="icon" 
                    className="h-9 w-9 bg-slate-50 shrink-0"
                    onClick={() => setIsEditing(!isEditing)}
                >
                    <LoadIcon name={icon} className="h-4 w-4 text-indigo-600" />
                </Button>

                <div className="flex-1 min-w-0">
                    <Input 
                        value={name} 
                        onChange={(e) => { setName(e.target.value); setIsChanged(true) }} 
                        className="h-8 border-transparent focus:border-slate-100 bg-transparent font-medium p-0"
                    />
                    {category.is_mileage && (
                        <div className="flex items-center gap-1 text-emerald-600 text-[10px] font-bold">
                            <Car className="h-3 w-3" />
                            <Input 
                                type="number" 
                                value={rate}
                                step="0.01"
                                onChange={(e) => { setRate(e.target.value); setIsChanged(true) }}
                                className="h-4 w-12 p-0 border-none bg-transparent focus-visible:ring-0 font-mono"
                            />
                            <span>€/KM</span>
                        </div>
                    )}
                </div>

                <div className="flex gap-1">
                    {isChanged && (
                        <Button size="icon" variant="ghost" onClick={handleSave} className="h-8 w-8 text-green-600">
                            <Check className="h-4 w-4" />
                        </Button>
                    )}
                    <Button 
                        size="icon" variant="ghost" 
                        onClick={() => deleteTravelCategory(category.id).then(() => router.refresh())}
                        className="h-8 w-8 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {isEditing && (
                <div className="px-3 pb-3 border-t border-slate-50 pt-3 animate-in fade-in">
                    <div className="flex flex-wrap gap-1.5 mb-2">
                        {QUICK_ICONS.map(i => (
                            <Button 
                                key={i} size="icon" variant={icon === i ? 'default' : 'outline'} 
                                className={cn("h-7 w-7", icon === i ? "bg-indigo-600" : "text-slate-400")}
                                onClick={() => { setIcon(i); setIsChanged(true) }}
                            >
                                <LoadIcon name={i} className="h-3.5 w-3.5" />
                            </Button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

function NewCategoryForm({ context, onSuccess }: { context: TravelContext, onSuccess: () => void }) {
    const router = useRouter()
    const [isMileage, setIsMileage] = useState(false)

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        fd.append('context', context)
        fd.append('is_mileage', isMileage.toString())
        
        const res = await createTravelCategory(fd)
        if (res.success) {
            toast.success("Categoría creada")
            router.refresh()
            onSuccess()
        }
    }

    return (
        <form onSubmit={handleCreate} className="p-4 bg-white rounded-xl border border-indigo-100 shadow-md space-y-3">
            <div className="flex gap-2">
                <Input name="icon_name" placeholder="Tag" defaultValue="Tag" className="w-16 text-xs bg-slate-50 border-none" />
                <Input name="name" placeholder="Ej: Vuelos, Comidas..." required className="flex-1 bg-slate-50 border-none font-medium" />
            </div>
            
            <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                    <Car className="h-4 w-4" /> ¿Es Kilometraje?
                </div>
                <input 
                    type="checkbox" 
                    checked={isMileage} 
                    onChange={(e) => setIsMileage(e.target.checked)}
                    className="h-4 w-4 accent-indigo-600"
                />
            </div>

            {isMileage && (
                <div className="flex items-center gap-2">
                    <Input name="current_rate" type="number" step="0.01" placeholder="0.19" className="bg-slate-50 border-none" />
                    <span className="text-xs font-bold text-slate-400 font-mono">€/KM</span>
                </div>
            )}

            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 h-9">Crear Categoría</Button>
        </form>
    )
}