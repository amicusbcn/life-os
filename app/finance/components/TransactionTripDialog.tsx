'use client'

import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FinanceTransaction } from '@/types/finance';
import { 
    Plane, Search, ArrowRight, Plus, Calendar, 
    Loader2, Globe, ChevronLeft, Check, Sparkles 
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { 
    getActiveTripsAction, 
    getTripExpensesAction, 
    linkTransactionToExpenseAction, 
    createExpenseFromBankAction,
    createFullTripAction,
    findSuggestedExpenseAction 
} from "../actions";
import { cn } from "@/lib/utils";

type DialogMode = 'suggested-match' | 'select-trip' | 'select-expense' | 'create-trip';

export function TransactionTripDialog({ transaction, onClose }: { transaction: FinanceTransaction, onClose: () => void }) {
    const [mode, setMode] = useState<DialogMode>('suggested-match');
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [trips, setTrips] = useState<any[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
    const [newTripName, setNewTripName] = useState("");
    const router = useRouter();

    // 1. Búsqueda automática de Match al abrir
    useEffect(() => {
        const autoSearch = async () => {
            setLoading(true);
            try {
                const res = await findSuggestedExpenseAction(transaction.amount, transaction.date);
                if (res.success && res.data && res.data.length > 0) {
                    setSuggestions(res.data);
                    setMode('suggested-match');
                } else {
                    setMode('select-trip');
                    loadAllTrips();
                }
            } catch (err) {
                setMode('select-trip');
                loadAllTrips();
            }
            setLoading(false);
        };
        autoSearch();
    }, [transaction]);

    const loadAllTrips = async () => {
        setLoading(true);
        const res = await getActiveTripsAction();
        if (res.success) setTrips(res.data || []);
        setLoading(false);
    };

    useEffect(() => {
        if (selectedTripId) {
            const loadExpenses = async () => {
                setLoading(true);
                const res = await getTripExpensesAction(selectedTripId);
                if (res.success) setExpenses(res.data || []);
                setLoading(false);
            };
            loadExpenses();
        }
    }, [selectedTripId]);

    // 🚀 FUNCIÓN DE VINCULACIÓN CORREGIDA
    const handleLink = async (expenseId: string, tripId: string) => {
        if (!expenseId || !tripId) {
            toast.error("Error: Datos de vinculación incompletos");
            return;
        }
        setLoading(true);
        const res = await linkTransactionToExpenseAction(transaction.id, expenseId, tripId);
        if (res.success) {
            toast.success("Conciliación completada");
            router.refresh();
            onClose();
        } else {
            toast.error("Error: " + res.error);
        }
        setLoading(false);
    };

    const handleCreateExpenseInTrip = async () => {
        if (!selectedTripId) return;
        setLoading(true);
        const res = await createExpenseFromBankAction(selectedTripId, transaction);
        if (res.success) {
            toast.success("Gasto creado y vinculado");
            router.refresh();
            onClose();
        } else {
            toast.error("Error al crear gasto");
        }
        setLoading(false);
    };

    const handleCreateNewTrip = async () => {
        if (!newTripName) return;
        setLoading(true);
        const res = await createFullTripAction(newTripName, transaction.date);
        if (res.success && res.data) {
            toast.success("Viaje creado");
            setSelectedTripId(res.data.id);
            setMode('select-expense');
        } else {
            toast.error("Error al crear viaje");
        }
        setLoading(false);
    };

    const filteredTrips = trips.filter(t => 
        t.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[420px] bg-slate-950 text-white border-slate-800 p-0 overflow-hidden shadow-2xl">
                
                <div className="p-6 border-b border-slate-800/50 flex items-center justify-between bg-indigo-950/20">
                    <div className="flex items-center gap-3">
                        <Plane className="h-6 w-6 text-indigo-400" />
                        <h2 className="text-xl font-black uppercase tracking-tighter">Viajes</h2>
                    </div>
                    {mode !== 'suggested-match' && mode !== 'select-trip' && (
                        <Button variant="ghost" size="icon" onClick={() => setMode('select-trip')} className="h-8 w-8 text-slate-400">
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                    )}
                </div>

                <div className="p-6 space-y-6">
                    <div className="bg-slate-900 p-4 rounded-2xl border border-indigo-500/20 flex justify-between items-center shadow-lg">
                        <div className="min-w-0">
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Movimiento</p>
                            <h3 className="text-sm font-bold truncate text-slate-200">{transaction.notes || transaction.concept}</h3>
                        </div>
                        <p className="text-xl font-mono font-black text-white">{Math.abs(transaction.amount).toFixed(2)}€</p>
                    </div>

                    {/* 1. MODO SUGERENCIAS */}
                    {mode === 'suggested-match' && (
                        <div className="space-y-4 animate-in fade-in zoom-in-95">
                            <div className="flex items-center gap-2 text-amber-400 justify-center">
                                <Sparkles className="h-4 w-4" />
                                <p className="text-[10px] font-black uppercase">Coincidencias encontradas</p>
                            </div>
                            {suggestions.map((exp: any) => (
                                <button
                                    key={exp.id}
                                    // 🚀 AQUÍ ESTABA EL FALLO: Aseguramos que pasamos los IDs correctamente
                                    onClick={() => handleLink(exp.id, exp.travel_trips?.id || exp.trip_id)}
                                    className="w-full p-4 rounded-xl bg-emerald-500/10 border-2 border-emerald-500/40 hover:bg-emerald-500/20 transition-all text-left flex justify-between items-center"
                                >
                                    <div className="min-w-0">
                                        <p className="text-sm font-black text-white truncate">{exp.description}</p>
                                        <p className="text-[10px] text-emerald-400 font-bold uppercase">{exp.travel_trips?.name || 'Viaje'}</p>
                                    </div>
                                    <Check className="h-5 w-5 text-emerald-500" />
                                </button>
                            ))}
                            <Button 
                                variant="ghost" 
                                onClick={() => { setMode('select-trip'); loadAllTrips(); }}
                                className="w-full text-xs text-slate-500 hover:text-white"
                            >
                                Ninguno coincide, buscar manualmente
                            </Button>
                        </div>
                    )}

                    {/* 2. MODO SELECCIONAR VIAJE */}
                    {mode === 'select-trip' && (
                        <div className="space-y-4 animate-in fade-in">
                            <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                                <Input 
                                    placeholder="Buscar viaje..." 
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="bg-slate-900 border-slate-800 pl-10 h-11 text-white"
                                />
                            </div>
                            <div className="max-h-[200px] overflow-y-auto space-y-2 custom-scrollbar">
                                {filteredTrips.map((trip: any) => (
                                    <button
                                        key={trip.id}
                                        onClick={() => { setSelectedTripId(trip.id); setMode('select-expense'); }}
                                        className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500"
                                    >
                                        <div className="text-left">
                                            <p className="text-sm font-bold text-slate-200">{trip.name}</p>
                                            <p className="text-[10px] text-slate-500">{new Date(trip.start_date).toLocaleDateString()}</p>
                                        </div>
                                        <ArrowRight className="h-4 w-4 text-slate-700" />
                                    </button>
                                ))}
                                <Button 
                                    onClick={() => setMode('create-trip')}
                                    className="w-full border-dashed border-slate-800 text-slate-500 h-12"
                                    variant="outline"
                                >
                                    <Plus className="h-4 w-4 mr-2" /> Crear nuevo viaje
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* 3. MODO SELECCIONAR GASTO */}
                    {mode === 'select-expense' && (
                        <div className="space-y-4 animate-in slide-in-from-right-4">
                            <div className="max-h-[250px] overflow-y-auto space-y-2 custom-scrollbar">
                                {expenses.map((exp: any) => (
                                    <button
                                        key={exp.id}
                                        onClick={() => handleLink(exp.id, selectedTripId!)}
                                        className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500 flex justify-between items-center"
                                    >
                                        <div className="text-left">
                                            <p className="text-sm font-bold text-slate-200">{exp.description}</p>
                                            <p className="text-[10px] text-slate-500">{exp.amount}€</p>
                                        </div>
                                        <Check className="h-4 w-4 text-emerald-500" />
                                    </button>
                                ))}
                            </div>
                            <Button onClick={handleCreateExpenseInTrip} className="w-full bg-emerald-600 h-12 font-black uppercase text-[10px] tracking-widest">
                                Crear como nuevo gasto en el viaje
                            </Button>
                        </div>
                    )}

                    {/* 4. MODO CREAR VIAJE */}
                    {mode === 'create-trip' && (
                        <div className="space-y-4 animate-in slide-in-from-bottom-4">
                            <Input 
                                value={newTripName} 
                                onChange={e => setNewTripName(e.target.value)}
                                placeholder="Nombre del viaje..."
                                className="bg-slate-900 border-slate-800 h-12 text-white font-bold"
                            />
                            <Button onClick={handleCreateNewTrip} className="w-full bg-indigo-600 h-12 font-black uppercase text-[10px] tracking-widest">
                                Crear Viaje y Continuar
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}