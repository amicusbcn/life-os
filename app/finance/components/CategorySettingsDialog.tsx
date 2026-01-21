// apps/finance/components/CategorySettingsDialog.tsx
'use client'

import React, { useState, useMemo, useEffect } from "react"
import { useRouter } from 'next/navigation'
import { createCategory, deleteCategory, updateCategory, createRule, deleteRule, applyRuleRetroactively } from "@/app/finance/actions" 
import { FinanceCategory, FinanceRule } from "@/types/finance" 
import { ActionResponse } from "@/types/common"

// UI Components
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from 'sonner'
import LoadIcon from "@/utils/LoadIcon"

// Icons
import { 
    Tag, CornerDownRight, Trash2, Plus, Zap, Settings, X, Check, ChevronRight, Loader2, Palette, Search
} from "lucide-react"
import { cn } from "@/lib/utils"

const QUICK_ICONS = ['Tag', 'ShoppingCart', 'Utensils', 'Car', 'Home', 'Zap', 'HeartPulse', 'Plane', 'Gift', 'Smartphone', 'Banknote', 'Pizza'];

interface TriggerProps {
    onClick?: React.MouseEventHandler<HTMLElement>;
    onSelect?: (e: Event) => void;
}

// --- FILA DE CATEGORÍA ---
function CategoryRow({ category, categories }: { category: any, categories: FinanceCategory[] }) {
    const [isEditing, setIsEditing] = useState(false)
    const [name, setName] = useState(category.name)
    const [icon, setIcon] = useState(category.icon_name || 'Tag')
    const [color, setColor] = useState(category.color || '#64748b')
    const [isChanged, setIsChanged] = useState(false)
    const router = useRouter()

    const handleSave = async () => {
        const formData = new FormData()
        formData.append('id', category.id)
        formData.append('name', name)
        formData.append('icon_name', icon)
        formData.append('color', color)
        
        const res = await updateCategory({} as ActionResponse, formData)
        if (res.success) {
            toast.success('Guardado')
            setIsChanged(false)
            setIsEditing(false)
            router.refresh()
        }
    }

    return (
        <div className="group mb-2">
            <div 
                className={cn(
                    "flex items-center gap-2 p-2 rounded-lg border border-slate-100 bg-white shadow-sm transition-all",
                    isEditing ? "ring-2 ring-indigo-500/20 border-indigo-200" : ""
                )}
                style={{ marginLeft: `${category.level * 20}px` }}
            >
                {category.level === 0 ? (
                    <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md border shadow-sm">
                        <input 
                            type="color" 
                            value={color} 
                            onChange={(e) => { setColor(e.target.value); setIsChanged(true) }}
                            className="absolute inset-0 scale-150 cursor-pointer"
                        />
                    </div>
                ) : (
                    <CornerDownRight className="h-4 w-4 text-slate-300 ml-2 shrink-0" />
                )}

                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 bg-slate-50 shrink-0"
                    onClick={() => setIsEditing(!isEditing)}
                >
                    <LoadIcon name={icon} className="h-4 w-4" style={{ color: category.level === 0 ? color : '#64748b' }} />
                </Button>

                <Input 
                    value={name} 
                    onChange={(e) => { setName(e.target.value); setIsChanged(true) }} 
                    className="flex-1 h-8 text-sm border-transparent focus:border-slate-200 bg-transparent"
                />

                <div className="flex gap-1">
                    {(isChanged || isEditing) && (
                        <Button size="icon" variant="ghost" onClick={handleSave} className="h-8 w-8 text-green-600 hover:bg-green-50">
                            <Check className="h-4 w-4" />
                        </Button>
                    )}
                    <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => deleteCategory(category.id).then(() => router.refresh())}
                        className="h-8 w-8 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {isEditing && (
                <div className="mt-2 ml-10 p-3 bg-white rounded-xl border border-slate-200 shadow-md animate-in slide-in-from-top-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Seleccionar Icono</p>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                        {QUICK_ICONS.map(i => (
                            <Button 
                                key={i} 
                                size="icon" 
                                variant={icon === i ? 'default' : 'outline'} 
                                className={cn("h-8 w-8", icon === i ? "bg-indigo-600" : "")}
                                onClick={() => { setIcon(i); setIsChanged(true) }}
                            >
                                <LoadIcon name={i} className={cn("h-3.5 w-3.5", icon === i ? "text-white" : "")} />
                            </Button>
                        ))}
                    </div>
                    <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                        <Input 
                            placeholder="Nombre icono Lucide..." 
                            value={icon} 
                            onChange={(e) => { setIcon(e.target.value); setIsChanged(true) }}
                            className="h-8 pl-7 text-[10px]"
                        />
                    </div>
                </div>
            )}
        </div>
    )
}

