// /app/finance-shared/components/dialogs/GroupSettingsDialog.tsx
'use client'

import React, { useState } from "react"
import { useRouter } from 'next/navigation'
import { 
    createSharedCategory, deleteSharedCategory, updateSharedCategory,
    addSharedMember, deleteSharedMember,
    assignAccountManager, removeAccountManager,createSplitTemplate, deleteSplitTemplate, updateSplitTemplate
} from "@/app/finance-shared/actions"
import { SharedCategory, SharedMember, SharedAccount } from "@/types/finance-shared"
import { EditMemberDialog } from './EditMemberDialog'
// UI Components
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from 'sonner'
import LoadIcon from "@/utils/LoadIcon" // Tu componente de iconos

import { SharedSplitTemplate } from "@/types/finance-shared"
// Icons
import { 
    Settings, Users, CreditCard, Tag, Plus, Trash2, Check, Shield, ShieldAlert,
    X,Wallet,
    Scale,
    Pencil,
    TextQuote
} from "lucide-react"
import { SharedCategoryRow } from "../ui/SharedCategoryRow"
import { AccountsTab } from "../ui/AccountsTab"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

// --- SUB-COMPONENTE: LISTA DE MIEMBROS ---
function MembersTab({ members, groupId, isAdmin }: { members: SharedMember[], groupId: string, isAdmin: boolean }) {
    const router = useRouter()
    const [newName, setNewName] = useState('')

    const handleAdd = async () => {
        if (!newName) return
        const res = await addSharedMember({ group_id: groupId, name: newName, role: 'member' })
        if (res.error) toast.error(res.error)
        else {
            toast.success('Miembro añadido')
            setNewName('')
            router.refresh()
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Seguro? Se borrará si no tiene gastos.')) return
        const res = await deleteSharedMember(id, groupId)
        if (res.error) toast.error(res.error)
        else {
            toast.success('Eliminado')
            router.refresh()
        }
    }

    return (
        <div className="space-y-4 pt-4">
            {isAdmin && (
                <div className="flex gap-2">
                    <Input 
                        placeholder="Nombre nuevo miembro..." 
                        value={newName} 
                        onChange={e => setNewName(e.target.value)}
                    />
                    <Button onClick={handleAdd} disabled={!newName}><Plus className="h-4 w-4"/></Button>
                </div>
            )}
            <div className="space-y-4 pt-4">
            {/* Input de añadir rápido se mantiene igual */}            
            <div className="space-y-2">
                {members.map(m => (
                    <div key={m.id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                                {m.name.substring(0,2).toUpperCase()}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium">{m.name}</p>
                                    {/* Mostrar Badge si es Admin */}
                                    {m.role === 'admin' && <Badge variant="secondary" className="text-[10px] h-5">Admin</Badge>}
                                </div>
                                {/* Mostrar estado de vinculación */}
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    {m.user_id ? (
                                        <span className="text-green-600 flex items-center gap-1">
                                            <Shield className="h-3 w-3"/> Vinculado
                                        </span>
                                    ) : (
                                        <span>Virtual</span>
                                    )}
                                    {m.email && <span className="opacity-50">({m.email})</span>}
                                </p>
                            </div>
                        </div>
                        
                        {isAdmin && (
                            <div className="flex gap-1">
                                {/* NUEVO: Botón de Editar */}
                                <EditMemberDialog member={m} groupId={groupId} />
                                
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(m.id)}>
                                    <Trash2 className="h-4 w-4 text-slate-300 hover:text-red-500"/>
                                </Button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
        </div>
    )
}

// --- SUB-COMPONENTE: CATEGORÍAS (Adaptado de tu código) ---
function CategoriesTab({ categories, groupId }: { categories: SharedCategory[], groupId: string }) {
    const router = useRouter()
    const [isCreating, setIsCreating] = useState(false)
    const [newCatName, setNewCatName] = useState('')

    // Ordenación simple alfabética
    const sortedCategories = [...categories].sort((a, b) => a.name.localeCompare(b.name))

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newCatName.trim()) return

        const res = await createSharedCategory({ 
            group_id: groupId, 
            name: newCatName, 
            icon_name: 'Tag',
            // parent_id ya no se usa
        })
        
        if (res.success) {
            setNewCatName('')
            setIsCreating(false)
            router.refresh()
            toast.success('Categoría creada')
        } else {
            toast.error(res.error)
        }
    }

    return (
        <div className="flex flex-col h-full pt-4">
            {/* Formulario de Creación */}
            <div className="px-1 mb-4">
                 {!isCreating ? (
                    <Button 
                        variant="outline" 
                        className="w-full border-dashed text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200" 
                        onClick={() => setIsCreating(true)}
                    >
                        <Plus className="mr-2 h-4 w-4"/> Nueva Categoría
                    </Button>
                 ) : (
                    <form onSubmit={handleCreate} className="p-3 bg-slate-50 rounded-lg border border-indigo-100 animate-in fade-in zoom-in-95">
                        <div className="flex gap-2">
                            <Input 
                                value={newCatName} 
                                onChange={e => setNewCatName(e.target.value)}
                                placeholder="Nombre de categoría..." 
                                autoFocus 
                                className="bg-white flex-1"
                            />
                            <Button type="submit" size="sm" disabled={!newCatName}>Crear</Button>
                            <Button type="button" variant="ghost" size="sm" onClick={() => setIsCreating(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </form>
                 )}
            </div>

            {/* Lista Plana */}
            <div className="flex-1 overflow-y-auto pr-2 pb-4">
                {sortedCategories.length === 0 && (
                    <div className="text-center py-8 text-slate-400 italic text-sm">
                        No hay categorías definidas.
                    </div>
                )}
                
                {sortedCategories.map(cat => (
                    <SharedCategoryRow 
                        key={cat.id} 
                        category={cat} 
                    />
                ))}
            </div>
        </div>
    )
}

function TemplatesTab({ templates, members, groupId }: { templates: SharedSplitTemplate[], members: SharedMember[], groupId: string }) {
    const router = useRouter()
    
    // Estado del Formulario
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null) // Si es null => Creando. Si tiene ID => Editando
    
    // Campos
    const [name, setName] = useState('')
    const [desc, setDesc] = useState('')
    const [weights, setWeights] = useState<Record<string, number>>({})

    // Abrir formulario para CREAR
    const handleStartCreate = () => {
        setEditingId(null)
        setName('')
        setDesc('')
        // Pesos por defecto: todos a 1
        const w: Record<string, number> = {}
        members.forEach(m => w[m.id] = 1)
        setWeights(w)
        setIsFormOpen(true)
    }

    // Abrir formulario para EDITAR
    const handleStartEdit = (t: SharedSplitTemplate) => {
        setEditingId(t.id)
        setName(t.name)
        setDesc(t.description || '')
        
        // Cargar pesos existentes
        const w: Record<string, number> = {}
        members.forEach(m => {
            // Buscar si este miembro tiene peso en la plantilla
            const tm = t.template_members?.find(x => x.member_id === m.id)
            w[m.id] = tm ? Number(tm.shares) : 1 // Si no existe en la plantilla (raro), ponemos 1 por defecto
        })
        setWeights(w)
        setIsFormOpen(true)
    }

    const handleSave = async () => {
        if (!name.trim()) return

        const memberList = Object.entries(weights).map(([mid, shares]) => ({
            member_id: mid,
            shares: shares
        }))

        let res
        if (editingId) {
            // ACTUALIZAR
            res = await updateSplitTemplate(editingId, {
                name,
                description: desc,
                members: memberList
            })
        } else {
            // CREAR
            res = await createSplitTemplate({
                group_id: groupId,
                name,
                description: desc,
                members: memberList
            })
        }

        if (res.error) toast.error(res.error)
        else {
            toast.success(editingId ? 'Plantilla actualizada' : 'Plantilla creada')
            setIsFormOpen(false)
            setEditingId(null)
            router.refresh()
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Borrar esta plantilla?')) return
        const res = await deleteSplitTemplate(id)
        if (res.error) toast.error(res.error)
        else {
            toast.success('Eliminada')
            router.refresh()
        }
    }

    return (
        <div className="flex flex-col h-full pt-4">
            
            {/* VISTA LISTA */}
            {!isFormOpen ? (
                <div className="space-y-4 px-1">
                    <Button 
                        variant="outline" 
                        className="w-full border-dashed text-slate-500 hover:text-indigo-600 hover:bg-indigo-50" 
                        onClick={handleStartCreate}
                    >
                        <Plus className="mr-2 h-4 w-4"/> Nueva Plantilla de Reparto
                    </Button>

                    <div className="space-y-2">
                        {templates.map(t => (
                            <div key={t.id} className="group flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm hover:border-indigo-200 transition-colors">
                                <div className="flex-1 cursor-pointer" onClick={() => handleStartEdit(t)}>
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-slate-700 text-sm">{t.name}</p>
                                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
                                            {t.template_members?.filter(tm => tm.shares > 0).length} miembros
                                        </span>
                                    </div>
                                    {t.description && (
                                        <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px] sm:max-w-xs">
                                            {t.description}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleStartEdit(t)}>
                                        <Pencil className="h-3.5 w-3.5 text-slate-400 hover:text-indigo-600"/>
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(t.id)}>
                                        <Trash2 className="h-3.5 w-3.5 text-slate-400 hover:text-red-500"/>
                                    </Button>
                                </div>
                            </div>
                        ))}
                        {templates.length === 0 && <p className="text-center text-xs text-slate-400 py-4">No hay plantillas definidas</p>}
                    </div>
                </div>
            ) : (
                
                // VISTA FORMULARIO (Crear / Editar)
                <div className="flex-1 flex flex-col px-1 h-full overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="flex items-center justify-between mb-4 border-b pb-4">
                        <h3 className="font-bold text-sm flex items-center gap-2">
                            {editingId ? <Pencil className="h-4 w-4 text-indigo-500"/> : <Plus className="h-4 w-4 text-indigo-500"/>}
                            {editingId ? 'Editar Plantilla' : 'Nueva Plantilla'}
                        </h3>
                        <Button variant="ghost" size="sm" onClick={() => setIsFormOpen(false)}>
                            <X className="h-4 w-4"/>
                        </Button>
                    </div>

                    <div className="space-y-4 flex-1 overflow-y-auto pr-2">
                        {/* Nombre */}
                        <div>
                            <Label className="text-xs font-bold uppercase text-slate-500">Nombre *</Label>
                            <Input 
                                value={name} onChange={e => setName(e.target.value)} 
                                placeholder="Ej: Viaje a París, Parejas..." autoFocus
                                className="mt-1"
                            />
                        </div>

                        {/* Descripción (Nuevo) */}
                        <div>
                            <Label className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2">
                                Descripción <span className="text-[10px] font-normal text-slate-400 lowercase">(opcional)</span>
                            </Label>
                            <div className="relative mt-1">
                                <TextQuote className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                <Input 
                                    value={desc} onChange={e => setDesc(e.target.value)} 
                                    placeholder="Ej: Juan paga doble, Marta no paga..."
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        {/* Pesos */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <Label className="text-xs font-bold uppercase text-slate-500">Pesos por Miembro</Label>
                                <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded border">
                                    0 = Excluido | 1 = Normal | 2 = Doble
                                </span>
                            </div>
                            
                            <div className="space-y-2">
                                {members.map(m => {
                                    const weight = weights[m.id] ?? 1
                                    const isExcluded = weight === 0
                                    
                                    return (
                                        <div key={m.id} className={cn(
                                            "flex items-center justify-between p-2 rounded border transition-all",
                                            isExcluded ? "bg-slate-50 border-slate-100 opacity-60" : "bg-white border-slate-200"
                                        )}>
                                            <div className="flex items-center gap-2">
                                                <div className={cn(
                                                    "h-8 w-8 rounded-full border flex items-center justify-center text-[10px] font-bold transition-colors",
                                                    isExcluded ? "bg-slate-100 text-slate-400" : "bg-indigo-50 text-indigo-600 border-indigo-100"
                                                )}>
                                                    {m.name.substring(0,2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <span className={cn("text-sm font-medium", isExcluded && "text-slate-500 line-through")}>
                                                        {m.name}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-slate-400">x</span>
                                                <Input 
                                                    type="number" 
                                                    min="0" 
                                                    step="0.5"
                                                    className={cn("w-16 h-8 text-center font-bold", isExcluded ? "text-slate-400" : "text-slate-900")}
                                                    value={weight}
                                                    onChange={e => setWeights(prev => ({...prev, [m.id]: parseFloat(e.target.value) || 0}))}
                                                />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t mt-2">
                        <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleSave} disabled={!name}>
                            {editingId ? 'Guardar Cambios' : 'Crear Plantilla'}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}

// --- COMPONENTE PRINCIPAL ---
export function GroupSettingsDialog({ 
    groupId, 
    initialData, 
    children 
}: { 
    groupId: string, 
    initialData: { members: SharedMember[], accounts: SharedAccount[], categories: SharedCategory[], splitTemplates?: SharedSplitTemplate[] },
    children: React.ReactNode 
}) {
    const [open, setOpen] = useState(false)
    const isAdmin = initialData.members.some(m => m.role === 'admin' /* Aquí deberíamos validar contra el user actual real */) 

    // Trigger hack para que funcione al hacer click en el menú
    const trigger = React.cloneElement(children as React.ReactElement<any>, {
        onClick: (e: React.MouseEvent) => {
            // Si el hijo ya tenía un onClick, lo ejecutamos primero (opcional pero buena práctica)
            if ((children as any).props.onClick) {
                (children as any).props.onClick(e);
            }
            e.preventDefault()
            setOpen(true)
        }
    })

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="p-6 pb-4 border-b">
                    <DialogTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5"/> Configuración del Grupo
                    </DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="members" className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-6 pt-4">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="members" className="gap-2"><Users className="h-4 w-4"/> Miembros</TabsTrigger>
                            <TabsTrigger value="categories" className="gap-2"><Tag className="h-4 w-4"/> Categorías</TabsTrigger>
                            <TabsTrigger value="accounts" className="gap-2"><CreditCard className="h-4 w-4"/> Cuentas</TabsTrigger>
                            <TabsTrigger value="templates" className="gap-2"><Scale className="h-4 w-4"/> <span className="hidden sm:inline">Plantillas</span></TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 pb-6">
                        <TabsContent value="members">
                            <MembersTab members={initialData.members} groupId={groupId} isAdmin={true} />
                        </TabsContent>
                        
                        <TabsContent value="categories">
                            <CategoriesTab categories={initialData.categories} groupId={groupId} />
                        </TabsContent>

                        <TabsContent value="accounts">
                            <AccountsTab 
                groupId={groupId} 
                accounts={initialData.accounts} 
                members={initialData.members}
            />
                        </TabsContent>
                        <TabsContent value="templates" className="h-full">
                            <TemplatesTab 
                                templates={initialData.splitTemplates || []} 
                                members={initialData.members} 
                                groupId={groupId} 
                            />
                        </TabsContent>
                    </div>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}