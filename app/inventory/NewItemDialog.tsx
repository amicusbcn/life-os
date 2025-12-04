'use client'

import { useState, useRef } from "react"
import { createInventoryItem } from "@/app/inventory/actions" // Ajusta la ruta a tus actions
import { getSortedLocations } from "@/utils/inventory-logic" // Para ordenar ubicaciones
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
import { Plus, Upload, Loader2, Trash2 } from "lucide-react"
import imageCompression from 'browser-image-compression' 

// Definición de tipo local para asegurar el tipado del estado
interface InventoryLink {
  title: string;
  url: string;
}

export function NewItemDialog({ categories, locations }: any) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fileToUpload, setFileToUpload] = useState<File | null>(null)
  
  // ESTADO CLAVE: Manejo de la lista dinámica de enlaces
  const [externalLinks, setExternalLinks] = useState<InventoryLink[]>([]);
  
  const formRef = useRef<HTMLFormElement>(null)

  // Procesamos las ubicaciones para que salgan ordenadas en el desplegable
  const locationsOrdenadas = getSortedLocations(locations || []);


  // --- LÓGICA DE ENLACES ---
  const addLink = () => {
    // Añadir un objeto de enlace vacío para que React renderice la nueva fila
    setExternalLinks([...externalLinks, { title: '', url: '' }]);
  };

  const handleLinkChange = (index: number, field: 'title' | 'url', value: string) => {
    // Actualiza el título o la URL del enlace en la posición 'index'
    const newLinks = externalLinks.map((link, i) => 
      i === index ? { ...link, [field]: value } : link
    );
    setExternalLinks(newLinks);
  };

  const removeLink = (index: number) => {
    // Filtra y elimina el enlace en la posición 'index'
    setExternalLinks(externalLinks.filter((_, i) => i !== index));
  };
  // --------------------------


  // --- LÓGICA DE FOTO ---
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true }

    try {
      const compressedFile = await imageCompression(file, options)
      setFileToUpload(compressedFile)
      setPreviewUrl(URL.createObjectURL(compressedFile))
    } catch (error) {
      console.error("Error comprimiendo imagen:", error)
      setFileToUpload(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }
  // -----------------------


  // --- SUBMIT FINAL ---
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)

    const formData = new FormData(event.currentTarget)
    
    // 1. AÑADIR ARCHIVO COMPRIMIDO
    if (fileToUpload) {
      formData.set('photo', fileToUpload) 
    }

    // 2. SERIALIZAR Y AÑADIR ENLACES EXTERNOS
    // Filtramos enlaces que tienen título Y URL
    const cleanLinks = externalLinks.filter(l => l.title?.trim() && l.url?.trim());
    formData.append('external_links_json', JSON.stringify(cleanLinks)); 

    try {
      await createInventoryItem(formData)
      
      // Resetear estados tras éxito
      setOpen(false)
      formRef.current?.reset()
      setPreviewUrl(null)
      setFileToUpload(null)
      setExternalLinks([]) // Resetear enlaces
      
    } catch (error) {
      console.error(error)
      alert("Error al crear el item")
    } finally {
      setIsLoading(false)
    }
  }
  // --------------------

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
        
        {/* FORMULARIO */}
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 py-2">
          
          {/* FOTO UPLOAD */}
          <div className="flex justify-center">
             {/* ... (Tu código de subida de foto/preview) ... */}
          </div>

          {/* NOMBRE Y MODELO */}
          <div className="grid grid-cols-2 gap-4">
             {/* ... (Tus inputs para nombre y modelo) ... */}
          </div>

          {/* CATEGORÍA Y UBICACIÓN */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Categoría</Label>
              <select 
                // ... (Tu select de categorías) ...
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
                // ... (Tu select de ubicaciones) ...
              >
                <option value="no-location" disabled>Seleccionar...</option>
                {/* Usamos la lista ORDENADA */}
                {locationsOrdenadas.map((loc: any) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* FECHAS */}
          <div className="grid grid-cols-2 gap-4">
             {/* ... (Tus inputs de fechas) ... */}
          </div>

          {/* PRECIO Y SERIE */}
          <div className="grid grid-cols-2 gap-4">
             {/* ... (Tus inputs de precio y serie) ... */}
          </div>
          
          {/* --- ENLACES EXTERNOS DINÁMICOS --- */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <Label>Enlaces Externos (Manuales, Docs, etc.)</Label>
            <div className="space-y-3">
              {externalLinks.map((link, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    placeholder="Título (Ej: Manual PDF)"
                    value={link.title}
                    onChange={(e) => handleLinkChange(index, 'title', e.target.value)}
                    className="w-1/3"
                  />
                  <Input
                    placeholder="URL (https://...)"
                    value={link.url}
                    onChange={(e) => handleLinkChange(index, 'url', e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeLink(index)} 
                    className="text-red-500 hover:bg-red-50 h-8 w-8"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Button type="button" variant="outline" onClick={addLink} className="w-full">
                <Plus className="mr-2 h-4 w-4" /> Añadir Enlace
              </Button>
            </div>
          </div>
          {/* ------------------------------------- */}


          {/* BOTONES DE PIE DE PÁGINA */}
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