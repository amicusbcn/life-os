// app/inventory/[id]/components/ItemEditDialog.tsx
'use client'

import React, { useState } from "react"
// 🚨 Importar de /types/inventory.ts para las interfaces
import { ItemEditDialogProps, CloneableElementProps } from "@/types/inventory" 
import { updateInventoryItem } from "@/app/inventory/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea" // Añadido para descripción
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Upload } from "lucide-react"
import imageCompression from 'browser-image-compression'


// 🚨 CORRECCIÓN: Aseguramos que la firma incluye todos los props
export function ItemEditDialog({ item, categories, locations, isOpen, setOpen, children }: ItemEditDialogProps) {  
	const [isLoading, setIsLoading] = useState(false)
	const [fileToUpload, setFileToUpload] = useState<File | null>(null)
	
	// Previsualización inicial
	const initialPreview = item.photo_path 
		? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/inventory/${item.photo_path}`
		: null
	const [previewUrl, setPreviewUrl] = useState<string | null>(initialPreview)

	// 🚨 LÓGICA DE CONTROL DE ESTADO DUAL
	const [modalOpen, setModalOpen] = useState(false);
	const isMenuMode = !!children; 
	const finalOpen = isMenuMode ? modalOpen : (isOpen || false);
	// Aseguramos que el setter siempre sea una función válida
	const finalSetOpen = isMenuMode ? setModalOpen : (setOpen || (() => {})); 

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true }
    try {
        const compressed = await imageCompression(file, options)
        setFileToUpload(compressed)
        setPreviewUrl(URL.createObjectURL(compressed))
    } catch (error) {
        setFileToUpload(file)
        setPreviewUrl(URL.createObjectURL(file))
    }
  }


	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setIsLoading(true)
		const formData = new FormData(event.currentTarget)
		
		// IDs clave
		formData.append('item_id', item.id)
		if (item.photo_path) formData.append('old_photo_path', item.photo_path)
		
		// Nueva foto
		if (fileToUpload) formData.set('photo', fileToUpload)

		try {
			const result = await updateInventoryItem(formData)
			if (result?.error) {
				alert("Error: " + result.error)
			} else {
				// 🚨 Usamos la función de cierre segura
				finalSetOpen(false) 
			}
		} catch (error) {
			alert("Error de conexión")
		} finally {
			setIsLoading(false)
		}
	}

	// 🚨 LÓGICA DE CLONACIÓN Y WRAPPER (Solo en modo menú)
	const trigger = (() => {
		if (!isMenuMode || !children) return null;

		const childElement = children as React.ReactElement<CloneableElementProps>;

		const newOnSelect = (e: Event) => {
			e.preventDefault(); 
			const originalOnSelect = (childElement.props as CloneableElementProps).onSelect;
			if (typeof originalOnSelect === 'function') {
				originalOnSelect(e);
			}
			finalSetOpen(true); 
		};
		
		return React.cloneElement(childElement, {
			onSelect: newOnSelect,
			onClick: (e: React.MouseEvent) => e.stopPropagation(), 
		} as React.PropsWithChildren<CloneableElementProps>);
	})();


	return (
		<React.Fragment>
				{isMenuMode && trigger}
				<Dialog open={finalOpen} onOpenChange={finalSetOpen}>
						<DialogContent className="max-w-lg rounded-xl max-h-[90vh] overflow-y-auto">
								<DialogHeader>
										<DialogTitle>Editar Item</DialogTitle>
								</DialogHeader>
								
								<form onSubmit={handleSubmit} className="space-y-4 py-2">
										
										{/* 1. FOTO */}
										<div>
                        <Label>Foto del Item</Label>
                        <div className="mt-1 flex items-center space-x-4">
                            <label htmlFor="photo-upload" className="cursor-pointer">
                                {previewUrl ? (
                                    <img src={previewUrl} alt="Preview" className="h-20 w-20 rounded-lg object-cover border" />
                                ) : (
                                    <div className="h-20 w-20 rounded-lg bg-slate-100 flex items-center justify-center border border-dashed border-slate-300">
                                        <Upload className="h-6 w-6 text-slate-400" />
                                    </div>
                                )}
                                <Input id="photo-upload" type="file" name="photo" className="hidden" accept="image/*" onChange={handleFileChange} />
                            </label>
                            <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('photo-upload')?.click()}>
                                Subir/Cambiar Foto
                            </Button>
                        </div>
                    </div>

                    {/* 2. CAMPOS BÁSICOS */}
										<div className="grid grid-cols-2 gap-4">
												<div className="space-y-2">
														<Label>Nombre</Label>
														<Input name="name" defaultValue={item.name} required />
												</div>
												<div className="space-y-2">
														<Label>Modelo</Label>
														<Input name="model" defaultValue={item.model} />
												</div>
										</div>

                    {/* 3. CATEGORÍA / UBICACIÓN */}
										<div className="grid grid-cols-2 gap-4">
												<div className="space-y-2">
														<Label>Categoría</Label>
														<select name="category_id" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" defaultValue={item.category_id || "no-category"}>
																<option value="no-category">Sin categoría</option>
																{categories.map((c:any) => <option key={c.id} value={c.id}>{c.name}</option>)}
														</select>
												</div>
												<div className="space-y-2">
														<Label>Ubicación</Label>
														<select name="location_id" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" defaultValue={item.location_id || "no-location"}>
																<option value="no-location">Sin ubicación</option>
																{locations.map((l:any) => <option key={l.id} value={l.id}>{l.name}</option>)}
														</select>
												</div>
										</div>

                    {/* 4. FECHAS */}
										<div className="grid grid-cols-2 gap-4">
												<div className="space-y-2">
														<Label>Fecha de Compra</Label>
														<Input type="date" name="purchase_date" defaultValue={item.purchase_date} />
												</div>
												<div className="space-y-2">
														<Label>Fin de Garantía</Label>
														<Input type="date" name="warranty_end_date" defaultValue={item.warranty_end_date} />
												</div>
										</div>

                    {/* 5. PRECIO / SERIE */}
										<div className="grid grid-cols-2 gap-4">
												<div className="space-y-2">
														<Label>Precio (€)</Label>
														<Input type="number" step="0.01" name="price" defaultValue={item.price} />
												</div>
												<div className="space-y-2">
														<Label>Número de Serie</Label>
														<Input name="serial_number" defaultValue={item.serial_number} />
												</div>
										</div>

                    {/* 6. DESCRIPCIÓN */}
                    <div className="space-y-2">
                        <Label>Descripción / Notas</Label>
                        <Textarea name="notes" defaultValue={item.notes} rows={3} />
                    </div>
										
										<DialogFooter>
												<Button type="button" variant="outline" onClick={() => finalSetOpen(false)}>Cancelar</Button>
												<Button type="submit" disabled={isLoading}>
														{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
														Guardar Cambios
												</Button>
										</DialogFooter>
								</form>
						</DialogContent>
				</Dialog>
		</React.Fragment>
	)
}