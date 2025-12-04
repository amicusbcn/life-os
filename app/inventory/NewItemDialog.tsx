'use client'

import { useState, useRef } from "react"
import { createInventoryItem } from "@/app/inventory/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Plus, Upload, Loader2 } from "lucide-react"
import imageCompression from 'browser-image-compression' // <--- IMPORTANTE

export function NewItemDialog({ categories, locations }: any) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  
  // Estado para guardar el archivo comprimido listo para subir
  const [fileToUpload, setFileToUpload] = useState<File | null>(null)
  
  const formRef = useRef<HTMLFormElement>(null)

  // Función para comprimir y previsualizar
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 1. Opciones de compresión (ajusta según necesites)
    const options = {
      maxSizeMB: 1,          // Máximo 1MB
      maxWidthOrHeight: 1920, // Redimensionar si es gigante
      useWebWorker: true,
    }

    try {
      // 2. Comprimimos
      const compressedFile = await imageCompression(file, options)
      
      // 3. Guardamos el archivo comprimido en el estado
      setFileToUpload(compressedFile)

      // 4. Generamos la previsualización
      const url = URL.createObjectURL(compressedFile)
      setPreviewUrl(url)

    } catch (error) {
      console.error("Error comprimiendo imagen:", error)
      // Si falla la compresión, usamos el original por si acaso
      setFileToUpload(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)

    // Creamos el FormData basándonos en el formulario
    const formData = new FormData(event.currentTarget)

    // TRUCO: Sustituimos el archivo original del input por el comprimido
    if (fileToUpload) {
      formData.set('photo', fileToUpload) 
    }

    try {
      await createInventoryItem(formData)
      
      // Resetear todo tras éxito
      setOpen(false)
      formRef.current?.reset()
      setPreviewUrl(null)
      setFileToUpload(null)
      
    } catch (error) {
      console.error(error)
      alert("Error al crear el item")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white shadow-lg">
          <Plus className="mr-2 h-4 w-4" /> Añadir Item
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-lg rounded-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Item</DialogTitle>
        </DialogHeader>
        
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 py-2">
          
          {/* FOTO UPLOAD */}
          <div className="flex justify-center">
            <div className="relative group cursor-pointer">
              <div className="w-32 h-32 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden">
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center text-slate-400">
                    <Upload className="mx-auto h-8 w-8 mb-1" />
                    <span className="text-xs">Subir foto</span>
                  </div>
                )}
              </div>
              <Input 
                type="file" 
                name="photo" 
                accept="image/*" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileChange} 
              />
            </div>
          </div>

          {/* NOMBRE Y MODELO */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input id="name" name="name" placeholder="Ej: Taladro" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Modelo</Label>
              <Input id="model" name="model" placeholder="X-200" />
            </div>
          </div>

          {/* CATEGORÍA Y UBICACIÓN */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Categoría</Label>
              <select 
                id="category" 
                name="category_id" 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                defaultValue="no-category"
              >
                <option value="no-category" disabled>Seleccionar...</option>
                {categories.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Ubicación</Label>
              <select 
                id="location" 
                name="location_id"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                defaultValue="no-location"
              >
                <option value="no-location" disabled>Seleccionar...</option>
                {locations.map((loc: any) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* FECHAS */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purchase_date">Fecha Compra</Label>
              <Input type="date" id="purchase_date" name="purchase_date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="warranty_end_date">Fin Garantía</Label>
              <Input type="date" id="warranty_end_date" name="warranty_end_date" />
            </div>
          </div>

          {/* PRECIO Y SERIE */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Precio</Label>
              <Input type="number" step="0.01" id="price" name="price" placeholder="0.00" />
            </div>
             <div className="space-y-2">
              <Label htmlFor="serial_number">Nº Serie</Label>
              <Input id="serial_number" name="serial_number" placeholder="SN..." />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Item
            </Button>
          </DialogFooter>

        </form>
      </DialogContent>
    </Dialog>
  )
}