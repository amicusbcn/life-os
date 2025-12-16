'use client'

import React, { useState, useMemo, useEffect, useRef } from "react"
import { useRouter } from 'next/navigation'; // Necesario para router.refresh()
import { 
    createCategory, 
    deleteCategory, 
    updateCategory, 
    ActionResult, 
} from "@/app/finance/actions" 
import { FinanceCategory } from "@/types/finance" 

// UI Components & Hooks
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog"
import { Loader2, Tag, CornerDownRight, Pencil, Check, X, Trash2, Plus } from "lucide-react"
import { toast } from 'sonner';
import { useFormStatus } from 'react-dom'; 
import { useActionState } from 'react'; 

// --- Global/Shared Types ---
interface CloneableElementProps {
    onSelect?: (e: Event) => void;
    onClick?: (e: React.MouseEvent) => void;
}
interface CategorySettingsDialogProps {
    initialCategories: FinanceCategory[];
    children: React.ReactElement<CloneableElementProps>;
}

// --- TIPO AUXILIAR (Para la jerarquía) ---
interface CategoryWithLevel extends FinanceCategory {
    level: number;
}

// --- SUB-COMPONENTE: FILA DE CATEGORÍA (Lectura/Edición) ---
function CategoryRow({ category, categories }: { category: CategoryWithLevel, categories: FinanceCategory[] }) {
    const [isEditing, setIsEditing] = useState(false)
    const [loading, setLoading] = useState(false)
    const [tempName, setTempName] = useState(category.name)
    const [tempIcon, setTempIcon] = useState(category.icon || (category.is_income ? '➕' : '➖'))
    
    const router = useRouter(); 

    // updateCategory usa la firma (prevState, formData)
    const handleSave = async () => {
        setLoading(true)
        const formData = new FormData()
        formData.append('id', category.id)
        formData.append('name', tempName)
        formData.append('icon', tempIcon)

        try {
            // Se usa un objeto vacío como prevState si no se necesita
            const res = await updateCategory({} as ActionResult, formData) 
            if (res.success) {
                toast.success('Categoría actualizada.');
                setIsEditing(false)
                router.refresh(); // <-- Aún necesario
            } else {
                toast.error('Error al actualizar.', { description: res.error })
            }
        } catch (e) { 
            console.error(e) 
        } 
        finally { 
            setLoading(false) 
        }
    }

    const handleDelete = async () => {
        const childCount = categories.filter(c => c.parent_id === category.id).length;
        
        if(!confirm(`¿Borrar categoría "${category.name}"? ${childCount > 0 ? `Tiene ${childCount} subcategoría(s) asociada(s).` : ''} Asegúrate de que no tiene transacciones asociadas.`)) return
        
        setLoading(true)
        const res = await deleteCategory(category.id)
        if (res.error) {
            toast.error('Error al borrar categoría.', { description: res.error });
        } else {
            toast.success('Categoría eliminada.');
            router.refresh(); // <-- Aún necesario
        }
        setLoading(false)
    }

    // El resto del JSX se mantiene igual
    return (
        <div 
            className="flex items-center gap-3 p-2 rounded-lg border border-slate-100 bg-white shadow-sm group hover:border-indigo-100 transition-all min-h-[50px]"
            style={{ paddingLeft: `${category.level * 16 + 12}px` }} 
        >
            <div className="flex items-center shrink-0">
                {category.level > 0 ? (
                    <CornerDownRight className="h-4 w-4 text-slate-300 mr-2" />
                ) : (
                    <Tag className="h-4 w-4 text-slate-500 mr-2" />
                )}
            </div>

            {isEditing ? (
                <>
                    <Input 
                        value={tempIcon}
                        onChange={(e) => setTempIcon(e.target.value)}
                        className="h-8 w-10 text-center px-0 text-lg bg-slate-50"
                        maxLength={2}
                        autoFocus
                    />
                    <Input 
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        className="flex-1 h-8 text-sm"
                    />
                    <div className="flex gap-1 shrink-0">
                        <Button size="icon" variant="ghost" onClick={handleSave} disabled={loading} className="h-8 w-8 text-green-600 hover:bg-green-50">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4" />}
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setIsEditing(false)} disabled={loading} className="h-8 w-8 text-slate-400 hover:bg-slate-100">
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </>
            ) : (
                <>
                    <div className={`h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center text-lg border border-slate-100 shadow-sm shrink-0 ${category.is_income ? 'text-green-600' : 'text-red-600'}`}>
                        {category.icon || (category.is_income ? '➕' : '➖')}
                    </div>
                    <span className="flex-1 text-sm font-medium text-slate-700 truncate">{category.name}</span>
                    <span className={`text-xs font-semibold shrink-0 w-12 text-center rounded-full py-0.5 ${category.is_income ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {category.is_income ? 'Ingreso' : 'Gasto'}
                    </span>
                    
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <Button size="icon" variant="ghost" onClick={() => setIsEditing(true)} className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50">
                            <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={handleDelete} disabled={loading} className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50">
                            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <Trash2 className="h-3.5 w-3.5" />}
                        </Button>
                    </div>
                </>
            )}
        </div>
    )
}

// --- SUB-COMPONENTE: FORMULARIO DE CREACIÓN DE CATEGORÍA ---
function NewCategoryCreator({ categories }: { categories: FinanceCategory[] }) {
    
    const initialState: ActionResult = {}; 
    const [state, formAction] = useActionState(createCategory, initialState); 

    const { pending } = useFormStatus();
    const router = useRouter(); 
    const formRef = useRef<HTMLFormElement>(null);

    // useEffect para manejar el éxito y forzar la recarga
    useEffect(() => {
        if (state.success) {
            toast.success('Categoría creada con éxito.');
            formRef.current?.reset();
            router.refresh(); // <-- Recargar para que el componente padre envíe la nueva lista
        } else if (state.error) {
            toast.error('Error al crear categoría', { description: state.error });
        }
    }, [state, router]);

    // Lógica para ordenar las categorías de forma jerárquica para el Select
    const sortedCategories = useMemo(() => {
        const roots = categories.filter((c) => !c.parent_id)
        const buildTree = (parentId: string, level: number): CategoryWithLevel[] => {
            const children = categories
                .filter(c => c.parent_id === parentId)
                .sort((a, b) => a.name.localeCompare(b.name)); 
            let result: CategoryWithLevel[] = [];
            for (const child of children) {
                result.push({ ...child, level });
                result = [...result, ...buildTree(child.id, level + 1)]; 
            }
            return result;
        }
        let result: CategoryWithLevel[] = []
        roots.sort((a, b) => a.name.localeCompare(b.name)).forEach(root => {
            result.push({ ...root, level: 0 });
            result = [...result, ...buildTree(root.id, 1)];
        });
        return result
    }, [categories])

    return (
        <form ref={formRef} action={formAction} className="flex flex-col gap-2"> 
            <p className="text-xs font-semibold text-slate-400 uppercase ml-1">Nueva Categoría</p>
            
            <div className="flex gap-2">
                <Input name="icon" placeholder="💸" className="w-12 text-center bg-white h-10 px-0 shrink-0" maxLength={2} />
                <Input name="name" placeholder="Ej: Hipoteca, Sueldo, Supermercado" required disabled={pending} className="flex-1 bg-white h-10" />
            </div>

            <div className="grid grid-cols-3 gap-2">
                <select 
                    name="is_income" 
                    disabled={pending}
                    className="col-span-1 h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                    defaultValue="false"
                >
                    <option value="false">Gasto ➖</option>
                    <option value="true">Ingreso ➕</option>
                </select>

                <select 
                    name="parent_id" 
                    disabled={pending}
                    className="col-span-2 h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                    defaultValue="no-parent"
                >
                    <option value="no-parent">📁 Categoría Raíz</option>
                    {sortedCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                            {"\u00A0\u00A0".repeat(cat.level)} ↳ {cat.name}
                        </option>
                    ))}
                </select>
            </div>
            
            <Button type="submit" disabled={pending} className="bg-slate-900 h-10">
                {pending ? <Loader2 className="h-5 w-5 animate-spin"/> : <Plus className="h-5 w-5 mr-2"/>}
                Crear Categoría
            </Button>
        </form>
    );
}

// --- COMPONENTE PRINCIPAL ---

export function CategorySettingsDialog({ initialCategories, children }: CategorySettingsDialogProps) {
    const [open, setOpen] = useState(false)
    
    // --- CORRECCIÓN CLAVE: Usamos la prop directamente. ---
    const categories = initialCategories; 
    // ----------------------------------------------------
    
    // Lógica de árbol para renderizar las categorías (usa la prop 'categories')
    const sortedCategories = useMemo(() => {
        // ... misma lógica de construcción de árbol que NewCategoryCreator
        const roots = categories.filter((c) => !c.parent_id)
        const buildTree = (parentId: string, level: number): CategoryWithLevel[] => {
            const children = categories
                .filter(c => c.parent_id === parentId)
                .sort((a, b) => a.name.localeCompare(b.name)); 
            let result: CategoryWithLevel[] = [];
            for (const child of children) {
                result.push({ ...child, level });
                result = [...result, ...buildTree(child.id, level + 1)]; 
            }
            return result;
        }
        let result: CategoryWithLevel[] = []
        roots.sort((a, b) => a.name.localeCompare(b.name)).forEach(root => {
            result.push({ ...root, level: 0 });
            result = [...result, ...buildTree(root.id, 1)];
        });
        return result
    }, [categories]) // Dependencia: categories (la prop)


    const childElement = children as React.ReactElement<CloneableElementProps>;
    const newOnSelect = (e: Event) => {
        e.preventDefault(); 
        const originalOnSelect = (childElement.props as CloneableElementProps).onSelect;
        if (typeof originalOnSelect === 'function') {
            originalOnSelect(e);
        }
        setOpen(true); 
    };
    const trigger = React.cloneElement(childElement, {
        onSelect: newOnSelect,
        onClick: (e: React.MouseEvent) => e.stopPropagation(), 
    } as React.PropsWithChildren<CloneableElementProps>);


    return (
        <>
            {trigger}

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-md h-[550px] flex flex-col rounded-xl p-0 overflow-hidden bg-white">
                    <DialogHeader className="p-4 pb-2 border-b border-slate-100">
                        <DialogTitle>Gestión de Categorías</DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 flex flex-col gap-0 overflow-hidden">
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 relative">
                            {sortedCategories.length === 0 && <p className="text-center text-sm text-slate-400 mt-10">Sin categorías definidas</p>}
                            {sortedCategories.map((cat) => (
                                <CategoryRow key={cat.id} category={cat} categories={categories} />
                            ))}
                        </div>
                        
                        <div className="p-3 border-t border-slate-100 bg-slate-50">
                            <NewCategoryCreator categories={categories} /> 
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}