'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateSharedCategory, deleteSharedCategory } from '@/app/finance-shared/actions'
import { SharedCategory } from '@/types/finance-shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import LoadIcon from '@/utils/LoadIcon'
import { Check, Trash2, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

const QUICK_ICONS = ['Tag', 'ShoppingCart', 'Utensils', 'Car', 'Home', 'Zap', 'HeartPulse', 'Plane', 'Gift', 'Smartphone', 'Banknote', 'Pizza', 'Baby', 'Beer', 'Coffee']

interface Props {
    category: SharedCategory
}

export function SharedCategoryRow({ category }: Props) {
    const [isEditing, setIsEditing] = useState(false)
    
    // Estado local para edición
    const [name, setName] = useState(category.name)
    const [icon, setIcon] = useState(category.icon_name || 'Tag')
    const [color, setColor] = useState(category.color || '#94a3b8')
    
    const router = useRouter()

    const handleSave = async () => {
        const res = await updateSharedCategory(category.id, {
            name,
            icon_name: icon,
            color
        })

        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success('Categoría actualizada')
            setIsEditing(false)
            router.refresh()
        }
    }

    const handleDelete = async () => {
        if (!confirm('¿Borrar categoría? Se pondrán a NULL los gastos asociados.')) return
        const res = await deleteSharedCategory(category.id)
        if (res.error) toast.error(res.error)
        else {
            toast.success('Eliminada')
            router.refresh()
        }
    }

    return (
        <div className="group mb-2 relative">
            {/* FILA VISUAL */}
            <div 
                className={cn(
                    "flex items-center gap-2 p-2 rounded-lg border border-slate-100 bg-white shadow-sm transition-all",
                    isEditing ? "ring-2 ring-indigo-500/20 border-indigo-200" : ""
                )}
            >
                {/* Selector de Color */}
                <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md border shadow-sm group-hover:border-slate-300 transition-colors">
                    <div 
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ backgroundColor: color }}
                    >
                        <input 
                            type="color" 
                            value={color} 
                            onChange={(e) => { setColor(e.target.value); setIsEditing(true) }}
                            className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                        />
                    </div>
                </div>

                {/* Botón Icono (Abre edición) */}
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 bg-slate-50 shrink-0 border border-slate-100 text-slate-500"
                    onClick={() => setIsEditing(!isEditing)}
                >
                    <LoadIcon name={icon} className="h-4 w-4" />
                </Button>

                {/* Input Nombre */}
                <Input 
                    value={name} 
                    onChange={(e) => { setName(e.target.value); setIsEditing(true) }} 
                    className={cn(
                        "flex-1 h-8 text-sm border-transparent bg-transparent focus:bg-white transition-all font-medium text-slate-700",
                        isEditing && "border-slate-200 focus:border-indigo-300"
                    )}
                />

                {/* Acciones */}
                <div className="flex gap-1">
                    {isEditing && (
                        <Button size="icon" variant="ghost" onClick={handleSave} className="h-8 w-8 text-green-600 hover:bg-green-50">
                            <Check className="h-4 w-4" />
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

            {/* PANEL DE SELECCIÓN DE ICONOS (Flotante) */}
            {isEditing && (
                <div className="mt-2 ml-10 p-3 bg-white rounded-xl border border-slate-200 shadow-lg animate-in slide-in-from-top-2 z-10">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Icono</p>
                    
                    <div className="flex flex-wrap gap-1.5 mb-3">
                        {QUICK_ICONS.map(i => (
                            <Button 
                                key={i} 
                                size="icon" 
                                variant={icon === i ? 'default' : 'outline'} 
                                className={cn("h-7 w-7", icon === i ? "bg-indigo-600" : "")}
                                onClick={() => setIcon(i)}
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
                            onChange={(e) => setIcon(e.target.value)}
                            className="h-7 pl-7 text-[10px]"
                        />
                    </div>
                </div>
            )}
        </div>
    )
}