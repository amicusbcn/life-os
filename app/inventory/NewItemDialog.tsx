'use client'

import { useState, useRef } from "react"
import { createInventoryItem } from "@/app/inventory/actions"
import { getSortedLocations } from "@/utils/inventory-logic"
// Importamos los tipos centralizados (REGLA #3)
import { 
  InventoryCategory, 
  InventoryLocation, 
  InventoryLink 
} from "@/types/inventory"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea" // Opcional si quieres añadir descripción/notas
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Plus, Loader2, Trash2, Image as ImageIcon, X } from "lucide-react"
import imageCompression from 'browser-image-compression'

interface NewItemDialogProps {
  categories: InventoryCategory[];
  locations: InventoryLocation[];
}

export function NewItemDialog({ categories, locations }: NewItemDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fileToUpload, setFileToUpload] = useState<File | null>(null)
  
  // Estado para enlaces externos usando el tipo importado
  const [externalLinks, setExternalLinks] = useState<InventoryLink[]>([]);
  
  const formRef = useRef<HTMLFormElement>(null)

  // Procesamos las ubicaciones para mantener el orden (asumiendo que tu util funciona correctamente)
  const locationsOrdenadas = getSortedLocations(locations || []);

  // --- LÓGICA DE ENLACES ---
  const addLink = () => {
    setExternalLinks([...externalLinks, { title: '', url: '' }]);
  };

  const handleLinkChange = (index: number, field: keyof InventoryLink, value: string) => {
    const newLinks = externalLinks.map((link, i) => 
      i === index ? { ...link, [field]: value } : link
    );
    setExternalLinks(newLinks);
  };

  const removeLink = (index: number) => {
    setExternalLinks(externalLinks.filter((_, i) => i !== index));
  };

  // --- LÓGICA DE FOTO ---
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Configuración optimizada para fotos de cámara móvil
    const options = { 
      maxSizeMB: 0.8,          // Comprime hasta ~800KB
      maxWidthOrHeight: 1920,  // Redimensiona si es gigante (ej: 4000px de cámara)
      useWebWorker: true,      // No bloquea la UI mientras comprime
      initialQuality: 0.7      // Calidad inicial
    }

    try {
      setIsLoading(true) // Opcional: mostrar spinner mientras comprime si quieres
      const compressedFile = await imageCompression(file, options)
      
      setFileToUpload(compressedFile)
      setPreviewUrl(URL.createObjectURL(compressedFile))
    } catch (error) {
      console.error("Error comprimiendo imagen:", error)
      // Fallback: si falla la compresión, usamos el original
      setFileToUpload(file)
      setPreviewUrl(URL.createObjectURL(file))
    } finally {
      setIsLoading(false)
    }
  }

  const removePhoto = () => {
    setFileToUpload(null)
    setPreviewUrl(null)
  }

  // --- SUBMIT FINAL ---
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)

    const formData = new FormData(event.currentTarget)
    
    // 1. Añadir archivo (si existe)
    if (fileToUpload) {
      formData.set('photo', fileToUpload) 
    }

    // 2. Serializar Enlaces
    const cleanLinks = externalLinks.filter(l => l.title?.trim() && l.url?.trim());
    formData.append('external_links_json', JSON.stringify(cleanLinks)); 

    try {
      const result = await createInventoryItem(formData)
      
      if (result?.error) {
        throw new Error(result.error)
      }
      
      // Reset completo
      setOpen(false)
      formRef.current?.reset()
      setPreviewUrl(null)
      setFileToUpload(null)
      setExternalLinks([])
      
    } catch (error) {
      console.error(error)
      alert("Error al crear el item. Revisa la consola.")
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
          <DialogTitle>Nuevo Item de Inventario</DialogTitle>
        </DialogHeader>
        
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 py-2">
          
          {/* --- FOTO UPLOAD --- */}
          <div className="flex flex-col items-center justify-center gap-4 p-4 border-2 border-dashed rounded-lg border-slate-200 bg-slate-50">
            {previewUrl ? (
              <div className="relative group">
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="h-40 w-40 object-cover rounded-md shadow-sm"
                />
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="cursor-pointer flex flex-col items-center justify-center text-slate-500 hover:text-slate-700">
                <ImageIcon className="h-10 w-10 mb-2" />
                <span className="text-sm font-medium">Subir foto (Max 1MB)</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileChange}
                />
              </label>
            )}
          </div>

          {/* --- DATOS PRINCIPALES --- */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input id="name" name="name" placeholder="Ej: MacBook Pro" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Modelo</Label>
              <Input id="model" name="model" placeholder="M1 Pro 14 inch" />
            </div>
          </div>

          {/* --- CATEGORÍA Y UBICACIÓN --- */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category_id">Categoría</Label>
              <select 
                id="category_id"
                name="category_id"
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                defaultValue=""
              >
                <option value="" disabled>Seleccionar...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon ? `${cat.icon} ` : ''}{cat.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="location_id">Ubicación</Label>
              <select 
                id="location_id"
                name="location_id"
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                defaultValue=""
              >
                <option value="" disabled>Seleccionar...</option>
                {locationsOrdenadas.map((loc: any) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* --- DETALLES TÉCNICOS --- */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="serial_number">Nº Serie</Label>
              <Input id="serial_number" name="serial_number" placeholder="S/N..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Precio (€)</Label>
              <Input 
                id="price" 
                name="price" 
                type="number" 
                step="0.01" 
                placeholder="0.00" 
              />
            </div>
          </div>

          {/* --- FECHAS --- */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purchase_date">Fecha Compra</Label>
              <Input 
                id="purchase_date" 
                name="purchase_date" 
                type="date" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="warranty_end_date">Fin Garantía</Label>
              <Input 
                id="warranty_end_date" 
                name="warranty_end_date" 
                type="date" 
              />
            </div>
          </div>
          
          {/* --- ENLACES EXTERNOS --- */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex justify-between items-center">
              <Label>Enlaces (Manuales, Drivers)</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLink}>
                <Plus className="h-3 w-3 mr-1" /> Añadir
              </Button>
            </div>
            
            <div className="space-y-3">
              {externalLinks.length === 0 && (
                <p className="text-xs text-slate-400 italic">No hay enlaces añadidos.</p>
              )}
              
              {externalLinks.map((link, index) => (
                <div key={index} className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  <Input
                    placeholder="Título"
                    value={link.title}
                    onChange={(e) => handleLinkChange(index, 'title', e.target.value)}
                    className="w-1/3"
                  />
                  <Input
                    placeholder="URL"
                    value={link.url}
                    onChange={(e) => handleLinkChange(index, 'url', e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeLink(index)} 
                    className="text-slate-400 hover:text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="pt-4 mt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={isLoading} className="bg-slate-900">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Item
            </Button>
          </DialogFooter>

        </form>
      </DialogContent>
    </Dialog>
  )
}