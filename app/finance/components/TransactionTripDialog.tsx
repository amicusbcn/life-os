'use client'

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FinanceTransaction } from '@/types/finance';
import { 
    Plane, Search, ArrowRight, Plus, ChevronLeft, Check, Sparkles, AlertCircle, Loader2 
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { 
    getActiveTripsAction, 
    getTripExpensesAction, 
    createFullTripAction,
    findSuggestedExpenseAction,
    reconcileTravelExpenseAction,
    createExpenseFromBankAction,
    getTravelCategoriesAction // ✨ Asegúrate de añadir esta acción
} from "../actions";
import { cn } from "@/lib/utils";

const WORK_TRAVEL_CAT = 'ad17366f-06de-4f06-b88e-67aace8f4b21';

type DialogMode = 'suggested-match' | 'select-trip' | 'select-expense' | 'create-trip' | 'reconcile-check' | 'create-expense';

export function TransactionTripDialog({ transaction, onClose }: { transaction: FinanceTransaction, onClose: (success?: boolean) => void }) {
    const context = transaction.category_id === WORK_TRAVEL_CAT ? 'work' : 'personal';
    
    const [mode, setMode] = useState<DialogMode>('suggested-match');
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [trips, setTrips] = useState<any[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [travelCategories, setTravelCategories] = useState<any[]>([]);
    const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
    const [selectedTravelCatId, setSelectedTravelCatId] = useState<string | null>(null);
    const [pendingExpense, setPendingExpense] = useState<any>(null);
    const [newTripName, setNewTripName] = useState("");
    const [editableConcept, setEditableConcept] = useState(transaction.notes || transaction.concept);
    const router = useRouter();

    // 1. Carga inicial: Sugerencias y Categorías de Viaje (Desglose)
useEffect(() => {
    const init = async () => {
        setLoading(true);
        
        // 🔍 LOG DE DIAGNÓSTICO
        console.log("--- DEBUG VIAJES ---");
        console.log("ID Transacción:", transaction.id);
        console.log("ID Categoría Finanzas:", transaction.category_id);
        console.log("Contexto detectado:", context);
        console.log("ID Esperado (WORK):", WORK_TRAVEL_CAT);

        try {
            // 1. Sugerencias
            const sugRes = await findSuggestedExpenseAction(transaction.amount, transaction.date, context);
            console.log("Resultado Sugerencias:", sugRes);
            
            if (sugRes.success && Array.isArray(sugRes.data) && sugRes.data.length > 0) {
                setSuggestions(sugRes.data);
                setMode('suggested-match');
            } else {
                setMode('select-trip');
                // Cargamos viajes inmediatamente si no hay sugerencias
                const tripRes = await getActiveTripsAction(context);
                console.log("Viajes cargados para contexto " + context + ":", tripRes);
                if (tripRes.success) setTrips(tripRes.data || []);
            }

            // 2. Categorías de Viaje (Desglose)
            console.log("Solicitando categorías de viaje para:", context);
            const catRes = await getTravelCategoriesAction(context);
            console.log("Resultado Categorías Viaje:", catRes);
            
            if (catRes.success) {
                setTravelCategories(catRes.data || []);
            } else {
                console.error("Error cargando categorías:", catRes.error);
                toast.error("No se pudieron cargar las categorías de viaje");
            }

        } catch (err) {
            console.error("Error crítico en init:", err);
        } finally {
            setLoading(false);
        }
    };
    init();
}, [transaction.id, context]);

    const loadTrips = async () => {
        setLoading(true);
        const res = await getActiveTripsAction(context);
        if (res.success) setTrips(res.data || []);
        setLoading(false);
    };

    const loadExpenses = async (tripId: string) => {
        setLoading(true);
        const res = await getTripExpensesAction(tripId);
        if (res.success) setExpenses(res.data || []);
        setLoading(false);
    };

    const onExpenseSelect = (expense: any) => {
        if (Math.abs(transaction.amount) !== expense.amount) {
            setPendingExpense(expense);
            setMode('reconcile-check');
        } else {
            executeLink(expense.id, 'exact');
        }
    };

    const executeLink = async (expenseId: string, reconcileMode: 'exact' | 'adjust_trip' | 'virtual_adjustment') => {
        setLoading(true);
        const res = await reconcileTravelExpenseAction(transaction.id, expenseId, reconcileMode);
        if (res.success) {
            toast.success("Vinculación completada");
            onClose(true);
        } else {
            toast.error(res.error);
        }
        setLoading(false);
    };

    const handleCreateExpense = async () => {
        if (!selectedTripId || !selectedTravelCatId) return;
        setLoading(true);
        const res = await createExpenseFromBankAction(
                selectedTripId, 
                transaction, 
                selectedTravelCatId, 
                context,
                editableConcept // ✨ Enviamos el texto del Input
            );        if (res.success) {
            toast.success("Gasto creado y vinculado");
            onClose(true);
        }
        setLoading(false);
    };

    const handleCreateNewTrip = async () => {
        if (!newTripName) return;
        setLoading(true);
        const res = await createFullTripAction(newTripName, transaction.date, context);
        if (res.success && res.data) {
            setSelectedTripId(res.data.id);
            loadExpenses(res.data.id);
            setMode('select-expense');
        }
        setLoading(false);
    };

    return (
        <Dialog open={true} onOpenChange={() => onClose(false)}>
            <DialogContent className="sm:max-w-[420px] bg-slate-950 text-white border-slate-800 p-0 overflow-hidden shadow-2xl">
                
                <div className={cn("p-6 border-b border-slate-800/50 flex items-center justify-between", context === 'work' ? "bg-indigo-950/20" : "bg-rose-950/20")}>
                    <div className="flex items-center gap-3">
                        <Plane className={cn("h-6 w-6", context === 'work' ? "text-indigo-400" : "text-rose-400")} />
                        <h2 className="text-xl font-black uppercase tracking-tighter">
                            {context === 'work' ? 'Viaje Profesional' : 'Viaje Personal'}
                        </h2>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    <div className="bg-slate-900 p-4 rounded-2xl border border-indigo-500/20 flex justify-between items-center shadow-lg">
                        <div className="min-w-0">
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Importe Banco</p>
                            <h3 className="text-sm font-bold truncate text-slate-200">{transaction.concept}</h3>
                        </div>
                        <p className="text-xl font-mono font-black text-white">{Math.abs(transaction.amount).toFixed(2)}€</p>
                    </div>

                    {mode === 'suggested-match' && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-amber-400 justify-center">
                                <Sparkles className="h-4 w-4" />
                                <p className="text-[10px] font-black uppercase tracking-widest">Sugerencias</p>
                            </div>
                            {suggestions.map((exp) => (
                                <button key={exp.id} onClick={() => onExpenseSelect(exp)} className="w-full p-4 rounded-xl bg-emerald-500/10 border-2 border-emerald-500/40 hover:bg-emerald-500/20 transition-all flex justify-between items-center text-left">
                                    <div className="min-w-0">
                                        <p className="text-sm font-black text-white truncate">{exp.concept || exp.description}</p>
                                        <p className="text-[10px] text-emerald-400 font-bold uppercase">{exp.travel_trips?.name}</p>
                                    </div>
                                    <p className="font-mono font-bold shrink-0 ml-4">{exp.amount}€</p>
                                </button>
                            ))}
                            <Button variant="ghost" onClick={() => { setMode('select-trip'); loadTrips(); }} className="w-full text-xs text-slate-500">Buscar manualmente</Button>
                        </div>
                    )}

                    {mode === 'select-trip' && (
                        <div className="space-y-4">
                            <Input placeholder="Buscar viaje..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-slate-900 border-slate-800 h-11" />
                            <div className="max-h-[220px] overflow-y-auto space-y-2">
                                {trips.filter(t => t.name.toLowerCase().includes(search.toLowerCase())).map((trip) => (
                                    <button key={trip.id} onClick={() => { setSelectedTripId(trip.id); loadExpenses(trip.id); setMode('select-expense'); }} className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500 transition-colors">
                                        <div className="text-left"><p className="text-sm font-bold text-slate-200">{trip.name}</p><p className="text-[10px] text-slate-500">{trip.start_date}</p></div>
                                        <ArrowRight className="h-4 w-4 text-slate-700" />
                                    </button>
                                ))}
                                <Button onClick={() => setMode('create-trip')} variant="outline" className="w-full border-dashed border-slate-800 text-slate-500 h-12"><Plus className="h-4 w-4 mr-2" /> Crear nuevo viaje</Button>
                            </div>
                        </div>
                    )}

                    {mode === 'select-expense' && (
                        <div className="space-y-4 animate-in slide-in-from-right-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Button variant="ghost" size="icon" onClick={() => setMode('select-trip')} className="h-6 w-6"><ChevronLeft className="h-4 w-4"/></Button>
                                <p className="text-[10px] font-black uppercase text-slate-500">Gastos en este viaje</p>
                            </div>
                            <div className="max-h-[200px] overflow-y-auto space-y-2">
                                {expenses.map(exp => (
                                    <button key={exp.id} onClick={() => onExpenseSelect(exp)} className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500 flex justify-between items-center transition-colors">
                                        <div className="text-left"><p className="text-xs font-bold text-slate-200">{exp.concept || exp.description}</p><p className="text-[10px] text-slate-500">{exp.amount}€</p></div>
                                        <Check className="h-4 w-4 text-emerald-500" />
                                    </button>
                                ))}
                            </div>
                            <Button onClick={() => setMode('create-expense')} className="w-full bg-emerald-600 hover:bg-emerald-500 h-12 font-black uppercase text-[10px] tracking-widest mt-2"><Plus className="h-4 w-4 mr-2" /> Crear nuevo gasto en viaje</Button>
                        </div>
                    )}

                    {mode === 'create-expense' && (
                        <div className="space-y-4 animate-in zoom-in-95">
                            <div className="flex items-center gap-2 mb-2">
                                <Button variant="ghost" size="icon" onClick={() => setMode('select-expense')} className="h-6 w-6"><ChevronLeft className="h-4 w-4"/></Button>
                                <p className="text-[10px] font-black uppercase text-indigo-400">Seleccionar Categoría de Desglose</p>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Descripción en el viaje</label>
                                <Input 
                                    value={editableConcept} 
                                    onChange={(e) => setEditableConcept(e.target.value)}
                                    placeholder="Ej: Cena con clientes..."
                                    className="bg-slate-900 border-slate-800 text-sm font-bold text-white h-11 focus:ring-indigo-500"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto p-1">
                                {travelCategories.map(cat => (
                                    <button key={cat.id} onClick={() => setSelectedTravelCatId(cat.id)} className={cn("p-3 rounded-xl border text-[10px] font-bold uppercase transition-all", selectedTravelCatId === cat.id ? "bg-indigo-600 border-indigo-400 text-white" : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600")}>
                                        {cat.name}
                                    </button>
                                ))}
                            </div>
                            <Button onClick={handleCreateExpense} disabled={!selectedTravelCatId || loading} className="w-full bg-indigo-600 h-12 font-black uppercase text-[10px] tracking-widest">
                                {loading ? <Loader2 className="animate-spin h-4 w-4" /> : "Vincular Gasto"}
                            </Button>
                        </div>
                    )}

                    {mode === 'reconcile-check' && pendingExpense && (
                        <div className="space-y-4 animate-in zoom-in-95">
                            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2 text-center">
                                <AlertCircle className="h-6 w-6 text-amber-500 mx-auto" />
                                <p className="text-xs font-bold uppercase text-amber-500 tracking-tighter">Descuadre de Importes</p>
                                <p className="text-[10px] text-slate-300">Banco: {Math.abs(transaction.amount)}€ | Viaje: {pendingExpense.amount}€</p>
                            </div>
                            <div className="grid gap-2">
                                <Button onClick={() => executeLink(pendingExpense.id, 'adjust_trip')} className="w-full bg-slate-800 hover:bg-slate-700 text-[10px] font-bold h-12 justify-between px-4 uppercase">Actualizar viaje a {Math.abs(transaction.amount)}€ <ArrowRight className="h-4 w-4" /></Button>
                                <Button onClick={() => executeLink(pendingExpense.id, 'virtual_adjustment')} className="w-full bg-indigo-600 hover:bg-indigo-500 text-[10px] font-bold h-12 justify-between px-4 uppercase tracking-tighter">Ajuste por Cuenta Virtual <ArrowRight className="h-4 w-4" /></Button>
                            </div>
                        </div>
                    )}

                    {mode === 'create-trip' && (
                        <div className="space-y-4 animate-in slide-in-from-bottom-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Button variant="ghost" size="icon" onClick={() => setMode('select-trip')} className="h-6 w-6"><ChevronLeft className="h-4 w-4"/></Button>
                                <p className="text-[10px] font-black uppercase text-indigo-400">Nuevo Viaje {context === 'work' ? 'PRO' : 'Ocio'}</p>
                            </div>
                            <Input value={newTripName} onChange={e => setNewTripName(e.target.value)} placeholder="Nombre del destino/evento..." className="bg-slate-900 border-slate-800 h-12 text-white font-bold" />
                            <Button onClick={handleCreateNewTrip} className="w-full bg-indigo-600 h-12 font-black uppercase text-[10px] tracking-widest">Crear y Continuar</Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}