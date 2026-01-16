'use client'

import React, { useState } from "react"
import { useRouter } from 'next/navigation'
import { 
    createSharedCategory, deleteSharedCategory, updateSharedCategory,
    addSharedMember, deleteSharedMember,
    assignAccountManager, removeAccountManager // Asegúrate de tener estas actions
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

// Icons
import { 
    Settings, Users, CreditCard, Tag, Plus, Trash2, Check, Shield, ShieldAlert,
    X
} from "lucide-react"
import { SharedCategoryRow } from "../ui/SharedCategoryRow"

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

// --- COMPONENTE PRINCIPAL ---
export function GroupSettingsDialog({ 
    groupId, 
    initialData, 
    children 
}: { 
    groupId: string, 
    initialData: { members: SharedMember[], accounts: SharedAccount[], categories: SharedCategory[] },
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
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="members" className="gap-2"><Users className="h-4 w-4"/> Miembros</TabsTrigger>
                            <TabsTrigger value="categories" className="gap-2"><Tag className="h-4 w-4"/> Categorías</TabsTrigger>
                            <TabsTrigger value="accounts" className="gap-2"><CreditCard className="h-4 w-4"/> Cuentas</TabsTrigger>
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
                            <div className="text-center text-muted-foreground p-8">
                                <p>Gestión de cuentas en construcción...</p>
                                {/* Aquí iría el AccountsTab similar a MembersTab */}
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}