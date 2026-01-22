'use client'

import React, { useState } from "react"
import { useRouter } from 'next/navigation'
// ✅ FIX: Importamos las acciones individuales nuevas
import { createRecipeCategory, updateRecipeCategory, deleteRecipeCategory } from '../actions'
import { MenuRecipeCategory } from "@/types/recipes" 

// UI Components
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from 'sonner'
import LoadIcon from "@/utils/LoadIcon"

// Icons
import { 
    Tag, Trash2, Plus, X, Check, Loader2, Search, Utensils
} from "lucide-react"
import { cn } from "@/lib/utils"

const QUICK_ICONS = ['Utensils', 'Pizza', 'Soup', 'Coffee', 'Beef', 'Egg', 'Apple', 'Cake', 'IceCream', 'Beer', 'Wine', 'Flame'];

// --- FILA DE CATEGORÍA ---
function CategoryRow({ category }: { category: MenuRecipeCategory }) {
    const [isEditing, setIsEditing] = useState(false)
    const [name, setName] = useState(category.name)
    const [icon, setIcon] = useState(category.icon || 'Tag')
    const [color, setColor] = useState(category.color || '#f97316')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    // ✅ FIX: Usamos la lógica separada para actualizar
    const handleSave = async () => {
        setLoading(true)
        const result = await updateRecipeCategory(category.id, name, icon, color)
        
        if (result.success) {
            toast.success('Guardado')
            setIsEditing(false)
            router.refresh()
        } else {
            toast.error(result.error)
        }
        setLoading(false)
    }

    const handleDelete = async () => {
        if (!confirm(`¿Borrar "${category.name}"?`)) return;
        const res = await deleteRecipeCategory(category.id);
        if (res.success) {
            toast.success("Eliminada");
            router.refresh();
        } else {
            toast.error(res.error);
        }
    };

    return (
        <div className="group mb-2">
            <div className={cn(
                "flex items-center gap-2 p-2 rounded-xl border border-slate-100 bg-white shadow-sm transition-all",
                isEditing ? "ring-2 ring-orange-500/20 border-orange-200" : ""
            )}>
                <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg border shadow-sm">
                    <input 
                        type="color" 
                        value={color} 
                        onChange={(e) => { setColor(e.target.value); setIsEditing(true) }}
                        className="absolute inset-0 scale-150 cursor-pointer"
                    />
                </div>

                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 bg-slate-50 shrink-0 rounded-lg"
                    onClick={() => setIsEditing(!isEditing)}
                >
                    <LoadIcon name={icon} className="h-4 w-4" style={{ color: color }} />
                </Button>

                <Input 
                    value={name} 
                    onChange={(e) => { setName(e.target.value); setIsEditing(true) }} 
                    className="flex-1 h-8 text-sm border-transparent focus:border-slate-100 bg-transparent font-bold text-slate-700"
                />

                <div className="flex gap-1">
                    {(isEditing) && (
                        <Button size="icon" variant="ghost" onClick={handleSave} disabled={loading} className="h-8 w-8 text-green-600 hover:bg-green-50">
                            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-4 w-4" />}
                        </Button>
                    )}
                    <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={handleDelete}
                        className="h-8 w-8 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {isEditing && (
                <div className="mt-2 p-3 bg-white rounded-xl border border-slate-200 shadow-xl animate-in slide-in-from-top-1 z-10 relative">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Icono de Receta</p>
                        <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => setIsEditing(false)}><X className="h-3 w-3"/></Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                        {QUICK_ICONS.map(i => (
                            <Button 
                                key={i} 
                                size="icon" 
                                variant={icon === i ? 'default' : 'outline'} 
                                className={cn("h-8 w-8 rounded-lg", icon === i ? "bg-orange-500 hover:bg-orange-600" : "")}
                                onClick={() => { setIcon(i); setIsEditing(true) }}
                            >
                                <LoadIcon name={i} className={cn("h-3.5 w-3.5", icon === i ? "text-white" : "")} />
                            </Button>
                        ))}
                    </div>
                    <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                        <Input 
                            placeholder="Buscar icono..." 
                            value={icon} 
                            onChange={(e) => { setIcon(e.target.value); setIsEditing(true) }}
                            className="h-8 pl-7 text-[10px] bg-slate-50 border-none"
                        />
                    </div>
                </div>
            )}
        </div>
    )
}

export function RecipeCategorySettingsDialog({ initialCategories, children }: any) {
    const [open, setOpen] = useState(false)
    const [showNewForm, setShowNewForm] = useState(false)

    const childElement = children as React.ReactElement;
    const trigger = React.cloneElement(childElement as React.ReactElement<any>, {
            onSelect: (e: Event) => {
                e.preventDefault();
                setOpen(true);
            },
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
                        <DialogTitle className="flex items-center gap-2 text-xl font-black">
                            <Utensils className="h-5 w-5 text-orange-500" /> Categorías de Cocina
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 flex flex-col overflow-hidden p-4">
                        <Button 
                            variant="outline" 
                            className="w-full mb-4 border-dashed border-orange-200 bg-white hover:bg-orange-50 text-orange-600 font-bold gap-2 h-12 rounded-xl transition-all"
                            onClick={() => setShowNewForm(!showNewForm)}
                        >
                            <Plus className="h-4 w-4" /> Nueva Categoría
                        </Button>

                        {showNewForm && (
                            <div className="mb-6 p-4 bg-white rounded-2xl border border-orange-100 shadow-lg animate-in zoom-in-95">
                                <NewCategoryForm onSuccess={() => setShowNewForm(false)} />
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto pr-1 space-y-1 custom-scrollbar">
                            {initialCategories.length === 0 && (
                                <p className="text-center text-sm text-slate-400 mt-10 italic">No hay categorías todavía</p>
                            )}
                            {initialCategories.map((cat: MenuRecipeCategory) => (
                                <CategoryRow key={cat.id} category={cat} />
                            ))}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}

function NewCategoryForm({ onSuccess }: { onSuccess: () => void }) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        const fd = new FormData(e.currentTarget)
        // ✅ FIX: Usamos createRecipeCategory en vez de upsert
        const result = await createRecipeCategory(
            fd.get('name') as string,
            fd.get('icon_name') as string || 'Utensils',
            fd.get('color') as string
        )

        if (result.success) {
            toast.success("Categoría creada")
            router.refresh()
            onSuccess()
        }
        setLoading(false)
    }

    return (
        <form onSubmit={handleCreate} className="space-y-4">
            <div className="flex gap-2">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border-2 border-slate-100 shadow-sm">
                    <input type="color" name="color" defaultValue="#f97316" className="absolute inset-0 scale-150 cursor-pointer" />
                </div>
                <Input name="icon_name" defaultValue="Utensils" className="w-24 h-10 bg-slate-50 border-none text-xs font-mono" placeholder="Icono" />
                <Input name="name" placeholder="Nombre..." required className="flex-1 h-10 bg-slate-50 border-none font-bold" />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-orange-600 hover:bg-orange-700 h-10 rounded-xl">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear Categoría"}
            </Button>
        </form>
    )
}