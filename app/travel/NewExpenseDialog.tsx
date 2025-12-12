'use client'

import { useState } from 'react'
import { createExpense, createExpenseFromTemplate } from './actions'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CategoryIcon } from '@/utils/icon-map'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { Plus, Calculator, Gauge } from 'lucide-react'
import { toast } from 'sonner'
// IMPORTAMOS TIPOS CENTRALIZADOS
import { TravelCategory, TravelMileageTemplate, NewExpenseDialogProps } from '@/types/travel' 
import { ActionResponse } from '@/types/common'

// Usamos las props tipadas
export function NewExpenseDialog({ tripId, categories, templates }: NewExpenseDialogProps) {
	const [open, setOpen] = useState(false)
	
	// Estados para la lógica de UI
	const [isMileage, setIsMileage] = useState(false)
	const [currentRate, setCurrentRate] = useState(0)
	
	// Estados para cálculos visuales
	const [amount, setAmount] = useState('') 
	const [distance, setDistance] = useState('')
	
	// ESTADO CLAVE: ID de la plantilla seleccionada (null si es entrada manual)
	const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)


	// --- HANDLERS ---
	
	// 1. Cuando cambiamos de categoría
	const handleCategoryChange = (catId: string) => {
		const cat = categories.find(c => c.id === catId)
		
		if (cat?.is_mileage) {
			setIsMileage(true)
			setCurrentRate(cat.current_rate || 0) 
			setAmount('') 
		} else {
			setIsMileage(false)
			setDistance('') 
			setSelectedTemplateId(null)
			setAmount('')
		}
	}
	
	// 2. Cuando seleccionamos una Plantilla
	const handleTemplateChange = (templateId: string) => {
		setSelectedTemplateId(templateId)
		
		if (templateId === 'manual') {
			setDistance('')
			setAmount('')
			return
		}
		
		const template = templates.find(t => t.id === templateId)
		
		if (template) {
			const dist = template.distance
			setDistance(dist.toString())
			
			const total = dist * currentRate
			setAmount(total.toFixed(2)) 
		}
	}

	// 3. Calculadora automática (Solo si estamos en modo manual)
	const handleDistanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const kms = e.target.value
		setDistance(kms)
		
		if (selectedTemplateId === 'manual' || !selectedTemplateId) {
			if (kms && !isNaN(Number(kms))) {
				const total = Number(kms) * currentRate
				setAmount(total.toFixed(2))
			} else {
				setAmount('')
			}
		}
	}


	// --- SUBMIT GLOBAL ---

	async function handleSubmit(formData: FormData) {
		let res: ActionResponse
		
		// 1. CASO ESPECIAL: Plantilla de Kilometraje
		if (isMileage && selectedTemplateId && selectedTemplateId !== 'manual') {
				const concept = formData.get('concept') as string;
				const date = formData.get('date') as string;
				
				// La acción server calcula el monto y la distancia
				res = await createExpenseFromTemplate(selectedTemplateId, tripId, date, concept);

		} else {
				// 2. CASO NORMAL: Gasto normal O kilometraje manual
				res = await createExpense(formData)
		}
		
		if (res?.success) {
			setOpen(false)
			toast.success("Gasto registrado con éxito.")
			// Limpiamos estados
			setAmount('')
			setDistance('')
			setIsMileage(false)
			setSelectedTemplateId(null)
		} else {
			toast.error("Error al guardar gasto: " + res?.error)
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button size="sm" className="gap-2">
					<Plus className="h-4 w-4" /> Añadir Gasto
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Nuevo Gasto</DialogTitle>
				</DialogHeader>
				
				<form action={handleSubmit} className="grid gap-4 py-4">
					<input type="hidden" name="trip_id" value={tripId} />
					
					{/* Categoría */}
					<div className="grid gap-2">
						<Label>Categoría</Label>
						<Select name="category_id" onValueChange={handleCategoryChange} required>
							<SelectTrigger>
								<SelectValue placeholder="Selecciona..." />
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

					{/* Fecha y Concepto */}
					<div className="grid grid-cols-3 gap-4">
						<div className="col-span-1 grid gap-2">
							<Label>Fecha</Label>
							<Input type="date" name="date" defaultValue={new Date().toISOString().split('T')[0]} required />
						</div>
						<div className="col-span-2 grid gap-2">
							<Label>Concepto</Label>
							<Input name="concept" placeholder="Ej: Taxi aeropuerto..." required />
						</div>
					</div>

					{/* ZONA DINÁMICA: ¿Es Kilometraje o Gasto Normal? */}
					{isMileage ? (
						 // MODO KILOMETRAJE
						<div className="bg-slate-50 p-3 rounded border border-slate-200 grid gap-3">
                {/* SELECTOR DE PLANTILLAS */}
                <div className="grid gap-2">
                    <Label className="flex items-center gap-2">
                        <Gauge className="h-4 w-4" /> Usar Plantilla de Kilometraje
                    </Label>
                    <Select 
                        onValueChange={handleTemplateChange}
                        value={selectedTemplateId || 'manual'} 
                        name="template_id_hidden"
                    >
									<SelectTrigger className="font-semibold">
										<SelectValue placeholder="Selecciona un recorrido fijo..." />
									</SelectTrigger>
									<SelectContent>
                        {/* Se usa templates?.map para la seguridad en el cliente */}
                        {templates?.map((t) => ( 
                            <SelectItem key={t.id} value={t.id}>
                                {t.name} ({t.distance} km)
                            </SelectItem>
                        ))}
                        <div className="h-px bg-slate-100 my-1" />
                        <SelectItem value="manual">
                            ✏️ Introducción Manual (Distancia libre)
                        </SelectItem>
									</SelectContent>
								</Select>
                </div>
                
                {/* CÁLCULO DINÁMICO */}
                <div className="grid grid-cols-2 gap-4">
								<div className="grid gap-2">
									<Label>Distancia (Km)</Label>
									<Input 
										type="number" step="0.1" name="mileage_distance" 
										value={distance} 
                    onChange={handleDistanceChange} 
										placeholder="0" 
                    required 
                    readOnly={selectedTemplateId !== 'manual' && selectedTemplateId !== null}
                    className={selectedTemplateId !== 'manual' && selectedTemplateId !== null ? "bg-gray-200" : ""}
									/>
								</div>
								<div className="grid gap-2">
									<Label>Total Calculado (€)</Label>
									<Input 
										type="number" name="amount" 
										value={amount} readOnly 
										className="bg-gray-100 font-bold text-slate-700" 
									/>
								</div>
							</div>
							{/* Guardamos el ratio usado (oculto) */}
							<input type="hidden" name="mileage_rate_snapshot" value={currentRate} />
							<p className="text-xs text-slate-400 text-right">Tarifa actual: {currentRate} €/km</p>
						</div>
					) : (
						// MODO NORMAL (Gasto Monetario)
						<div className="grid gap-4">
								<div className="grid gap-2">
									<Label>Importe (€)</Label>
									<Input type="number" step="0.01" name="amount" placeholder="0.00" required />
								</div>
                
                {/* INPUT DE ARCHIVO (RESTAURADO) */}
								<div className="grid gap-2">
									<Label htmlFor="receipt">Foto del Ticket</Label>
									<Input 
										id="receipt" 
										name="receipt_file" 
										type="file" 
										capture="environment"
										accept="image/*,application/pdf"
										className="cursor-pointer bg-slate-50"
									/>
								</div>
						</div>
					)}

					{/* CHECKBOX 'is_reimbursable' ELIMINADO según tu indicación */}
					
					<Button type="submit" className="w-full mt-2">Guardar Gasto</Button>
				</form>
			</DialogContent>
		</Dialog>
	)
}