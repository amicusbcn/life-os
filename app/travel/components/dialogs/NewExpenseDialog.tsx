// app/travel/components/dialogs/NewExpenseDialog.tsx
'use client'

import { useState, useEffect } from 'react'
import { createExpense, createExpenseFromTemplate } from '@/app/travel/actions'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CategoryIcon } from '@/utils/icon-map'
import { Switch } from "@/components/ui/switch"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Plus, Calculator, Gauge, Wallet, Landmark, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { TravelCategory, TravelMileageTemplate, NewExpenseDialogProps } from '@/types/travel' 
import { ActionResponse } from '@/types/common'

// Nota: He añadido 'accounts' a las props para la integración con Finanzas
export function NewExpenseDialog({ 
    tripId, 
    categories, 
    templates, 
    context,
    accounts = [] // Pasaremos esto desde la page.tsx
}: NewExpenseDialogProps & { accounts?: any[] }) {
    const [open, setOpen] = useState(false)
    const [isMileage, setIsMileage] = useState(false)
    const [currentRate, setCurrentRate] = useState(0)
    const [amount, setAmount] = useState('') 
    const [distance, setDistance] = useState('')
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
    
    // Estados para la integración con Finanzas
    const [syncToFinance, setSyncToFinance] = useState(false)
    const [selectedAccountId, setSelectedAccountId] = useState('')

    const isPersonal = context === 'personal'

    // --- HANDLERS ---
    
    const handleCategoryChange = (catId: string) => {
        const cat = categories.find(c => c.id === catId)
        if (cat?.is_mileage) {
            setIsMileage(true)
            setCurrentRate(cat.current_rate || 0.19) // Fallback habitual
            setAmount('') 
        } else {
            setIsMileage(false)
            setDistance('') 
            setSelectedTemplateId(null)
            setAmount('')
        }
    }
    
    const handleTemplateChange = (templateId: string) => {
        setSelectedTemplateId(templateId)
        if (templateId === 'manual') {
            setDistance(''); setAmount(''); return
        }
        const template = templates.find(t => t.id === templateId)
        if (template) {
            const dist = template.distance
            setDistance(dist.toString())
            setAmount((dist * currentRate).toFixed(2)) 
        }
    }

    const handleDistanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const kms = e.target.value
        setDistance(kms)
        if ((selectedTemplateId === 'manual' || !selectedTemplateId) && kms && !isNaN(Number(kms))) {
            setAmount((Number(kms) * currentRate).toFixed(2))
        }
    }

    async function handleSubmit(formData: FormData) {
        // Inyectamos metadatos necesarios
        formData.append('context', context)
        if (syncToFinance) {
            formData.append('addToFinance', 'true')
            formData.append('account_id', selectedAccountId)
        }

        let res: ActionResponse
        
        if (isMileage && selectedTemplateId && selectedTemplateId !== 'manual') {
            const concept = formData.get('concept') as string
            const date = formData.get('date') as string
            res = await createExpenseFromTemplate(selectedTemplateId, tripId, date, concept)
        } else {
            res = await createExpense(formData)
        }
        
        if (res?.success) {
            setOpen(false)
            toast.success("Gasto registrado correctamente")
            // Reset estados
            setAmount(''); setDistance(''); setSyncToFinance(false)
        } else {
            toast.error("Error: " + res?.error)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className={`w-full gap-2 shadow-lg ${isPersonal ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                    <Plus className="h-5 w-5" /> Añadir Gasto {isPersonal ? 'Personal' : ''}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] overflow-y-auto max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calculator className={`h-5 w-5 ${isPersonal ? 'text-green-600' : 'text-indigo-600'}`} />
                        Nuevo Gasto de Viaje
                    </DialogTitle>
                </DialogHeader>
                
                <form action={handleSubmit} className="grid gap-5 py-4">
                    <input type="hidden" name="trip_id" value={tripId} />
                    
                    <div className="grid gap-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400">Categoría</Label>
                        <Select name="category_id" onValueChange={handleCategoryChange} required>
                            <SelectTrigger className="h-11">
                                <SelectValue placeholder="¿En qué has gastado?" />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id}>
                                        <div className="flex items-center gap-2">
                                            <CategoryIcon name={cat.icon_key} className="h-4 w-4 text-slate-500" />
                                            <span>{cat.name}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Fecha</Label>
                            <Input type="date" name="date" h-11 defaultValue={new Date().toISOString().split('T')[0]} required />
                        </div>
                        <div className="grid gap-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Concepto</Label>
                            <Input name="concept" className="h-11" placeholder="Taxi, Cena..." required />
                        </div>
                    </div>
					{isMileage ? (
						/* MODO KILOMETRAJE: Recuperamos Plantillas + Km + Total */
						<div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
							{/* SELECTOR DE PLANTILLAS (TRAYECTOS) */}
							<div className="grid gap-2">
								<Label className="text-[10px] font-bold flex items-center gap-2 text-slate-500 uppercase">
									<Gauge className="h-3 w-3" /> Trayecto Fijo
								</Label>
								<Select 
									onValueChange={handleTemplateChange} 
									value={selectedTemplateId || 'manual'}
								>
									<SelectTrigger className="bg-white h-10 font-medium">
										<SelectValue placeholder="Selecciona un recorrido..." />
									</SelectTrigger>
									<SelectContent>
										{templates?.map((t) => (
											<SelectItem key={t.id} value={t.id}>
												{t.name} ({t.distance} km)
											</SelectItem>
										))}
										<SelectItem value="manual">✏️ Introducción manual</SelectItem>
									</SelectContent>
								</Select>
							</div>

							{/* CÁLCULO DE DISTANCIA */}
							<div className="grid grid-cols-2 gap-4">
								<div className="grid gap-2">
									<Label className="text-[10px] uppercase font-bold text-slate-500">Km</Label>
									<Input 
										type="number" 
										step="0.1"
										name="mileage_distance" 
										value={distance} 
										onChange={handleDistanceChange} 
										readOnly={!!selectedTemplateId && selectedTemplateId !== 'manual'}
										className={`h-10 text-lg font-bold ${selectedTemplateId && selectedTemplateId !== 'manual' ? "bg-slate-100" : "bg-white"}`}
									/>
								</div>
								<div className="grid gap-2">
									<Label className="text-[10px] uppercase font-bold text-slate-500">Total (€)</Label>
									<Input 
										value={amount} 
										readOnly 
										className="h-10 bg-emerald-50 border-emerald-200 font-bold text-emerald-700" 
										name="amount" 
									/>
								</div>
							</div>

							{/* Datos ocultos para la Action */}
							<input type="hidden" name="mileage_rate_snapshot" value={currentRate} />
							{/* Forzamos que la action sepa que es una plantilla si no es manual */}
							<input type="hidden" name="template_id" value={selectedTemplateId || ''} />

							<p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 justify-center bg-white py-1.5 rounded-md border border-emerald-100 shadow-sm">
								<CheckCircle2 className="h-3 w-3" /> Auto-sincronizado con Cuenta Viajes
							</p>
						</div>
					) : (
					/* GASTO NORMAL: Importe, Foto y Switch de Sincronización */
					<div className="space-y-4">
						<div className="grid gap-4">
						<div className="grid gap-2">
							<Label className="text-[10px] font-black uppercase text-slate-400">Importe (€)</Label>
							<Input type="number" step="0.01" name="amount" className="h-12 text-xl font-black" placeholder="0.00" required />
						</div>
						
						{!isPersonal && (
							<div className="grid gap-2">
							<Label className="text-[10px] font-black uppercase text-slate-400">Ticket / Recibo</Label>
							<Input name="receipt_file" type="file" capture="environment" accept="image/*,application/pdf" className="bg-slate-50" />
							</div>
						)}
						</div>

						{/* CONTROL DE FINANZAS SIMPLIFICADO */}
						<div className="mt-2 p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className={`p-2 rounded-lg ${syncToFinance ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
							<Wallet className="h-4 w-4" />
							</div>
							<div className="space-y-0.5">
							<Label className="text-xs font-bold">Reflejar en Finanzas</Label>
							<p className="text-[10px] text-slate-500 leading-none">
								{syncToFinance ? 'Se descontará de la Cuenta de Viajes' : 'No afectará a tus balances'}
							</p>
							</div>
						</div>
						<Switch 
							checked={syncToFinance} 
							onCheckedChange={setSyncToFinance}
							className="data-[state=checked]:bg-emerald-600"
						/>
						{/* Input oculto para que la Action reciba la decisión */}
						<input type="hidden" name="sync_finance" value={syncToFinance ? 'true' : 'false'} />
						</div>
					</div>
					)}
                    
                    <Button type="submit" className={`w-full h-12 text-lg font-bold ${isPersonal ? 'bg-green-600' : 'bg-indigo-600'}`}>
                        Guardar Gasto
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}