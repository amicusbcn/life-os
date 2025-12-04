'use client'

import { useState } from "react"
import { updateInventoryItem } from "@/app/inventory/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog"
import { Loader2, Upload } from "lucide-react"
import imageCompression from 'browser-image-compression'

export function EditItemDialog({ item, categories, locations, open, onOpenChange }: any) {
  const [isLoading, setIsLoading] = useState(false)
  const [fileToUpload, setFileToUpload] = useState<File | null>(null)
  
  // Previsualización inicial: la foto que ya tiene (si tiene)
  const initialPreview = item.photo_path 
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/inventory/${item.photo_path}`
    : null
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialPreview)

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
        onOpenChange(false) // Cerramos diálogo
      }
    } catch (error) {
      alert("Error de conexión")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Item</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          
          {/* FOTO */}
          <div className="flex justify-center">
            <div className="relative group cursor-pointer w-32 h-32 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 overflow-hidden">
               {previewUrl ? (
                  <img src={previewUrl} className="w-full h-full object-cover" />
               ) : (
                  <div className="flex items-center justify-center h-full text-slate-400">
                    <Upload className="h-8 w-8" />
                  </div>
               )}
               
               {/* CORRECCIÓN AQUÍ: Usamos input nativo y forzamos tamaño y z-index */}
               <input 
                  type="file" 
                  name="photo" 
                  accept="image/*" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                  onChange={handleFileChange} 
               />
            </div>
          </div>

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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Compra</Label>
              <Input type="date" name="purchase_date" defaultValue={item.purchase_date} />
            </div>
            <div className="space-y-2">
              <Label>Fin Garantía</Label>
              <Input type="date" name="warranty_end_date" defaultValue={item.warranty_end_date} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
               <Label>Precio</Label>
               <Input type="number" step="0.01" name="price" defaultValue={item.price} />
             </div>
             <div className="space-y-2">
               <Label>Serie</Label>
               <Input name="serial_number" defaultValue={item.serial_number} />
             </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}