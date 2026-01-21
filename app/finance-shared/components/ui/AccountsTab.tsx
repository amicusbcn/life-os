'use client'

import { useState } from 'react'
import { SharedAccount, SharedMember } from '@/types/finance-shared'
import { upsertAccount, deleteAccount } from '@/app/finance-shared/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Trash2, Plus, Pencil, X, Check } from 'lucide-react'
import LoadIcon from '@/utils/LoadIcon'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface AccountsTabProps {
    accounts: SharedAccount[]
    members: SharedMember[]
    groupId: string
}

export function AccountsTab({ accounts, members, groupId }: AccountsTabProps) {
    const router = useRouter()
    const [editingId, setEditingId] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    
    // Estado del formulario
    const [formData, setFormData] = useState<Partial<SharedAccount>>({})

    const handleEdit = (acc: SharedAccount) => {
        setEditingId(acc.id)
        setFormData(acc)
    }

    const handleCreate = () => {
        setEditingId('new')
        setFormData({
            name: '',
            type: 'checking', // IMPORTANTE: Coincide con el SQL ('checking', no 'bank')
            balance: 0,
            color: '#64748b',
            icon_name: 'Landmark',
            responsible_member_id: null
        })
    }

    const handleCancel = () => {
        setEditingId(null)
        setFormData({})
    }

    const handleSave = async () => {
        if (!formData.name) return toast.error('Nombre obligatorio')
        
        setLoading(true)
        const payload = {
            ...formData,
            id: editingId === 'new' ? undefined : editingId!
        } as Partial<SharedAccount>

        const res = await upsertAccount(groupId, payload)
        
        setLoading(false)
        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success('Guardado correctamente')
            setEditingId(null)
            router.refresh()
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Borrar esta cuenta?')) return
        const res = await deleteAccount(id)
        if (res.error) toast.error(res.error)
        else {
            toast.success('Cuenta eliminada')
            router.refresh()
        }
    }

    return (
        <div className="flex flex-col h-full pt-4">
            
            {/* MODO CREACIÓN / EDICIÓN */}
            {editingId && (
                <div className="mb-4 p-4 bg-slate-50 border border-indigo-100 rounded-lg animate-in slide-in-from-top-2">
                    <div className="space-y-3">
                        {/* Fila 1: Nombre y Color */}
                        <div className="flex gap-2">
                            <div className="flex-1 space-y-1">
                                <Label className="text-xs">Nombre</Label>
                                <Input 
                                    value={formData.name} 
                                    onChange={e => setFormData({...formData, name: e.target.value})} 
                                    placeholder="Ej: Visa Repsol"
                                    autoFocus
                                    className="bg-white"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Color</Label>
                                <Input 
                                    type="color"
                                    value={formData.color} 
                                    onChange={e => setFormData({...formData, color: e.target.value})} 
                                    className="w-12 p-1 h-10 bg-white"
                                />
                            </div>
                        </div>
                        
                        {/* Fila 2: Tipo e Icono */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <Label className="text-xs">Tipo</Label>
                                <Select 
                                    value={formData.type} 
                                    onValueChange={(val: any) => setFormData({
                                        ...formData, 
                                        type: val, 
                                        // Auto-asignar icono según tipo
                                        icon_name: val === 'credit' ? 'CreditCard' : (val === 'cash' ? 'Wallet' : 'Landmark')
                                    })}
                                >
                                    <SelectTrigger className="h-9 bg-white"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="checking">🏦 Banco</SelectItem>
                                        <SelectItem value="credit">💳 Tarjeta Crédito</SelectItem>
                                        <SelectItem value="cash">💶 Efectivo</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="space-y-1">
                                <Label className="text-xs">Icono (Lucide)</Label>
                                <Input 
                                    value={formData.icon_name} 
                                    onChange={e => setFormData({...formData, icon_name: e.target.value})} 
                                    className="h-9 bg-white"
                                />
                            </div>
                        </div>

                        {/* Fila 3: Responsable (Solo si es tarjeta) */}
                        {formData.type === 'credit' && (
                            <div className="space-y-1 pt-1 bg-purple-50 p-2 rounded border border-purple-100">
                                <Label className="text-xs text-purple-700 font-bold">Responsable (Titular)</Label>
                                <Select 
                                    value={formData.responsible_member_id || undefined} 
                                    onValueChange={val => setFormData({...formData, responsible_member_id: val})}
                                >
                                    <SelectTrigger className="h-9 border-purple-200 bg-white"><SelectValue placeholder="Selecciona miembro..." /></SelectTrigger>
                                    <SelectContent>
                                        {members.map(m => (
                                            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                            <Button size="sm" variant="ghost" onClick={handleCancel}>Cancelar</Button>
                            <Button size="sm" onClick={handleSave} disabled={loading}>
                                <Check className="w-4 h-4 mr-1"/> Guardar
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* BOTÓN NUEVA CUENTA (Solo si no editamos) */}
            {!editingId && (
                <div className="px-1 mb-4">
                    <Button 
                        variant="outline" 
                        className="w-full border-dashed text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200" 
                        onClick={handleCreate}
                    >
                        <Plus className="mr-2 h-4 w-4"/> Nueva Cuenta / Tarjeta
                    </Button>
                </div>
            )}

            {/* LISTA DE CUENTAS */}
            <div className="flex-1 overflow-y-auto pr-2 pb-4 space-y-2">
                {accounts.length === 0 && !editingId && (
                     <div className="text-center py-8 text-slate-400 italic text-sm">
                        No hay cuentas definidas.
                    </div>
                )}

                {accounts.map(acc => {
                    if (acc.id === editingId) return null // Ocultar el que se está editando para no duplicar visualmente
                    
                    return (
                        <div key={acc.id} className="flex items-center justify-between p-3 bg-white border rounded-lg group hover:border-indigo-200 transition-colors">
                            <div className="flex items-center gap-3">
                                <div 
                                    className="h-9 w-9 rounded-full flex items-center justify-center text-white shadow-sm"
                                    style={{ backgroundColor: acc.color || '#64748b' }}
                                >
                                    <LoadIcon name={acc.icon_name || 'Landmark'} className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">{acc.name}</p>
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <span>
                                            {acc.type === 'credit' ? 'Tarjeta Crédito' : acc.type === 'cash' ? 'Efectivo' : 'Banco'}
                                        </span>
                                        {acc.type === 'credit' && acc.responsible_member_id && (
                                            <span className="bg-purple-100 text-purple-700 px-1.5 rounded-full flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                                                {members.find(m => m.id === acc.responsible_member_id)?.name}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEdit(acc)}>
                                    <Pencil className="h-3 w-3 text-slate-400" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-red-600" onClick={() => handleDelete(acc.id)}>
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}