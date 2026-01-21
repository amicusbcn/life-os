// /app/finance-shared/components/dialogs/JustificationDialog.tsx
'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { getOrphanExpenses, linkOrphansToParent, createChildTransaction } from '@/app/finance-shared/actions'
import { Loader2, Plus, Link, Trash2, AlertCircle } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function JustificationDialog({ 
    open, onOpenChange, 
    parentTransaction, // El objeto completo del cargo en cuenta (-500€)
    groupId, categories, members 
}: any) {
    const [loading, setLoading] = useState(false)
    const [orphans, setOrphans] = useState<any[]>([])
    const [existingChildren, setExistingChildren] = useState<any[]>([]) // Hijos ya guardados
    
    // Estado del formulario "Nuevo Hijo"
    const [newDesc, setNewDesc] = useState('')
    const [newAmount, setNewAmount] = useState('')
    const [newCatId, setNewCatId] = useState('')

    // Estado de selección de huérfanos
    const [selectedOrphans, setSelectedOrphans] = useState<string[]>([])

    // Carga inicial
    useEffect(() => {
        if (open && parentTransaction) {
            // 1. Cargar Huérfanos Candidatos
            getOrphanExpenses(groupId, parentTransaction.account_id, parentTransaction.date)
                .then(setOrphans)
            
            // 2. Aquí deberías cargar los hijos que YA tiene este padre (si vienes de BBDD)
            // (Asumimos que parentTransaction.children o similar existe, o hacemos fetch)
        }
    }, [open, parentTransaction, groupId])

    // CÁLCULOS EN TIEMPO REAL
    const totalCargo = Math.abs(parentTransaction?.amount || 0)
    
    // Suma de lo que ya está justificado en BBDD (si hubiera)
    const sumExisting = existingChildren.reduce((acc, curr) => acc + Math.abs(curr.amount), 0)
    
    // Suma de los huérfanos seleccionados
    const sumOrphans = orphans
        .filter(o => selectedOrphans.includes(o.id))
        .reduce((acc, curr) => acc + Math.abs(curr.amount), 0)

    const justifiedTotal = sumExisting + sumOrphans
    const remaining = totalCargo - justifiedTotal

    // --- ACCIONES ---

    const handleLinkOrphans = async () => {
        if (selectedOrphans.length === 0) return
        setLoading(true)
        await linkOrphansToParent(selectedOrphans, parentTransaction.id)
        
        // Refrescar UI (Mover de lista de huérfanos a lista de hijos)
        const movedItems = orphans.filter(o => selectedOrphans.includes(o.id))
        setExistingChildren([...existingChildren, ...movedItems])
        setOrphans(orphans.filter(o => !selectedOrphans.includes(o.id)))
        setSelectedOrphans([])
        setLoading(false)
        toast.success('Gastos vinculados correctamente')
    }

    const handleCreateChild = async () => {
        if (!newDesc || !newAmount) return
        setLoading(true)
        
        const payload = {
            date: parentTransaction.date, // Usamos fecha del padre por defecto
            amount: Math.abs(parseFloat(newAmount)),
            description: newDesc,
            type: 'expense',
            parent_transaction_id: parentTransaction.id,
            group_id: groupId,
            account_id: parentTransaction.account_id, // Hereda cuenta
            category_id: newCatId || null,
            // Allocations por defecto (opcional)
        }

        const res = await createChildTransaction(groupId, payload)
        if (res.data) {
            setExistingChildren([...existingChildren, res.data])
            setNewDesc('')
            setNewAmount('')
            toast.success('Gasto añadido al recibo')
        }
        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-slate-50">
                <DialogHeader>
                    <DialogTitle>Justificar Cargo de Tarjeta</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    
                    {/* BLOQUE 1: RESUMEN (Sticky top visual) */}
                    <div className="bg-white p-4 rounded-xl border shadow-sm grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs text-slate-400 uppercase font-bold">Total Recibo</p>
                            <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalCargo)}</p>
                            <p className="text-xs text-slate-500 truncate">{parentTransaction?.description}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-slate-400 uppercase font-bold">Por Justificar</p>
                            <p className={`text-2xl font-bold ${remaining > 0.01 ? 'text-amber-600' : 'text-green-600'}`}>
                                {formatCurrency(remaining)}
                            </p>
                            {remaining > 0.01 ? (
                                <p className="text-xs text-amber-600 font-medium flex items-center justify-end gap-1">
                                    <AlertCircle className="h-3 w-3" /> Incompleto
                                </p>
                            ) : (
                                <p className="text-xs text-green-600 font-medium">¡Todo cuadrado!</p>
                            )}
                        </div>
                    </div>

                    {/* BLOQUE 2: HIJOS YA VINCULADOS */}
                    {existingChildren.length > 0 && (
                        <div>
                            <Label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Detalle Justificado</Label>
                            <div className="bg-white rounded-lg border divide-y">
                                {existingChildren.map((child, idx) => (
                                    <div key={idx} className="p-3 flex justify-between items-center text-sm">
                                        <span>{child.description}</span>
                                        <span className="font-mono">{formatCurrency(child.amount)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* BLOQUE 3: AÑADIR NUEVO (FORMULARIO RÁPIDO) */}
                    {remaining > 0.01 && (
                        <div className="bg-white p-4 rounded-xl border shadow-sm space-y-3">
                            <Label className="text-sm font-semibold flex items-center gap-2">
                                <Plus className="h-4 w-4 text-indigo-600" /> Añadir gasto nuevo
                            </Label>
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                                <div className="sm:col-span-6">
                                    <Input placeholder="Concepto" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
                                </div>
                                <div className="sm:col-span-3">
                                    <Input type="number" placeholder="Importe" value={newAmount} onChange={e => setNewAmount(e.target.value)} />
                                </div>
                                <div className="sm:col-span-3">
                                    <Button onClick={handleCreateChild} disabled={loading} className="w-full bg-slate-900">
                                        Añadir
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* BLOQUE 4: CANDIDATOS HUÉRFANOS */}
                    {orphans.length > 0 && remaining > 0.01 && (
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                <Link className="h-3 w-3" /> Vincular gastos sueltos detectados
                            </Label>
                            <div className="bg-white rounded-lg border divide-y max-h-48 overflow-y-auto">
                                {orphans.map(orphan => (
                                    <div key={orphan.id} className="p-3 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                                        <Checkbox 
                                            checked={selectedOrphans.includes(orphan.id)}
                                            onCheckedChange={(chk) => {
                                                if(chk) setSelectedOrphans([...selectedOrphans, orphan.id])
                                                else setSelectedOrphans(selectedOrphans.filter(id => id !== orphan.id))
                                            }}
                                        />
                                        <div className="flex-1 text-sm">
                                            <div className="font-medium">{orphan.description}</div>
                                            <div className="text-xs text-slate-400">{new Date(orphan.date).toLocaleDateString()}</div>
                                        </div>
                                        <div className="text-sm font-bold text-slate-700">
                                            {formatCurrency(orphan.amount)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {selectedOrphans.length > 0 && (
                                <Button onClick={handleLinkOrphans} disabled={loading} variant="secondary" className="w-full">
                                    Vincular Seleccionados ({selectedOrphans.length})
                                </Button>
                            )}
                        </div>
                    )}

                </div>
            </DialogContent>
        </Dialog>
    )
}