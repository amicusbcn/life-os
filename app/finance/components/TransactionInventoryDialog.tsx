// app/finance/components/TransactionInventoryDialog.tsx
'use client'

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FinanceTransaction } from '@/types/finance';
import { PackagePlus, Link2, ArrowRight, Boxes, Calendar, Euro, X } from 'lucide-react';
import { toast } from 'sonner';
import { createInventoryItemFromTxAction, linkTransactionToInventoryAction, getInventoryItemsAction } from '../actions';

export function TransactionInventoryDialog({ 
    transaction, 
    onClose 
}: { 
    transaction: FinanceTransaction, 
    onClose: () => void 
}) {
    const [mode, setMode] = useState<'select' | 'create' | 'link'>('select');
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState(transaction.notes || transaction.concept);
    const [inventory, setInventory] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [isInitialPurchase, setIsInitialPurchase] = useState(false);

    useEffect(() => {
    // Solo cargamos si el usuario elige "Vincular" y la lista está vacía
        if (mode === 'link' && inventory.length === 0) {
            const loadInventory = async () => {
                setLoading(true);
                const res = await getInventoryItemsAction();
                if (res.success) {
                    setInventory(res.data || []);
                } else {
                    toast.error("No se pudo cargar el inventario");
                }
                setLoading(false);
            };
            loadInventory();
        }
    }, [mode, inventory.length]);

    // Lógica de guardado (Alta Nueva)
    const handleCreate = async () => {
        setLoading(true);
        const res = await createInventoryItemFromTxAction(transaction.id, {
            name,
            date: transaction.date,
            price: Math.abs(transaction.amount)
        });

        if (res.success) {
            toast.success("¡Objeto añadido al inventario!");
            onClose();
        } else {
            toast.error("Error: " + res.error);
        }
        setLoading(false);
    };

    // Lógica de vinculación (Existente)
    const handleLink = async () => {
        if (!selectedItemId) return;
        setLoading(true);
        const res = await linkTransactionToInventoryAction(
            transaction.id, 
            selectedItemId, 
            isInitialPurchase // <-- Añade este tercer argumento
        );
        if (res.success) {
            toast.success("Vinculado correctamente");
            onClose();
        } else {
            toast.error("Error al vincular");
        }
        setLoading(false);
    };

    const filteredInventory = inventory.filter(item => 
        item.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[450px] bg-slate-900 text-white border-slate-800 shadow-2xl p-0 overflow-hidden">
                <div className="p-6 border-b border-slate-800/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Boxes className="h-6 w-6 text-emerald-400" />
                        <h2 className="text-xl font-black text-emerald-400 uppercase tracking-tighter">Gestión de Inventario</h2>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* INFO DE LA TRANSACCIÓN */}
                    <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                        <p className="text-[10px] font-black uppercase text-slate-500 mb-1 tracking-widest">Movimiento detectado</p>
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-sm font-bold text-slate-200 truncate w-64">{transaction.notes || transaction.concept}</h3>
                                <p className="text-[10px] text-slate-500">{transaction.date}</p>
                            </div>
                            <p className="text-xl font-mono font-black text-emerald-400">{Math.abs(transaction.amount).toFixed(2)}€</p>
                        </div>
                    </div>

                    {/* --- ESTA ES LA PARTE QUE TE FALTABA: MODO SELECT --- */}
                    {mode === 'select' && (
                        <div className="grid gap-3 animate-in fade-in zoom-in-95 duration-200">
                            <button 
                                onClick={() => setMode('create')}
                                className="flex items-center gap-4 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all text-left group"
                            >
                                <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-lg">
                                    <PackagePlus className="h-6 w-6 text-white" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-white">Alta de nuevo objeto</p>
                                    <p className="text-[10px] text-indigo-300/60 font-medium uppercase tracking-tighter">Registrar como ítem nuevo</p>
                                </div>
                                <ArrowRight className="h-4 w-4 text-indigo-500 group-hover:translate-x-1 transition-transform" />
                            </button>

                            <button 
                                onClick={() => setMode('link')}
                                className="flex items-center gap-4 p-4 rounded-2xl bg-slate-800/30 border border-slate-800 hover:border-slate-600 transition-all text-left group"
                            >
                                <div className="h-10 w-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
                                    <Link2 className="h-6 w-6 text-slate-400" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-slate-200">Vincular a existente</p>
                                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tighter">Añadir gasto a un ítem actual</p>
                                </div>
                                <ArrowRight className="h-4 w-4 text-slate-600 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    )}

                    {/* MODO LINK (Vincular) */}
                    {mode === 'link' && (
                        <div className="space-y-4 animate-in slide-in-from-right-2">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                                    Buscar en tu Inventario
                                </label>
                                <Input 
                                    placeholder="Ej: MacBook, Coche, Televisor..." 
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="bg-slate-900 border-slate-800 h-10 text-sm focus:ring-indigo-500"
                                />
                            </div>

                            <div className="max-h-[200px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                {loading && inventory.length === 0 ? (
                                    <p className="text-[10px] text-slate-500 text-center py-4 animate-pulse">Cargando objetos...</p>
                                ) : filteredInventory.length > 0 ? (
                                    filteredInventory.map(item => (
                                        <button
                                            key={item.id}
                                            onClick={() => setSelectedItemId(item.id)}
                                            className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                                                selectedItemId === item.id 
                                                ? 'bg-indigo-600/20 border-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.1)]' 
                                                : 'bg-slate-800/40 border-slate-800 hover:border-slate-600'
                                            }`}
                                        >
                                            <div className="text-left">
                                                <p className="text-xs font-bold text-slate-200">{item.name}</p>
                                                <p className="text-[9px] text-slate-500 uppercase tracking-tighter">{item.category || 'Sin categoría'}</p>
                                            </div>
                                            {selectedItemId === item.id && (
                                                <div className="h-2 w-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.6)]" />
                                            )}
                                        </button>
                                    ))
                                ) : (
                                    <p className="text-[10px] text-slate-600 italic text-center py-4">
                                        {search ? "No hay coincidencias" : "El inventario está vacío"}
                                    </p>
                                )}
                            </div>

                            <div className="flex gap-2 pt-4 border-t border-slate-800/50">
                                <Button variant="ghost" onClick={() => setMode('select')} className="flex-1 text-xs text-slate-400">
                                    Atrás
                                </Button>
                                <Button 
                                    onClick={handleLink} 
                                    disabled={!selectedItemId || loading} 
                                    className="flex-[2] bg-indigo-600 hover:bg-indigo-500 font-bold text-xs uppercase tracking-widest"
                                >
                                    {loading ? "Vinculando..." : "Confirmar Vínculo"}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* MODO CREATE (Crear Nuevo) */}
                    {mode === 'create' && (
                        <div className="space-y-4 animate-in slide-in-from-right-2">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500">Nombre del Objeto</label>
                                <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-slate-800 border-slate-700 h-10" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500">Fecha Compra</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                                        <Input defaultValue={transaction.date} disabled className="bg-slate-800 border-slate-700 h-10 pl-10 opacity-50 cursor-not-allowed" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500">Precio</label>
                                    <Euro className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                                    <Input defaultValue={Math.abs(transaction.amount)} disabled className="bg-slate-800 border-slate-700 h-10 pl-10 opacity-50" />
                                </div>
                            </div>
                            <div className="flex gap-2 pt-4">
                                <Button variant="ghost" onClick={() => setMode('select')} className="flex-1">Atrás</Button>
                                <Button onClick={handleCreate} disabled={loading} className="flex-[2] bg-emerald-600 font-bold uppercase tracking-widest text-[10px]">
                                    {loading ? "Registrando..." : "Crear y Vincular"}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}