// --- COMPONENTE PRINCIPAL ---
export function CategorySettingsDialog({ initialCategories, initialRules, children }: any) {
    const [open, setOpen] = useState(false)
    const [showNewForm, setShowNewForm] = useState(false)
    const router = useRouter()

    // 🚨 CORRECCIÓN TRIGGER: Lógica de apertura integrada
    const childElement = children as React.ReactElement;
    const trigger = React.cloneElement(childElement as React.ReactElement<any>, {
        onSelect: (e: Event) => {
            e.preventDefault();
            setOpen(true);
        },
        onClick: (e: React.MouseEvent) => {
            e.stopPropagation();
            if (typeof (childElement.props as any).onClick === 'function') {
                (childElement.props as any).onClick(e);
            }
            setOpen(true);
        }
    });

    const sortedCategories = useMemo(() => {
        const roots = initialCategories.filter((c: any) => !c.parent_id).sort((a: any, b: any) => a.name.localeCompare(b.name))
        const result: any[] = []
        const walk = (pid: string, lvl: number) => {
            initialCategories.filter((c: any) => c.parent_id === pid).forEach((c: any) => {
                result.push({ ...c, level: lvl })
                walk(c.id, lvl + 1)
            })
        }
        roots.forEach((r: any) => { result.push({ ...r, level: 0 }); walk(r.id, 1) })
        return result
    }, [initialCategories])

    return (
        <>
            {trigger}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[450px] h-[85vh] flex flex-col bg-slate-50 p-0 overflow-hidden border-none shadow-2xl">
                    <DialogHeader className="p-6 pb-2 bg-white border-b">
                        <DialogTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5 text-slate-500" /> Configuración Finanzas
                        </DialogTitle>
                    </DialogHeader>

                    <Tabs defaultValue="categories" className="flex-1 flex flex-col overflow-hidden">
                        <TabsList className="grid w-[90%] mx-auto grid-cols-2 mt-4 bg-slate-200/50 p-1">
                            <TabsTrigger value="categories" className="gap-2 text-xs data-[state=active]:bg-white shadow-none">
                                <Tag className="h-3.5 w-3.5"/> Categorías
                            </TabsTrigger>
                            <TabsTrigger value="rules" className="gap-2 text-xs data-[state=active]:bg-white shadow-none">
                                <Zap className="h-3.5 w-3.5"/> Reglas Auto
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="categories" className="flex-1 flex flex-col overflow-hidden p-4 pt-2">
                            <Button 
                                variant="outline" 
                                className="w-full mb-4 border-dashed border-slate-300 bg-white hover:bg-slate-50 text-slate-500 gap-2 h-11"
                                onClick={() => setShowNewForm(!showNewForm)}
                            >
                                <Plus className="h-4 w-4" /> Nueva Categoría
                            </Button>

                            {showNewForm && (
                                <div className="mb-6 p-4 bg-white rounded-xl border border-indigo-100 shadow-md">
                                    <NewCategoryForm categories={initialCategories} onSuccess={() => setShowNewForm(false)} />
                                </div>
                            )}

                            <div className="flex-1 overflow-y-auto pr-2 space-y-1">
                                {sortedCategories.length === 0 && <p className="text-center text-sm text-slate-400 mt-10 italic">Crea tu primera categoría para empezar</p>}
                                {sortedCategories.map(cat => (
                                    <CategoryRow key={cat.id} category={cat} categories={initialCategories} />
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="rules" className="flex-1 overflow-hidden">
                            <RulesManager rules={initialRules} categories={initialCategories} />
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>
        </>
    )
}

// --- RESTO DE SUB-COMPONENTES (RulesManager, NewRuleForm, NewCategoryForm) ---

function RulesManager({ rules, categories }: { rules: FinanceRule[], categories: FinanceCategory[] }) {
    const router = useRouter();
    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar esta regla?')) return;
        const res = await deleteRule(id);
        if (res.success) {
            toast.success("Regla eliminada");
            router.refresh();
        }
    };
    const [isRunning, setIsRunning] = useState<string | null>(null);

    const handleRunRetroactive = async (ruleId: string) => {
        setIsRunning(ruleId);
        const res = await applyRuleRetroactively(ruleId);
        
        if (res.success) {
            toast.success(`¡Magia hecha!`, { 
                description: `Se han categorizado ${res.count} movimientos antiguos.` 
            });
            router.refresh();
        } else {
            toast.error("Error al aplicar la regla");
        }
        setIsRunning(null);
    };
    return (
        <div className="flex flex-col h-full bg-slate-50">
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {rules.length === 0 && <p className="text-center text-sm text-slate-400 mt-10">No hay reglas definidas.</p>}
                {rules.map(rule => {
                    const category = categories.find(c => c.id === rule.category_id);
                    // Buscamos el color del padre si es subcategoría, si no el propio
                    const displayColor = category?.parent?.color || category?.color || '#94a3b8';

                    return (
                        <div key={rule.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm group hover:border-indigo-200 transition-all">
                            <div className="flex items-center gap-4 overflow-hidden">
                                
                                {/* 2. DISPARADOR: Patrón estilo Código */}
                                <code className="px-2 py-1 rounded bg-slate-100 text-slate-500 text-[10px] font-mono border border-slate-200 truncate italic">
                                    {rule.pattern}
                                </code>
                                <ChevronRight className="h-3 w-3 text-slate-300 shrink-0" />
                                {/* 1. DESTINO: Categoría Pill */}
                                <div 
                                    className="flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold border shrink-0"
                                    style={{ 
                                        backgroundColor: displayColor + '20', // Opacidad suave
                                        borderColor: displayColor + '40',
                                        color: displayColor
                                    }}
                                >
                                    <LoadIcon name={category?.icon_name || 'Tag'} className="w-3.5 h-3.5" />
                                    <span className="truncate max-w-[120px]">{category?.name || 'S/C'}</span>
                                </div>
                                
                            </div>

                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => handleRunRetroactive(rule.id)}
                                    disabled={isRunning === rule.id}
                                    className="h-8 w-8 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50"
                                    title="Aplicar a movimientos pasados"
                                >
                                    {isRunning === rule.id ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <Zap className="h-3.5 w-3.5" />
                                    )}
                                </Button>

                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => handleDelete(rule.id)} 
                                    className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="p-4 bg-white border-t border-slate-200">
                <NewRuleForm categories={categories} />
            </div>
        </div>
    );
}

function NewRuleForm({ categories }: { categories: FinanceCategory[] }) {
    const router = useRouter();
    const [pending, setPending] = useState(false);
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setPending(true);
        const fd = new FormData(e.currentTarget);
        const res = await createRule({}, fd);
        if (res.success) {
            toast.success("Regla creada");
            router.refresh();
            (e.target as HTMLFormElement).reset();
        }
        setPending(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nueva Regla de Auto-Clasificación</p>
            <div className="flex flex-col gap-2 p-3 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <Input name="pattern" placeholder="PATRÓN (Ej: MERCADONA)" required className="h-9 text-xs uppercase bg-white border-none shadow-sm" />
                <div className="flex gap-2">
                    <Select name="category_id" required>
                        <SelectTrigger className="h-9 text-xs bg-white flex-1 border-none shadow-sm"><SelectValue placeholder="Categoría..." /></SelectTrigger>
                        <SelectContent>
                            {categories.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Button type="submit" disabled={pending} size="sm" className="bg-slate-900 h-9 px-4">
                        {pending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Plus className="h-4 w-4" />}
                    </Button>
                </div>
            </div>
        </form>
    );
}

function NewCategoryForm({ categories, onSuccess }: { categories: any[], onSuccess: () => void }) {
    const router = useRouter()
    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        const res = await createCategory({} as any, fd)
        if (res.success) {
            toast.success("Creada")
            router.refresh()
            onSuccess()
        }
    }

    return (
        <form onSubmit={handleCreate} className="space-y-3">
            <div className="flex gap-2">
                <Input name="icon_name" placeholder="Tag" defaultValue="Tag" className="w-20 text-xs bg-slate-50 border-none" />
                <Input name="name" placeholder="Nombre de categoría..." required className="flex-1 bg-slate-50 border-none font-medium" />
            </div>
            <div className="flex gap-2">
                <Select name="parent_id" defaultValue="no-parent">
                    <SelectTrigger className="flex-1 text-xs bg-slate-50 border-none"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="no-parent">📁 Categoría Raíz</SelectItem>
                        {categories.filter(c => !c.parent_id).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Button type="submit" size="sm" className="bg-indigo-600 px-6">Crear</Button>
            </div>
        </form>
    )
}